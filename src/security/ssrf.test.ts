import { describe, expect, it } from 'vitest';
import {
    assertSafeFetchTarget,
    isBlockedHostname,
    isLinkedInJobUrl,
    isNonPublicIp,
    safeFetch,
} from './ssrf.js';

describe('isNonPublicIp', () => {
    it('blocks loopback', () => {
        expect(isNonPublicIp('127.0.0.1')).toBe(true);
        expect(isNonPublicIp('::1')).toBe(true);
    });

    it('blocks RFC1918 private ranges', () => {
        expect(isNonPublicIp('10.0.0.1')).toBe(true);
        expect(isNonPublicIp('192.168.1.1')).toBe(true);
        expect(isNonPublicIp('172.16.0.5')).toBe(true);
        expect(isNonPublicIp('172.31.255.255')).toBe(true);
    });

    it('blocks link local and cloud metadata addresses', () => {
        expect(isNonPublicIp('169.254.169.254')).toBe(true);
        expect(isNonPublicIp('169.254.10.20')).toBe(true);
    });

    it('blocks CGNAT, multicast, reserved, and documentation ranges', () => {
        expect(isNonPublicIp('100.64.0.1')).toBe(true);
        expect(isNonPublicIp('224.0.0.1')).toBe(true);
        expect(isNonPublicIp('203.0.113.5')).toBe(true);
        expect(isNonPublicIp('192.0.2.1')).toBe(true);
        expect(isNonPublicIp('198.51.100.7')).toBe(true);
    });

    it('blocks IPv6 non-public addresses and IPv4-mapped tricks', () => {
        expect(isNonPublicIp('fe80::1')).toBe(true);
        expect(isNonPublicIp('fd00::1')).toBe(true);
        expect(isNonPublicIp('ff02::1')).toBe(true);
        expect(isNonPublicIp('2001:db8::1')).toBe(true);
        expect(isNonPublicIp('::ffff:127.0.0.1')).toBe(true);
        expect(isNonPublicIp('::ffff:169.254.169.254')).toBe(true);
    });

    it('allows ordinary public addresses', () => {
        expect(isNonPublicIp('8.8.8.8')).toBe(false);
        expect(isNonPublicIp('1.1.1.1')).toBe(false);
        expect(isNonPublicIp('93.184.216.34')).toBe(false);
        expect(isNonPublicIp('2606:4700:4700::1111')).toBe(false);
    });
});

describe('isBlockedHostname', () => {
    it('blocks the cloud metadata hostname', () => {
        expect(isBlockedHostname('metadata.google.internal')).toBe(true);
        expect(isBlockedHostname('foo.metadata.google.internal')).toBe(true);
    });

    it('allows normal hostnames', () => {
        expect(isBlockedHostname('www.linkedin.com')).toBe(false);
        expect(isBlockedHostname('example.com')).toBe(false);
    });
});

describe('assertSafeFetchTarget', () => {
    it('rejects non-http protocols', async () => {
        await expect(assertSafeFetchTarget('ftp://example.com/x')).rejects.toThrow('only http and https');
        await expect(assertSafeFetchTarget('file:///etc/passwd')).rejects.toThrow('only http and https');
        await expect(assertSafeFetchTarget('javascript:alert(1)')).rejects.toThrow();
    });

    it('rejects non-public IP literals without touching DNS', async () => {
        await expect(assertSafeFetchTarget('http://127.0.0.1/')).rejects.toThrow('not publicly routable');
        await expect(assertSafeFetchTarget('http://169.254.169.254/')).rejects.toThrow('not publicly routable');
        await expect(assertSafeFetchTarget('http://10.0.0.1:8080/')).rejects.toThrow('not publicly routable');
        await expect(assertSafeFetchTarget('http://[::1]/')).rejects.toThrow('not publicly routable');
    });

    it('rejects localhost via DNS resolution', async () => {
        await expect(assertSafeFetchTarget('http://localhost:3000/')).rejects.toThrow('non-public IP');
    });

    it('rejects the metadata hostname', async () => {
        await expect(assertSafeFetchTarget('http://metadata.google.internal/')).rejects.toThrow();
    });

    // DNS fail-closed behavior is covered in ssrf-dns-failure.test.ts with a
    // mocked resolver, because sandbox DNS resolves every hostname.
});

describe('isLinkedInJobUrl', () => {
    it('accepts real LinkedIn job URLs', () => {
        expect(isLinkedInJobUrl('https://www.linkedin.com/jobs/view/12345')).toBe(true);
        expect(isLinkedInJobUrl('https://www.linkedin.com/jobs/search/?keywords=engineer')).toBe(true);
        expect(isLinkedInJobUrl('https://linkedin.com/jobs/view/12345')).toBe(true);
    });

    it('rejects the old substring bypass', () => {
        expect(isLinkedInJobUrl('https://attacker.example/?x=linkedin.com/jobs')).toBe(false);
        expect(isLinkedInJobUrl('http://127.0.0.1/?x=linkedin.com/jobs')).toBe(false);
    });

    it('rejects lookalike domains and non job paths', () => {
        expect(isLinkedInJobUrl('https://www.linkedin.com.evil.com/jobs/view/1')).toBe(false);
        expect(isLinkedInJobUrl('https://www.linkedin.com/feed/')).toBe(false);
        expect(isLinkedInJobUrl('not a url')).toBe(false);
    });
});

describe('safeFetch', () => {
    it('refuses to connect to a blocked target', async () => {
        await expect(safeFetch('http://169.254.169.254/')).rejects.toThrow('Blocked URL');
    });
});
