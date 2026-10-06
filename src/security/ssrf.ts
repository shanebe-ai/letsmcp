/**
 * SSRF guard for outbound fetches.
 *
 * The model (or any API caller) supplies the URL, so the URL is untrusted
 * input. This module validates where a URL actually resolves before anything
 * connects to it, follows redirects manually so every hop is revalidated,
 * and pins the validated IP at connect time to stop DNS rebinding between
 * the check and the connection.
 *
 * Blocked: loopback, RFC1918 private, link local (including the cloud
 * metadata addresses 169.254.169.254 and metadata.google.internal), CGNAT,
 * multicast, reserved, documentation ranges, and anything DNS cannot resolve
 * (fail closed).
 *
 * Two fetch flavors exist because the codebase uses both:
 * - safeFetch: node-fetch, used by the MCP webFetch tool. Gets the full
 *   treatment including connect-time IP pinning via a custom lookup.
 * - safeFetchGlobal: the global (undici) fetch, used by the REST routes.
 *   Undici has no per-request lookup hook, so connect-time pinning is not
 *   available there; the pre-connect validation and per-hop revalidation
 *   still apply. If these routes ever move to node-fetch, switch them to
 *   safeFetch for the pinned variant.
 */

import dns from 'node:dns/promises';
import http, { type AgentOptions } from 'node:http';
import https from 'node:https';
import net, { type LookupFunction } from 'node:net';
import nodeFetch, { type RequestInfo, type RequestInit, type Response } from 'node-fetch';

const MAX_REDIRECT_HOPS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Hostnames that are never allowed, regardless of what DNS says. */
const BLOCKED_HOSTNAMES = new Set([
    'metadata.google.internal',
]);

export function isBlockedHostname(hostname: string): boolean {
    const h = hostname.toLowerCase().replace(/\.$/, '');
    if (BLOCKED_HOSTNAMES.has(h)) {
        return true;
    }
    // Catch metadata.google.internal under any subdomain spelling.
    return h === 'metadata.google.internal' || h.endsWith('.metadata.google.internal');
}

/**
 * True when an IP literal is loopback, private, link local, CGNAT,
 * multicast, reserved, or otherwise not a publicly routable address.
 */
export function isNonPublicIp(ip: string): boolean {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split('.').map(Number);
        if (a === 10) return true; // RFC1918
        if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
        if (a === 192 && b === 168) return true; // RFC1918
        if (a === 127) return true; // loopback
        if (a === 169 && b === 254) return true; // link local, cloud metadata
        if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
        if (a === 0) return true; // this network
        if (a === 192 && b === 0 && ip.startsWith('192.0.2.')) return true; // TEST-NET-1
        if (ip.startsWith('198.51.100.')) return true; // TEST-NET-2
        if (ip.startsWith('203.0.113.')) return true; // TEST-NET-3
        if (a >= 224) return true; // multicast and reserved
        return false;
    }
    if (net.isIPv6(ip)) {
        let normalized = ip.toLowerCase();
        // IPv4-mapped IPv6 addresses: judge the embedded IPv4 address.
        const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) {
            return isNonPublicIp(mapped[1]);
        }
        if (normalized === '::1') return true; // loopback
        if (normalized === '::') return true; // unspecified
        if (normalized.startsWith('fe80:')) return true; // link local
        if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local
        if (normalized.startsWith('ff')) return true; // multicast
        if (normalized.startsWith('2001:db8:')) return true; // documentation
        return false;
    }
    return false;
}

/**
 * Validate the destination of a URL before connecting. Throws on any
 * violation. Returns the parsed URL when the destination is safe.
 */
export async function assertSafeFetchTarget(rawUrl: string): Promise<URL> {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error('Blocked URL: not a valid URL');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Blocked URL: only http and https are allowed (got ${url.protocol})`);
    }
    if (!url.hostname) {
        throw new Error('Blocked URL: missing hostname');
    }
    // URL.hostname keeps brackets on IPv6 literals; strip them for the checks.
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (isBlockedHostname(hostname)) {
        throw new Error(`Blocked URL: hostname not allowed (${hostname})`);
    }

    if (net.isIP(hostname) !== 0) {
        if (isNonPublicIp(hostname)) {
            throw new Error(`Blocked URL: IP literal is not publicly routable (${hostname})`);
        }
        return url;
    }

    let addresses: string[];
    try {
        const records = await dns.lookup(hostname, { all: true });
        addresses = records.map((r) => r.address);
    } catch {
        // Fail closed: no DNS answer means no fetch.
        throw new Error(`Blocked URL: DNS lookup failed for ${hostname}`);
    }
    if (addresses.length === 0) {
        throw new Error(`Blocked URL: no DNS records for ${hostname}`);
    }
    for (const address of addresses) {
        if (isNonPublicIp(address)) {
            throw new Error(`Blocked URL: ${hostname} resolves to non-public IP (${address})`);
        }
    }
    return url;
}

/**
 * Strict LinkedIn job URL check. The old substring check
 * (url.includes('linkedin.com/jobs')) accepted attacker URLs like
 * https://attacker.example/?x=linkedin.com/jobs and then drove a full
 * Playwright browser at them. Require a real linkedin.com host and a
 * /jobs path.
 */
export function isLinkedInJobUrl(rawUrl: string): boolean {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return false;
    }
    const host = url.hostname.toLowerCase();
    const onLinkedIn = host === 'linkedin.com' || host.endsWith('.linkedin.com');
    return onLinkedIn && url.pathname.includes('/jobs');
}

type PinnedAgent = http.Agent | https.Agent;

/**
 * Resolve the hostname and pin the validated IP at connect time, so a
 * hostile DNS answer cannot swap the address between validation and
 * connection (DNS rebinding).
 */
async function pinnedAgent(url: URL): Promise<PinnedAgent> {
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const records = await dns.lookup(hostname, { all: true });
    const address = records[0].address;
    const family = records[0].family;
    // Node 20+ agents request lookup with { all: true } for Happy Eyeballs;
    // in that mode the callback must receive an address array.
    const lookup: LookupFunction = (_hostname, options, callback) => {
        if (options.all) {
            callback(null, [{ address, family }], family);
        } else {
            callback(null, address, family);
        }
    };
    const agentOptions: AgentOptions = { lookup };
    return url.protocol === 'https:'
        ? new https.Agent(agentOptions)
        : new http.Agent(agentOptions);
}

async function nextHopUrl(current: string, location: string): Promise<URL> {
    const next = new URL(location, current);
    return assertSafeFetchTarget(next.toString());
}

/**
 * Fetch with SSRF protection, node-fetch edition (MCP tools).
 * Validates the initial URL, follows redirects manually with a hop cap,
 * revalidates every hop, and pins the validated IP at connect time.
 */
export async function safeFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    let current = (await assertSafeFetchTarget(
        typeof input === 'string' ? input : input.url
    )).toString();
    let hops = 0;

    for (;;) {
        const url = new URL(current);
        const agent = await pinnedAgent(url);
        const response = await nodeFetch(current, { ...init, agent, redirect: 'manual' });

        if (!REDIRECT_STATUSES.has(response.status)) {
            return response;
        }
        const location = response.headers.get('location');
        // Drain the body so the socket is released.
        await response.arrayBuffer().catch(() => undefined);
        if (!location) {
            return response;
        }
        hops += 1;
        if (hops > MAX_REDIRECT_HOPS) {
            throw new Error('Blocked URL: too many redirects');
        }
        current = (await nextHopUrl(current, location)).toString();
    }
}

export interface GlobalFetchInit {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
}

/**
 * Fetch with SSRF protection, global fetch edition (REST routes).
 * Same validation and manual redirect handling as safeFetch. Note: the
 * global fetch has no per-request DNS lookup hook, so connect-time IP
 * pinning is not available here; pre-connect validation and per-hop
 * revalidation still apply.
 */
export async function safeFetchGlobal(input: string, init: GlobalFetchInit = {}): Promise<globalThis.Response> {
    let current = (await assertSafeFetchTarget(input)).toString();
    let hops = 0;

    for (;;) {
        const response = await fetch(current, { ...init, redirect: 'manual' });

        if (!REDIRECT_STATUSES.has(response.status)) {
            return response;
        }
        const location = response.headers.get('location');
        await response.arrayBuffer().catch(() => undefined);
        if (!location) {
            return response;
        }
        hops += 1;
        if (hops > MAX_REDIRECT_HOPS) {
            throw new Error('Blocked URL: too many redirects');
        }
        current = (await nextHopUrl(current, location)).toString();
    }
}
