/**
 * SSRF guard for outbound fetches.
 *
 * The model (or any API caller) supplies the URL, so treat every URL as
 * untrusted. Resolve the destination once per fetch, validate it before
 * anything connects, revalidate each redirect hop, and pin the validated IP
 * at connect time so a hostile DNS answer cannot swap the address between
 * validation and connection. Anything that cannot be validated fails closed.
 *
 * Two flavors because the codebase uses two fetch implementations:
 * - safeFetch: node-fetch (MCP tools), with connect-time IP pinning.
 * - safeFetchGlobal: global fetch (REST routes). Undici has no per-request
 *   DNS lookup hook, so no pinning here; validation and per-hop
 *   revalidation still apply.
 */

import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import http, { type AgentOptions } from 'node:http';
import https from 'node:https';
import net, { type LookupFunction } from 'node:net';
import nodeFetch, { type RequestInfo, type RequestInit, type Response } from 'node-fetch';

const MAX_REDIRECT_HOPS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Never allowed, regardless of what DNS says. */
export function isBlockedHostname(hostname: string): boolean {
    const h = hostname.toLowerCase().replace(/\.$/, '');
    return h === 'metadata.google.internal' || h.endsWith('.metadata.google.internal');
}

/** True when an IP address is not publicly routable. */
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
        if (ip.startsWith('192.0.2.')) return true; // TEST-NET-1
        if (ip.startsWith('198.51.100.')) return true; // TEST-NET-2
        if (ip.startsWith('203.0.113.')) return true; // TEST-NET-3
        if (a >= 224) return true; // multicast and reserved
        return false;
    }
    if (net.isIPv6(ip)) {
        let normalized = ip.toLowerCase();
        const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) {
            // IPv4-mapped IPv6: judge the embedded IPv4 address.
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
 * A URL whose destination was resolved and validated. Pinning must use
 * these addresses and never re-resolve, or a hostile DNS can swap the
 * address between the check and the connection (DNS rebinding).
 */
export interface ValidatedTarget {
    url: URL;
    addresses: LookupAddress[];
}

/** Resolve a URL's destination exactly once and validate it. Throws on any violation. */
export async function resolveValidatedTarget(rawUrl: string): Promise<ValidatedTarget> {
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
    const hostname = url.hostname.replace(/^\[|\]$/g, '');    if (isBlockedHostname(hostname)) {
        throw new Error(`Blocked URL: hostname not allowed (${hostname})`);
    }

    if (net.isIP(hostname) !== 0) {
        if (isNonPublicIp(hostname)) {
            throw new Error(`Blocked URL: IP literal is not publicly routable (${hostname})`);
        }
        return {
            url,
            addresses: [{ address: hostname, family: net.isIPv4(hostname) ? 4 : 6 }],
        };
    }

    let addresses: LookupAddress[];
    try {
        addresses = await dns.lookup(hostname, { all: true });
    } catch {
        // Fail closed: no DNS answer means no fetch.
        throw new Error(`Blocked URL: DNS lookup failed for ${hostname}`);
    }
    if (addresses.length === 0) {
        throw new Error(`Blocked URL: no DNS records for ${hostname}`);
    }
    for (const record of addresses) {
        if (isNonPublicIp(record.address)) {
            throw new Error(`Blocked URL: ${hostname} resolves to non-public IP (${record.address})`);
        }
    }
    return { url, addresses };
}

/** Validate a URL's destination before connecting. Throws on any violation. */
export async function assertSafeFetchTarget(rawUrl: string): Promise<URL> {
    return (await resolveValidatedTarget(rawUrl)).url;
}

/** Strict LinkedIn job URL check. The old substring check accepted attacker
 * URLs like https://attacker.example/?x=linkedin.com/jobs and then drove a
 * full Playwright browser at them. */
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

/** Build an agent that pins the validated IP at connect time. The addresses
 * must come from the same DNS answer that passed validation; re-resolving
 * here would reopen the DNS rebinding window. */
function pinnedAgent(url: URL, addresses: LookupAddress[]): PinnedAgent {
    const { address, family } = addresses[0];
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

/** Fetch with SSRF protection, node-fetch edition (MCP tools). */
export async function safeFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    let target = await resolveValidatedTarget(
        typeof input === 'string' ? input : input.url
    );
    let hops = 0;

    for (;;) {
        const agent = pinnedAgent(target.url, target.addresses);
        const response = await nodeFetch(target.url.toString(), { ...init, agent, redirect: 'manual' });

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
        target = await resolveValidatedTarget(
            new URL(location, target.url.toString()).toString()
        );
    }
}

export interface GlobalFetchInit {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
}

/** Fetch with SSRF protection, global fetch edition (REST routes). */
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
        current = (await assertSafeFetchTarget(
            new URL(location, current).toString()
        )).toString();
    }
}
