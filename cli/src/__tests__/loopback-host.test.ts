import { describe, it, expect } from '@jest/globals';
import { isLoopbackHost } from '../mcp/server/lanonasis-server.js';

describe('isLoopbackHost (VERA C-1 helper)', () => {
  // Loopback addresses — must return true.
  const loopbackCases = [
    '127.0.0.1',
    '127.0.0.53', // systemd-resolved's local cache resolver address
    '127.1.2.3', // any 127.0.0.0/8 address
    '127.255.255.254',
    'localhost',
    'LocalHost', // case-insensitive for the literal name
    'LOCALHOST',
    '::1',
    '[::1]',
  ];
  for (const host of loopbackCases) {
    it(`accepts loopback address '${host}'`, () => {
      expect(isLoopbackHost(host)).toBe(true);
    });
  }

  // Non-loopback addresses — must return false.
  const nonLoopbackCases = [
    '0.0.0.0', // "all interfaces" — explicitly non-loopback
    '::', // IPv6 any
    '192.168.1.1',
    '10.0.0.1',
    '172.16.0.5',
    '169.254.0.1', // link-local, not loopback
    '8.8.8.8',
    'lanonasis.com',
    'auth.lanonasis.com',
    '0:0:0:0:0:0:0:1', // expanded IPv6 loopback form — not accepted (must use ::1)
    '127', // truncated IPv4 — not accepted
    '127.0.0', // truncated IPv4 — not accepted
    '127.0.0.1.5', // malformed — not accepted
  ];
  for (const host of nonLoopbackCases) {
    it(`rejects non-loopback address '${host}'`, () => {
      expect(isLoopbackHost(host)).toBe(false);
    });
  }

  // Edge cases.
  it('rejects empty string', () => {
    expect(isLoopbackHost('')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isLoopbackHost('   ')).toBe(false);
  });

  it('trims surrounding whitespace before matching', () => {
    expect(isLoopbackHost('  127.0.0.1  ')).toBe(true);
  });

  it('rejects non-string input', () => {
    // Defensive backstop — the type system normally catches it, but the helper
    // is called from runtime CLI options so we want a safe fallback.
    expect(isLoopbackHost(undefined as unknown as string)).toBe(false);
    expect(isLoopbackHost(null as unknown as string)).toBe(false);
    expect(isLoopbackHost(123 as unknown as string)).toBe(false);
  });
});