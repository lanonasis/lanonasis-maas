/**
 * Tests for gh#190: auth-gateway 429 handling + per-process memoization
 *
 * Since the CLI uses ESM + ts-jest which has known issues with jest.mock('axios'),
 * we test the logic by mocking verifyVendorKeyWithAuthGateway directly.
 *
 * Validates:
 * 1. 429 from /v1/auth/verify is classified as throttled (not valid:false → "Authentication required")
 * 2. Genuine 401 still fails closed (not throttled)
 * 3. Per-process memoization: at most 1 verify request per process run for vendor-key sessions
 */

import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const { CLIConfig } = await import('../utils/config.js');
const mockStorage = await import('./mocks/oauth-client.js');

describe('gh#190: 429 rate-limit handling and per-process memoization', () => {
  let testConfigDir: string;
  let config: CLIConfig;

  beforeAll(async () => {
    testConfigDir = path.join(os.tmpdir(), `test-429-handling-${Date.now()}`);
    await fsPromises.mkdir(testConfigDir, { recursive: true });

    config = new CLIConfig();
    (config as any).configDir = testConfigDir;
    (config as any).configPath = path.join(testConfigDir, 'config.json');
    (config as any).lockFile = path.join(testConfigDir, 'config.lock');

    await config.init();
  });

  afterEach(() => {
    delete process.env.FORCE_SERVICE_DISCOVERY;
    delete process.env.SKIP_SERVICE_DISCOVERY;
    // Reset per-test state
    (config as any).vendorKeyVerifiedThisProcess = null;
    (config as any).lastAuthFailureReason = null;
    (config as any).authCheckCache = null;
    // Restore original verifyVendorKeyWithAuthGateway if it was spied on
    if ((config as any).__origVerifyVendorKeyWithAuthGateway) {
      (config as any).verifyVendorKeyWithAuthGateway = (config as any).__origVerifyVendorKeyWithAuthGateway;
      delete (config as any).__origVerifyVendorKeyWithAuthGateway;
    }
  });

  // Helper to set up vendor-key state without calling the real verification
  async function setupVendorKeyState() {
    mockStorage.__resetMockApiKeyStorage();
    // Each case must start unauthenticated. The on-disk validation cache is
    // keyed by credential, and every case reuses the same key, so a success in
    // an earlier case would otherwise satisfy the next one without a probe.
    await (config as any).invalidateAuthCache();
    process.env.SKIP_SERVER_VALIDATION = 'true';
    await config.setVendorKey('test-vendor-key-abc123');
    delete process.env.SKIP_SERVER_VALIDATION;
    // Also set in-memory so getVendorKeyAsync works
    (config as any).vendorKeyCache = 'test-vendor-key-abc123';
    config.config.authMethod = 'vendor_key';
  }

  // ---- Test Group 1: 429 handling ----

  describe('429 rate-limit classification', () => {
    it('should classify 429 as throttled, not as invalid credential', async () => {
      await setupVendorKeyState();

      // Mock verifyVendorKeyWithAuthGateway to return a 429 response
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: false,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify',
        reason: 'Rate limit exceeded',
        status: 429,
        throttled: true
      });

      const result = await config.isAuthenticated();
      expect(result).toBe(false);
      expect(config.getAuthFailureReason()).toBe('throttled');
    });

    it('should NOT require additional server request on second isAuthenticated() call after 429', async () => {
      await setupVendorKeyState();

      // First call: 429 (throttled)
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: false,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify',
        reason: 'Rate limit exceeded',
        status: 429,
        throttled: true
      });
      const result1 = await config.isAuthenticated();
      expect(result1).toBe(false);

      // Reset mock — second call should use cached result
      (config as any).verifyVendorKeyWithAuthGateway = async () => {
        throw new Error('should not be called');
      };
      const result2 = await config.isAuthenticated();
      expect(result2).toBe(false);
    });

    it('should handle 429 on the fallback endpoint too', async () => {
      await setupVendorKeyState();

      // Mock returns throttled regardless of endpoint
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: false,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify-api-key',
        reason: 'Rate limit exceeded',
        status: 429,
        throttled: true
      });

      const result = await config.isAuthenticated();
      expect(result).toBe(false);
      expect(config.getAuthFailureReason()).toBe('throttled');
    });
  });

  // ---- Test Group 2: Genuine 401 still fails closed ----

  describe('genuine 401 still fails closed', () => {
    it('should report invalid_credential for 401', async () => {
      await setupVendorKeyState();

      // Mock verify to return a 401 response (not throttled)
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: false,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify',
        reason: 'Invalid API key',
        status: 401,
        throttled: false
      });

      const result = await config.isAuthenticated();
      expect(result).toBe(false);
      expect(config.getAuthFailureReason()).toBe('invalid_credential');
    });

    it('should NOT set throttled flag for genuine 401', async () => {
      await setupVendorKeyState();

      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: false,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify',
        reason: 'Invalid API key',
        status: 401,
        throttled: false
      });
      await config.isAuthenticated();

      // Second call — cached, no re-verification
      (config as any).verifyVendorKeyWithAuthGateway = async () => {
        throw new Error('should not be called');
      };
      const result = await config.isAuthenticated();
      expect(result).toBe(false);
      expect(config.getAuthFailureReason()).toBe('invalid_credential');
    });
  });

  // ---- Test Group 3: Per-process memoization ----

  describe('per-process memoization', () => {
    it('should skip server verification on second isAuthenticated() call after success', async () => {
      await setupVendorKeyState();

      // First call — success
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: true,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify'
      });

      const result1 = await config.isAuthenticated();
      expect(result1).toBe(true);

      // Second call — should NOT call verifyVendorKeyWithAuthGateway
      // because per-process memoization returns early
      (config as any).verifyVendorKeyWithAuthGateway = async () => {
        throw new Error('should not be called — per-process cache should skip');
      };
      const result2 = await config.isAuthenticated();
      expect(result2).toBe(true);
    });

    it('should reset memoization after explicit cache invalidation', async () => {
      await setupVendorKeyState();

      // First call — success
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: true,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify'
      });

      await config.isAuthenticated();
      // Per-process memoization should be set
      expect((config as any).vendorKeyVerifiedThisProcess).toBe(true);

      // Invalidate the cache
      await (config as any).invalidateAuthCache();
      // Memoization should be reset
      expect((config as any).vendorKeyVerifiedThisProcess).toBe(null);

      // Next call should go through verifyVendorKeyWithAuthGateway again
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: true,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify'
      });
      await config.isAuthenticated();
    });
  });

  // ---- Test Group 4: Combined behavior ----

  describe('combined throttle-then-success', () => {
    it('should return true on retry when server recovers after invalidation', async () => {
      await setupVendorKeyState();

      // First call: 429
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: false,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify',
        reason: 'Rate limit exceeded',
        status: 429,
        throttled: true
      });
      const result1 = await config.isAuthenticated();
      expect(result1).toBe(false);
      expect(config.getAuthFailureReason()).toBe('throttled');

      // Second call: still throttled (cached) — no re-verification
      (config as any).verifyVendorKeyWithAuthGateway = async () => {
        throw new Error('should not be called — cached 429');
      };
      const result2 = await config.isAuthenticated();
      expect(result2).toBe(false);

      // Third call: simulate recovery by invalidating cache
      await (config as any).invalidateAuthCache();
      (config as any).verifyVendorKeyWithAuthGateway = async () => ({
        valid: true,
        method: 'vendor_key',
        endpoint: 'https://auth.lanonasis.com/v1/auth/verify'
      });
      const result3 = await config.isAuthenticated();
      expect(result3).toBe(true);
    });
  });
});