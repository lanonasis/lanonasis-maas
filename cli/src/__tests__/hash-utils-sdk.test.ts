/**
 * Hash Utils Test Suite - Security SDK Version
 *
 * Tests the @lanonasis/security-sdk hash-utils implementation.
 * This tests the installed @lanonasis/security-sdk npm package.
 *
 * Run both test files to ensure compatibility:
 *   npm test hash-utils.test.ts hash-utils-sdk.test.ts
 *
 * @note This is for API key hashing (SHA-256), NOT JWT storage.
 */

import crypto from 'crypto';

// Import from installed @lanonasis/security-sdk package
import {
  hashApiKey,
  isSha256Hash,
  ensureApiKeyHash,
} from '@lanonasis/security-sdk/hash-utils';

// Import CLI's local copy for comparison
import * as cliHashUtils from '../utils/hash-utils.js';

describe('Security SDK Hash Utils - Core Functions', () => {
  const TEST_API_KEY = 'lano_test_key_abc123xyz';
  const KNOWN_HASH = crypto.createHash('sha256').update(TEST_API_KEY).digest('hex');

  describe('hashApiKey', () => {
    it('should produce a 64-character hex hash', () => {
      const hash = hashApiKey(TEST_API_KEY);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes for same input', () => {
      const hash1 = hashApiKey(TEST_API_KEY);
      const hash2 = hashApiKey(TEST_API_KEY);
      expect(hash1).toBe(hash2);
    });

    it('should match Node.js crypto SHA-256 output', () => {
      const hash = hashApiKey(TEST_API_KEY);
      expect(hash).toBe(KNOWN_HASH);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashApiKey('key1');
      const hash2 = hashApiKey('key2');
      expect(hash1).not.toBe(hash2);
    });

    it('should throw for empty string', () => {
      expect(() => hashApiKey('')).toThrow();
    });

    it('should throw for non-string input', () => {
      expect(() => hashApiKey(null as any)).toThrow();
      expect(() => hashApiKey(undefined as any)).toThrow();
    });
  });

  describe('isSha256Hash', () => {
    it('should return true for valid 64-char hex string', () => {
      expect(isSha256Hash(KNOWN_HASH)).toBe(true);
    });

    it('should return false for raw API key', () => {
      expect(isSha256Hash(TEST_API_KEY)).toBe(false);
    });

    it('should return false for short hex strings', () => {
      expect(isSha256Hash('abc123')).toBe(false);
    });

    it('should return false for 64-char non-hex string', () => {
      const nonHex = 'g'.repeat(64);
      expect(isSha256Hash(nonHex)).toBe(false);
    });

    it('should handle case-insensitive hex', () => {
      const upperHash = KNOWN_HASH.toUpperCase();
      expect(isSha256Hash(upperHash)).toBe(true);
    });

    it('should trim whitespace', () => {
      const paddedHash = `  ${KNOWN_HASH}  `;
      expect(isSha256Hash(paddedHash)).toBe(true);
    });
  });

  describe('ensureApiKeyHash', () => {
    it('should hash raw API key', () => {
      const result = ensureApiKeyHash(TEST_API_KEY);
      expect(result).toBe(KNOWN_HASH);
    });

    it('should NOT double-hash already hashed value', () => {
      const firstHash = ensureApiKeyHash(TEST_API_KEY);
      const secondHash = ensureApiKeyHash(firstHash);
      expect(secondHash).toBe(firstHash);
    });

    it('should normalize hash to lowercase', () => {
      const upperHash = KNOWN_HASH.toUpperCase();
      const result = ensureApiKeyHash(upperHash);
      expect(result).toBe(KNOWN_HASH.toLowerCase());
    });

    it('should be idempotent - multiple calls same result', () => {
      let value = TEST_API_KEY;
      for (let i = 0; i < 5; i++) {
        value = ensureApiKeyHash(value);
      }
      expect(value).toBe(KNOWN_HASH);
    });
  });
});

describe('Security SDK Hash Utils - Security Properties', () => {
  it('should produce unpredictable output (avalanche effect)', () => {
    const hash1 = hashApiKey('test_key_a');
    const hash2 = hashApiKey('test_key_b');

    let differences = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) differences++;
    }

    expect(differences).toBeGreaterThan(32);
  });

  it('should be computationally deterministic', () => {
    const iterations = 100;
    const key = 'consistent_test_key';
    const expectedHash = hashApiKey(key);

    for (let i = 0; i < iterations; i++) {
      expect(hashApiKey(key)).toBe(expectedHash);
    }
  });
});

describe('Security SDK Hash Utils - API Key Formats', () => {
  const API_KEY_FORMATS = [
    'lano_abc123',
    'lns_xyz789',
    'vx_test_key',
    'sk_live_abcdef',
    'a'.repeat(100),
    'key-with-dashes',
    'key_with_underscores',
    'MixedCaseKey123',
  ];

  it.each(API_KEY_FORMATS)('should hash key format: %s', (key) => {
    const hash = hashApiKey(key);
    expect(hash).toHaveLength(64);
    expect(isSha256Hash(hash)).toBe(true);
  });
});

describe('Security SDK - Cross-Implementation Compatibility', () => {
  it('should produce same hash as CLI local implementation', () => {
    const testKeys = ['key1', 'lano_test', 'vx_vendor_key'];

    for (const key of testKeys) {
      const sdkHash = hashApiKey(key);
      const cliHash = cliHashUtils.hashApiKey(key);
      expect(sdkHash).toBe(cliHash);
    }
  });

  it('should have matching isSha256Hash behavior', () => {
    const validHash = hashApiKey('test');
    expect(isSha256Hash(validHash)).toBe(cliHashUtils.isSha256Hash(validHash));
    expect(isSha256Hash('not-a-hash')).toBe(cliHashUtils.isSha256Hash('not-a-hash'));
  });

  it('should have matching ensureApiKeyHash behavior', () => {
    const rawKey = 'lano_abc123';
    const sdkResult = ensureApiKeyHash(rawKey);
    const cliResult = cliHashUtils.ensureApiKeyHash(rawKey);
    expect(sdkResult).toBe(cliResult);

    // Double-ensure
    expect(ensureApiKeyHash(sdkResult)).toBe(cliHashUtils.ensureApiKeyHash(cliResult));
  });
});
