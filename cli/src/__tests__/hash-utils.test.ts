/**
 * Hash Utils Test Suite
 *
 * Tests the local hash-utils implementation for API key hashing.
 * Includes migration buffer to switch between local and @lanonasis/security-sdk
 * when the npm package exports are fixed.
 *
 * @note This is for API key hashing (SHA-256), NOT JWT storage.
 *       JWT tokens are stored on disk. API keys use SHA-256 + PKCE for web security.
 */

import crypto from 'crypto';

// Migration buffer: Toggle this when security-sdk exports are fixed
const USE_SECURITY_SDK = true;

// Dynamic import based on migration flag
let hashApiKey: (key: string) => string;
let isSha256Hash: (value: string) => boolean;
let ensureApiKeyHash: (key: string) => string;

beforeAll(async () => {
  if (USE_SECURITY_SDK) {
    // Use npm package @lanonasis/security-sdk@1.0.5+
    const sdk = await import('@lanonasis/security-sdk/hash-utils');
    hashApiKey = sdk.hashApiKey;
    isSha256Hash = sdk.isSha256Hash;
    ensureApiKeyHash = sdk.ensureApiKeyHash;
  } else {
    // Fallback: Use local implementation
    const local = await import('../utils/hash-utils.js');
    hashApiKey = local.hashApiKey;
    isSha256Hash = local.isSha256Hash;
    ensureApiKeyHash = local.ensureApiKeyHash;
  }
});

describe('Hash Utils - Core Functions', () => {
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
      const nonHex = 'g'.repeat(64); // 'g' is not hex
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
      expect(secondHash).toBe(firstHash); // Idempotent
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

describe('Hash Utils - Security Properties', () => {
  it('should produce unpredictable output (avalanche effect)', () => {
    const hash1 = hashApiKey('test_key_a');
    const hash2 = hashApiKey('test_key_b'); // Single char difference

    // Count differing characters - should be significant
    let differences = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) differences++;
    }

    // Expect at least 50% of characters to differ (avalanche)
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

describe('Hash Utils - API Key Formats', () => {
  const API_KEY_FORMATS = [
    'lano_abc123',           // Standard format
    'lns_xyz789',            // Alternative prefix
    'vx_test_key',           // Vendor key format
    'sk_live_abcdef',        // Stripe-like format
    'a'.repeat(100),         // Long key
    'key-with-dashes',       // Dashes
    'key_with_underscores',  // Underscores
    'MixedCaseKey123',       // Mixed case
  ];

  it.each(API_KEY_FORMATS)('should hash key format: %s', (key) => {
    const hash = hashApiKey(key);
    expect(hash).toHaveLength(64);
    expect(isSha256Hash(hash)).toBe(true);
  });
});

describe('Migration Buffer - SDK Compatibility', () => {
  it('should use SDK implementation when USE_SECURITY_SDK is true', () => {
    expect(USE_SECURITY_SDK).toBe(true);
    // When true, tests use @lanonasis/security-sdk/hash-utils (v1.0.5+)
    // When false, tests fall back to local ../utils/hash-utils.js
  });

  it('should produce same hash as Node.js crypto (reference implementation)', () => {
    const testKeys = ['key1', 'key2', 'lano_abc'];

    for (const key of testKeys) {
      const localHash = hashApiKey(key);
      const referenceHash = crypto.createHash('sha256').update(key).digest('hex');
      expect(localHash).toBe(referenceHash);
    }
  });

  // When ready to migrate, change USE_SECURITY_SDK to true and run:
  // bun test hash-utils.test.ts
  // If all tests pass, the SDK implementation is compatible
});
