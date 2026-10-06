import { describe, expect, it, vi } from 'vitest';

// Fail-closed contract: when the resolver errors, no fetch may happen.
// The sandbox DNS wildcard resolves every hostname, so the resolver is
// mocked here to prove the guard fails closed on ENOTFOUND.
vi.mock('node:dns/promises', () => ({
    default: {
        lookup: vi.fn().mockRejectedValue(Object.assign(new Error('queryA ENOTFOUND'), { code: 'ENOTFOUND' })),
    },
}));

const { assertSafeFetchTarget, safeFetch } = await import('./ssrf.js');

describe('assertSafeFetchTarget with failing DNS', () => {
    it('fails closed when DNS cannot resolve', async () => {
        await expect(assertSafeFetchTarget('http://example.com/')).rejects.toThrow('DNS lookup failed');
    });

    it('safeFetch never connects when DNS fails', async () => {
        await expect(safeFetch('http://example.com/')).rejects.toThrow('DNS lookup failed');
    });
});
