import { afterEach, describe, expect, it, vi } from 'vitest';

// Pin DNS to a fixed public address so no real resolution happens, and stub
// the HTTP client so no real connection is attempted either. Whether a
// connection to that address succeeds depends on the network the tests run
// on; the test only cares how many times the hostname was resolved.
vi.mock('node:dns/promises', () => ({
    default: {
        lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
    },
}));

vi.mock('node-fetch', () => ({
    default: vi.fn(async () => {
        throw Object.assign(new Error('connect ECONNREFUSED 93.184.216.34:80'), { code: 'ECONNREFUSED' });
    }),
}));

import dns from 'node:dns/promises';
import { safeFetch } from './ssrf.js';

describe('safeFetch DNS rebinding', () => {
    afterEach(() => {
        vi.mocked(dns.lookup).mockClear();
    });

    it('resolves the hostname exactly once per fetch (no TOCTOU between validate and pin)', async () => {
        // The stubbed connection fails; what matters is that validation and
        // IP pinning shared a single DNS answer.
        await expect(safeFetch('http://example.com/')).rejects.toThrow();
        expect(vi.mocked(dns.lookup)).toHaveBeenCalledTimes(1);
    });
});
