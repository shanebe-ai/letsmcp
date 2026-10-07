import { afterEach, describe, expect, it, vi } from 'vitest';

// Pin DNS to a fixed public address so no real resolution happens. The fetch
// itself will fail to connect in test environments; the test only cares how
// many times the hostname was resolved.
vi.mock('node:dns/promises', () => ({
    default: {
        lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
    },
}));

import dns from 'node:dns/promises';
import { safeFetch } from './ssrf.js';

describe('safeFetch DNS rebinding', () => {
    afterEach(() => {
        vi.mocked(dns.lookup).mockClear();
    });

    it('resolves the hostname exactly once per fetch (no TOCTOU between validate and pin)', async () => {
        // The connection itself is expected to fail here; what matters is
        // that validation and IP pinning shared a single DNS answer.
        await expect(safeFetch('http://example.com/')).rejects.toThrow();
        expect(vi.mocked(dns.lookup)).toHaveBeenCalledTimes(1);
    });
});
