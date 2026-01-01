/**
 * Crypto Utilities Tests
 *
 * Comprehensive tests for cryptographic functions used in authentication:
 * - PKCE parameter generation (code verifier, code challenge)
 * - JWT detection
 * - SHA-256 hash detection and idempotent hashing
 * - API key verification
 */

import * as crypto from 'crypto';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  looksLikeJwt,
  isSha256Hash,
  hashApiKey,
  ensureApiKeyHash,
  verifyApiKey
} from '../src/utils/crypto';

describe('Crypto Utilities', () => {
  describe('PKCE Parameter Generation', () => {
    describe('generateCodeVerifier', () => {
      it('should generate a base64url-encoded string', () => {
        const verifier = generateCodeVerifier();
        // base64url uses only A-Z, a-z, 0-9, -, _
        expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
      });

      it('should generate a string of correct length (43 characters for 32 bytes)', () => {
        const verifier = generateCodeVerifier();
        // 32 bytes -> 43 base64url characters (no padding)
        expect(verifier.length).toBe(43);
      });

      it('should generate unique values on each call', () => {
        const verifiers = new Set<string>();
        for (let i = 0; i < 100; i++) {
          verifiers.add(generateCodeVerifier());
        }
        // All 100 should be unique
        expect(verifiers.size).toBe(100);
      });

      it('should generate cryptographically random values', () => {
        const verifier1 = generateCodeVerifier();
        const verifier2 = generateCodeVerifier();
        expect(verifier1).not.toBe(verifier2);
      });

      it('should generate values suitable for PKCE (43-128 chars per RFC 7636)', () => {
        const verifier = generateCodeVerifier();
        // RFC 7636 requires 43-128 characters
        expect(verifier.length).toBeGreaterThanOrEqual(43);
        expect(verifier.length).toBeLessThanOrEqual(128);
      });
    });

    describe('generateCodeChallenge', () => {
      it('should generate a base64url-encoded SHA-256 hash of the verifier', () => {
        const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
        const challenge = generateCodeChallenge(verifier);

        // Manually compute expected value
        const expected = crypto
          .createHash('sha256')
          .update(verifier)
          .digest('base64url');

        expect(challenge).toBe(expected);
      });

      it('should generate consistent output for the same input', () => {
        const verifier = generateCodeVerifier();
        const challenge1 = generateCodeChallenge(verifier);
        const challenge2 = generateCodeChallenge(verifier);
        expect(challenge1).toBe(challenge2);
      });

      it('should generate different challenges for different verifiers', () => {
        const verifier1 = generateCodeVerifier();
        const verifier2 = generateCodeVerifier();
        const challenge1 = generateCodeChallenge(verifier1);
        const challenge2 = generateCodeChallenge(verifier2);
        expect(challenge1).not.toBe(challenge2);
      });

      it('should generate a 43-character base64url string (SHA-256 = 256 bits = 43 chars)', () => {
        const verifier = generateCodeVerifier();
        const challenge = generateCodeChallenge(verifier);
        expect(challenge.length).toBe(43);
      });

      it('should produce valid base64url output without padding', () => {
        const verifier = generateCodeVerifier();
        const challenge = generateCodeChallenge(verifier);
        // No padding characters
        expect(challenge).not.toContain('=');
        // Valid base64url characters only
        expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
      });

      it('should handle empty string input', () => {
        const challenge = generateCodeChallenge('');
        // SHA-256 of empty string has a known value
        const expected = crypto.createHash('sha256').update('').digest('base64url');
        expect(challenge).toBe(expected);
      });

      it('should handle special characters in verifier', () => {
        const verifier = 'test-verifier_with.special+chars';
        const challenge = generateCodeChallenge(verifier);
        expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
        expect(challenge.length).toBe(43);
      });
    });

    describe('generateState', () => {
      it('should generate a 32-character hex string (16 bytes)', () => {
        const state = generateState();
        expect(state.length).toBe(32);
        expect(state).toMatch(/^[a-f0-9]{32}$/);
      });

      it('should generate unique values on each call', () => {
        const states = new Set<string>();
        for (let i = 0; i < 100; i++) {
          states.add(generateState());
        }
        expect(states.size).toBe(100);
      });

      it('should be suitable for CSRF protection', () => {
        const state = generateState();
        // 16 bytes of randomness = 128 bits of entropy
        // This is sufficient for CSRF protection
        expect(state.length).toBe(32);
      });
    });
  });

  describe('JWT Detection', () => {
    describe('looksLikeJwt', () => {
      it('should return true for valid JWT structure', () => {
        // Valid JWT format: header.payload.signature (test fixture using non-base64 values)
        const validJwt = 'header_part_one.payload_part_two.signature_part_three';
        expect(looksLikeJwt(validJwt)).toBe(true);
      });

      it('should return true for minimal valid JWT structure', () => {
        // Minimal valid base64url segments
        const minimalJwt = 'abc.def.ghi';
        expect(looksLikeJwt(minimalJwt)).toBe(true);
      });

      it('should return false for string without dots', () => {
        expect(looksLikeJwt('noDotsHere')).toBe(false);
      });

      it('should return false for string with only one dot', () => {
        expect(looksLikeJwt('only.one')).toBe(false);
      });

      it('should return false for string with more than two dots', () => {
        expect(looksLikeJwt('too.many.dots.here')).toBe(false);
      });

      it('should return false for empty segments', () => {
        expect(looksLikeJwt('...')).toBe(false);
        expect(looksLikeJwt('a..c')).toBe(false);
        expect(looksLikeJwt('.b.')).toBe(false);
      });

      it('should return false for segments with invalid base64url characters', () => {
        // Space is not valid in base64url
        expect(looksLikeJwt('abc def.ghi.jkl')).toBe(false);
        // Plus sign is not valid in base64url (use - instead)
        expect(looksLikeJwt('abc+.def.ghi')).toBe(false);
        // Equals sign (padding) is not expected in JWT segments
        expect(looksLikeJwt('abc=.def.ghi')).toBe(false);
      });

      it('should return true for JWT with valid base64url characters', () => {
        // All valid base64url characters: A-Z, a-z, 0-9, -, _
        const jwtWithAllChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.payload.signature';
        expect(looksLikeJwt(jwtWithAllChars)).toBe(true);
      });

      it('should return false for API key (not JWT format)', () => {
        const apiKey = 'test_fake_not_real_key_12345';
        expect(looksLikeJwt(apiKey)).toBe(false);
      });

      it('should return false for SHA-256 hash', () => {
        const hash = 'a'.repeat(64);
        expect(looksLikeJwt(hash)).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(looksLikeJwt('')).toBe(false);
        expect(looksLikeJwt('.')).toBe(false);
        expect(looksLikeJwt('..')).toBe(false);
      });
    });
  });

  describe('SHA-256 Hash Detection', () => {
    describe('isSha256Hash', () => {
      it('should return true for valid lowercase SHA-256 hash', () => {
        const hash = 'a'.repeat(64);
        expect(isSha256Hash(hash)).toBe(true);
      });

      it('should return true for valid uppercase SHA-256 hash', () => {
        const hash = 'A'.repeat(64);
        expect(isSha256Hash(hash)).toBe(true);
      });

      it('should return true for valid mixed-case SHA-256 hash', () => {
        const hash = 'aAbBcCdDeEfF0123456789' + 'a'.repeat(42);
        expect(isSha256Hash(hash)).toBe(true);
      });

      it('should return true for real SHA-256 hash', () => {
        const realHash = crypto.createHash('sha256').update('test').digest('hex');
        expect(isSha256Hash(realHash)).toBe(true);
      });

      it('should return false for string shorter than 64 characters', () => {
        expect(isSha256Hash('a'.repeat(63))).toBe(false);
      });

      it('should return false for string longer than 64 characters', () => {
        expect(isSha256Hash('a'.repeat(65))).toBe(false);
      });

      it('should return false for 64-character string with invalid characters', () => {
        const invalidHash = 'g' + 'a'.repeat(63); // 'g' is not valid hex
        expect(isSha256Hash(invalidHash)).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isSha256Hash('')).toBe(false);
      });

      it('should return false for JWT token', () => {
        const jwt = 'header_segment.payload_segment.signature_segment';
        expect(isSha256Hash(jwt)).toBe(false);
      });

      it('should handle whitespace by trimming', () => {
        const hashWithSpaces = '  ' + 'a'.repeat(64) + '  ';
        expect(isSha256Hash(hashWithSpaces)).toBe(true);
      });

      it('should return false for non-string input', () => {
        // TypeScript should catch this, but test runtime behavior
        expect(isSha256Hash(null as any)).toBe(false);
        expect(isSha256Hash(undefined as any)).toBe(false);
        expect(isSha256Hash(123 as any)).toBe(false);
      });
    });
  });

  describe('API Key Hashing', () => {
    describe('hashApiKey', () => {
      it('should produce a valid SHA-256 hash', () => {
        const hash = hashApiKey('test-api-key');
        expect(isSha256Hash(hash)).toBe(true);
      });

      it('should produce consistent output for the same input', () => {
        const apiKey = 'my-secret-api-key';
        const hash1 = hashApiKey(apiKey);
        const hash2 = hashApiKey(apiKey);
        expect(hash1).toBe(hash2);
      });

      it('should produce different hashes for different inputs', () => {
        const hash1 = hashApiKey('key1');
        const hash2 = hashApiKey('key2');
        expect(hash1).not.toBe(hash2);
      });

      it('should produce lowercase hex output', () => {
        const hash = hashApiKey('test');
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should throw error for empty string', () => {
        expect(() => hashApiKey('')).toThrow('API key must be a non-empty string');
      });

      it('should throw error for null input', () => {
        expect(() => hashApiKey(null as any)).toThrow('API key must be a non-empty string');
      });

      it('should throw error for undefined input', () => {
        expect(() => hashApiKey(undefined as any)).toThrow('API key must be a non-empty string');
      });

      it('should throw error for non-string input', () => {
        expect(() => hashApiKey(123 as any)).toThrow('API key must be a non-empty string');
      });

      it('should handle special characters', () => {
        const hash = hashApiKey('key-with-special!@#$%^&*()');
        expect(isSha256Hash(hash)).toBe(true);
      });

      it('should handle unicode characters', () => {
        const hash = hashApiKey('unicode-key-\u00e9\u00e8\u00ea');
        expect(isSha256Hash(hash)).toBe(true);
      });
    });

    describe('ensureApiKeyHash (Idempotent Hashing)', () => {
      it('should hash a plain API key', () => {
        const apiKey = 'test_fake_api_key_abc123';
        const result = ensureApiKeyHash(apiKey);
        expect(isSha256Hash(result)).toBe(true);
      });

      it('should return lowercase version of already-hashed key', () => {
        const alreadyHashed = 'A'.repeat(64);
        const result = ensureApiKeyHash(alreadyHashed);
        expect(result).toBe('a'.repeat(64));
      });

      it('should be idempotent - multiple calls produce same result', () => {
        const apiKey = 'original-api-key';
        const firstHash = ensureApiKeyHash(apiKey);
        const secondHash = ensureApiKeyHash(firstHash);
        const thirdHash = ensureApiKeyHash(secondHash);

        expect(firstHash).toBe(secondHash);
        expect(secondHash).toBe(thirdHash);
      });

      it('should normalize case of existing hash', () => {
        const upperHash = 'ABCDEF' + '0'.repeat(58);
        const result = ensureApiKeyHash(upperHash);
        expect(result).toBe(upperHash.toLowerCase());
      });

      it('should hash JWT tokens (they are not SHA-256 hashes)', () => {
        const jwt = 'header_x.payload_y.signature_z';
        const result = ensureApiKeyHash(jwt);
        expect(isSha256Hash(result)).toBe(true);
        // Should be different from input
        expect(result).not.toBe(jwt);
      });

      it('should hash API keys that look like hex but wrong length', () => {
        const shortHex = 'abcdef123456';
        const result = ensureApiKeyHash(shortHex);
        expect(isSha256Hash(result)).toBe(true);
      });
    });

    describe('verifyApiKey', () => {
      it('should return true for matching key and hash', () => {
        const apiKey = 'my-secret-key';
        const storedHash = hashApiKey(apiKey);
        expect(verifyApiKey(apiKey, storedHash)).toBe(true);
      });

      it('should return false for non-matching key', () => {
        const apiKey = 'my-secret-key';
        const storedHash = hashApiKey(apiKey);
        expect(verifyApiKey('wrong-key', storedHash)).toBe(false);
      });

      it('should return false for malformed stored hash', () => {
        const apiKey = 'my-secret-key';
        const badHash = 'not-a-valid-hash';
        expect(verifyApiKey(apiKey, badHash)).toBe(false);
      });

      it('should use constant-time comparison (timing-safe)', () => {
        const apiKey = 'my-secret-key';
        const storedHash = hashApiKey(apiKey);

        // This test verifies the function works correctly
        // Actual timing safety is ensured by using crypto.timingSafeEqual
        expect(verifyApiKey(apiKey, storedHash)).toBe(true);
        expect(verifyApiKey('wrong-key', storedHash)).toBe(false);
      });

      it('should handle case-insensitive hash comparison', () => {
        const apiKey = 'test-key';
        const lowerHash = hashApiKey(apiKey);
        const upperHash = lowerHash.toUpperCase();

        // Both should work since we convert to Buffer
        expect(verifyApiKey(apiKey, lowerHash)).toBe(true);
        expect(verifyApiKey(apiKey, upperHash)).toBe(true);
      });

      it('should return false when hash lengths differ', () => {
        const apiKey = 'test-key';
        const shortHash = 'a'.repeat(32);
        expect(verifyApiKey(apiKey, shortHash)).toBe(false);
      });
    });
  });

  describe('Integration: PKCE Flow', () => {
    it('should generate valid PKCE pair for OAuth flow', () => {
      // Generate PKCE parameters
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const state = generateState();

      // Verify all components are valid
      expect(verifier.length).toBe(43);
      expect(challenge.length).toBe(43);
      expect(state.length).toBe(32);

      // Verify challenge is derived from verifier
      const expectedChallenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
      expect(challenge).toBe(expectedChallenge);
    });

    it('should generate unique PKCE parameters for each flow', () => {
      const params1 = {
        verifier: generateCodeVerifier(),
        state: generateState()
      };
      const params2 = {
        verifier: generateCodeVerifier(),
        state: generateState()
      };

      expect(params1.verifier).not.toBe(params2.verifier);
      expect(params1.state).not.toBe(params2.state);
    });
  });

  describe('Integration: API Key Storage Flow', () => {
    it('should correctly hash and verify API keys', () => {
      const originalKey = 'test_fake_key_1234567890abcdef';

      // Hash for storage
      const storedHash = ensureApiKeyHash(originalKey);

      // Verify it was hashed
      expect(isSha256Hash(storedHash)).toBe(true);
      expect(storedHash).not.toBe(originalKey);

      // Verify key against stored hash
      expect(verifyApiKey(originalKey, storedHash)).toBe(true);
      expect(verifyApiKey('wrong-key', storedHash)).toBe(false);
    });

    it('should handle idempotent storage correctly', () => {
      const originalKey = 'test_fake_key_1234567890abcdef';

      // First storage
      const firstHash = ensureApiKeyHash(originalKey);

      // Simulate retrieval and re-storage
      const secondHash = ensureApiKeyHash(firstHash);

      // Should be the same
      expect(firstHash).toBe(secondHash);

      // Should still verify against original
      expect(verifyApiKey(originalKey, secondHash)).toBe(true);
    });

    it('should distinguish between OAuth tokens and API keys', () => {
      const apiKey = 'test_fake_key_1234567890abcdef';
      const jwtToken = 'header_part.payload_part.signature_part';

      expect(looksLikeJwt(apiKey)).toBe(false);
      expect(looksLikeJwt(jwtToken)).toBe(true);

      // API key should be hashed
      expect(isSha256Hash(apiKey)).toBe(false);
      expect(isSha256Hash(ensureApiKeyHash(apiKey))).toBe(true);

      // JWT should not match SHA-256 pattern
      expect(isSha256Hash(jwtToken)).toBe(false);
    });
  });
});
