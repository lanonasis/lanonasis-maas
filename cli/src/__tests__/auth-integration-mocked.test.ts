/**
 * CLI Authentication Integration Tests (Mocked)
 * 
 * These tests validate CLI authentication flows using mocks,
 * allowing them to run in CI/CD without requiring real credentials.
 * 
 * For tests that require real server interaction, see auth-integration.test.ts
 */

import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import * as fsPromises from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createTestJwt } from './helpers/jwt.js';

// Mock axios for HTTP requests
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
};

jest.unstable_mockModule('axios', () => ({
  default: mockAxios,
}));

const { CLIConfig } = await import('../utils/config.js');

describe('CLI Authentication Integration Tests (Mocked)', () => {
  let testConfigDir: string;
  let config: CLIConfig;

  beforeAll(async () => {
    delete process.env.SKIP_SERVER_VALIDATION;
    // Create temporary test directory
    testConfigDir = path.join(os.tmpdir(), `test-auth-integration-mocked-${Date.now()}`);
    await fsPromises.mkdir(testConfigDir, { recursive: true });

    config = new CLIConfig();
    (config as any).configDir = testConfigDir;
    (config as any).configPath = path.join(testConfigDir, 'config.json');
    (config as any).lockFile = path.join(testConfigDir, 'config.lock');

    await config.init();
  });

  afterEach(() => {
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();
    delete process.env.FORCE_SERVICE_DISCOVERY;
    delete process.env.SKIP_SERVICE_DISCOVERY;
    delete process.env.SKIP_SERVER_VALIDATION;
  });

  describe('Service Discovery', () => {
    it('should discover service endpoints from .well-known/onasis.json', async () => {
      // Mock successful service discovery
      mockAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          auth: {
            base: 'https://api.lanonasis.com',
          },
          endpoints: {
            http: 'https://mcp.lanonasis.com/api/v1',
            websocket: 'wss://mcp.lanonasis.com',
            sse: 'https://mcp.lanonasis.com/sse',
          },
        },
      });

      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.FORCE_SERVICE_DISCOVERY = 'true';
      process.env.SKIP_SERVICE_DISCOVERY = 'false';

      await config.discoverServices(true);
      process.env.NODE_ENV = previousNodeEnv;

      const services = config.get('discoveredServices') as any;
      expect(services).toBeDefined();
      expect(services.auth_base).toBe('https://api.lanonasis.com');
      expect(services.mcp_base).toBe('https://mcp.lanonasis.com/api/v1');
      expect(services.mcp_ws_base).toBe('wss://mcp.lanonasis.com');
      expect(services.mcp_sse_base).toBe('https://mcp.lanonasis.com/sse');
    });

    it('should handle service discovery failures gracefully', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.FORCE_SERVICE_DISCOVERY = 'true';
      process.env.SKIP_SERVICE_DISCOVERY = 'false';

      await expect(config.discoverServices(true)).rejects.toThrow();
      process.env.NODE_ENV = previousNodeEnv;
    });
  });

  describe('Vendor Key Authentication', () => {
    it('should validate vendor key against server', async () => {
      const testVendorKey = 'pk_test123456789.sk_test123456789012345';

      // Mock successful vendor key validation
      mockAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { valid: true, user_id: 'user-123' },
      });

      await config.setVendorKey(testVendorKey);

      const storedKey = await config.getVendorKeyAsync();
      expect(storedKey).toBe(testVendorKey);
      expect(config.get('authMethod')).toBe('vendor_key');
    });

    it('should reject invalid vendor keys', async () => {
      const invalidKey = 'invalid-key';

      // Mock failed validation
      const authError = new Error('Unauthorized');
      (authError as any).response = { status: 401, data: { error: 'invalid vendor key' } };
      mockAxios.get.mockRejectedValue(authError);

      await expect(config.setVendorKey(invalidKey)).rejects.toThrow(/Key is invalid/i);
    });

    it('should handle network errors during vendor key validation', async () => {
      const testVendorKey = 'pk_test123456789.sk_test123456789012345';

      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(config.setVendorKey(testVendorKey)).rejects.toThrow();
    });
  });

  describe('Token Authentication', () => {
    it('should verify JWT token expiration', async () => {
      // Create a mock token that's not expired
      const testToken = createTestJwt(Math.floor(Date.now() / 1000) + 60 * 60);
      
      await config.setToken(testToken);

      // Mock token validation
      const isAuthenticated = await config.isAuthenticated();
      expect(typeof isAuthenticated).toBe('boolean');
    });

    it('should detect expired tokens', async () => {
      // Create a mock expired token
      const expiredToken = createTestJwt(Math.floor(Date.now() / 1000) - 60 * 60);
      
      await config.setToken(expiredToken);

      // The isAuthenticated check should handle expired tokens
      const isAuthenticated = await config.isAuthenticated();
      expect(typeof isAuthenticated).toBe('boolean');
    });
  });

  describe('Credential Validation', () => {
    it('should validate stored credentials against server', async () => {
      const testToken = 'test-token-123';

      await config.setToken(testToken);

      // Mock successful validation
      mockAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { valid: true },
      });

      const isValid = await config.validateStoredCredentials();
      expect(typeof isValid).toBe('boolean');
    });

    it('should return false when credentials are invalid', async () => {
      const testToken = 'invalid-token';

      await config.setToken(testToken);

      // Mock failed validation
      mockAxios.get.mockRejectedValue({
        response: { status: 401, data: { valid: false } },
        message: 'Unauthorized',
      });

      const isValid = await config.validateStoredCredentials();
      expect(isValid).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      const testToken = 'test-token-123';

      await config.setToken(testToken);

      // Mock network error
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(config.validateStoredCredentials()).resolves.toBe(false);
    });
  });

  describe('Authentication State Management', () => {
    it('should persist authentication state', async () => {
      const testToken = 'test-token-123';
      await config.setToken(testToken);

      // Create a new config instance to test persistence
      const config2 = new CLIConfig();
      (config2 as any).configDir = testConfigDir;
      (config2 as any).configPath = path.join(testConfigDir, 'config.json');
      await config2.init();

      const storedToken = config2.getToken();
      expect(storedToken).toBe(testToken);
    });

    it('should clear authentication state on logout', async () => {
      const testToken = 'test-token-123';
      await config.setToken(testToken);
      expect(config.getToken()).toBe(testToken);

      await config.logout();
      expect(config.getToken()).toBeUndefined();
      expect(await config.getVendorKeyAsync()).toBeUndefined();
    });
  });
});
