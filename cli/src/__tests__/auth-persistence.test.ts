import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CLIConfig } from '../utils/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock axios for network calls
const mockAxios = {
  get: jest.fn() as jest.Mock,
  post: jest.fn() as jest.Mock
};

jest.mock('axios', () => ({
  default: mockAxios,
  get: mockAxios.get,
  post: mockAxios.post
}));

describe('Authentication Persistence Tests', () => {
  let testConfigDir: string;
  let config: CLIConfig;

  beforeEach(async () => {
    // Create a temporary test directory for each test
    testConfigDir = path.join(os.tmpdir(), `test-auth-persistence-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testConfigDir, { recursive: true });
    
    // Create a new config instance with test directory
    config = new CLIConfig();
    (config as any).configDir = testConfigDir;
    (config as any).configPath = path.join(testConfigDir, 'config.json');
    (config as any).lockFile = path.join(testConfigDir, 'config.lock');
    
    await config.init();

    // Clear axios mocks
    mockAxios.get.mockClear();
    mockAxios.post.mockClear();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Credential Storage and Retrieval', () => {
    it('should store and retrieve vendor key credentials across CLI sessions', async () => {
      const testVendorKey = 'pk_test123456789.sk_test123456789012345';
      
      // Mock successful server validation
      mockAxios.get.mockResolvedValueOnce({ status: 200, data: { status: 'ok' } } as any);
      
      // Store vendor key
      await config.setVendorKey(testVendorKey);
      
      // Verify storage
      expect(config.getVendorKey()).toBe(testVendorKey);
      expect(config.get('authMethod')).toBe('vendor_key');
      expect(config.get('lastValidated')).toBeDefined();
      
      // Simulate new CLI session by creating new config instance
      const newConfig = new CLIConfig();
      (newConfig as any).configDir = testConfigDir;
      (newConfig as any).configPath = path.join(testConfigDir, 'config.json');
      (newConfig as any).lockFile = path.join(testConfigDir, 'config.lock');
      
      await newConfig.init();
      
      // Verify credentials persist across sessions
      expect(newConfig.getVendorKey()).toBe(testVendorKey);
      expect(newConfig.get('authMethod')).toBe('vendor_key');
    });

    it('should store and retrieve JWT token credentials across CLI sessions', async () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      // Store JWT token
      await config.setToken(testToken);
      
      // Verify storage
      expect(config.getToken()).toBe(testToken);
      expect(config.get('authMethod')).toBe('jwt');
      expect(config.get('lastValidated')).toBeDefined();
      
      // Simulate new CLI session
      const newConfig = new CLIConfig();
      (newConfig as any).configDir = testConfigDir;
      (newConfig as any).configPath = path.join(testConfigDir, 'config.json');
      (newConfig as any).lockFile = path.join(testConfigDir, 'config.lock');
      
      await newConfig.init();
      
      // Verify token persists across sessions
      expect(newConfig.getToken()).toBe(testToken);
      expect(newConfig.get('authMethod')).toBe('jwt');
    });
  });

  describe('Authentication Failure Tracking', () => {
    it('should track authentication failure count and last failure time', async () => {
      // Initially no failures
      expect(config.getFailureCount()).toBe(0);
      expect(config.getLastAuthFailure()).toBeUndefined();
      
      // Increment failure count
      await config.incrementFailureCount();
      
      // Verify failure count increased
      expect(config.getFailureCount()).toBe(1);
      expect(config.getLastAuthFailure()).toBeDefined();
      
      // Increment again
      await config.incrementFailureCount();
      
      // Verify count is now 2
      expect(config.getFailureCount()).toBe(2);
    });

    it('should reset failure count when authentication succeeds', async () => {
      // Add some failures
      await config.incrementFailureCount();
      await config.incrementFailureCount();
      
      expect(config.getFailureCount()).toBe(2);
      
      // Reset failure count (simulating successful auth)
      await config.resetFailureCount();
      
      // Verify reset
      expect(config.getFailureCount()).toBe(0);
      expect(config.getLastAuthFailure()).toBeUndefined();
    });

    it('should apply progressive delays based on failure count', async () => {
      // Initially no delay
      expect(config.shouldDelayAuth()).toBe(false);
      expect(config.getAuthDelayMs()).toBe(0);
      
      // After 3 failures, should delay
      await config.incrementFailureCount(); // 1
      await config.incrementFailureCount(); // 2
      await config.incrementFailureCount(); // 3
      
      expect(config.shouldDelayAuth()).toBe(true);
      expect(config.getAuthDelayMs()).toBeGreaterThanOrEqual(1500); // 2000ms ± 25%
      expect(config.getAuthDelayMs()).toBeLessThanOrEqual(2500);
      
      // After 4 failures, delay should increase
      await config.incrementFailureCount(); // 4
      
      expect(config.getAuthDelayMs()).toBeGreaterThanOrEqual(3000); // 4000ms ± 25%
      expect(config.getAuthDelayMs()).toBeLessThanOrEqual(5000);
    });
  });

  describe('Vendor Key Validation', () => {
    it('should validate correct vendor key format', () => {
      const validKey = 'pk_test123456789.sk_test123456789012345';
      const result = config.validateVendorKeyFormat(validKey);
      expect(result).toBe(true);
    });

    it('should reject invalid vendor key formats', () => {
      const invalidKeys = [
        'invalid-key', // no dot
        'pk_.sk_test123456789012345', // empty public part
        'pk_test123456789.sk_', // empty secret part
        'pk_test.sk_test', // too short
        'pk_test123456789', // missing secret part
        'sk_test123456789.pk_test123456789', // wrong order
        'pk_test@invalid.sk_test123456789012345', // invalid chars
      ];

      invalidKeys.forEach(key => {
        const result = config.validateVendorKeyFormat(key);
        expect(result).not.toBe(true);
        expect(typeof result).toBe('string'); // Should return error message
      });
    });

    it('should accept valid vendor key formats', () => {
      const validKeys = [
        'pk_123456789ABCDEF.sk_1234567890123456789012345',
        'pk_A0123456789ABC.sk_XYZ123456789012345',
      ];

      validKeys.forEach(key => {
        const result = config.validateVendorKeyFormat(key);
        expect(result).toBe(true);
      });
    });
  });

 describe('Token Expiry Handling', () => {
    it('should detect if JWT token is authenticated', async () => {
      // Valid token (in the future)
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.03fBznX7YvIa8e1GjN0dYF1zR2vZ3xP4wQ5rE6sT7uA';
      
      await config.setToken(validToken);
      const isAuthenticated = await config.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    });

    it('should detect if JWT token is expired', async () => {
      // Expired token (in the past)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      await config.setToken(expiredToken);
      const isAuthenticated = await config.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Device ID Management', () => {
    it('should generate and maintain consistent device ID across sessions', async () => {
      // Get first device ID
      const deviceId1 = await config.getDeviceId();
      expect(deviceId1).toBeDefined();
      expect(typeof deviceId1).toBe('string');
      expect(deviceId1.length).toBeGreaterThan(0);
      
      // Get device ID again - should be the same
      const deviceId2 = await config.getDeviceId();
      expect(deviceId1).toBe(deviceId2);
      
      // Simulate new session
      const newConfig = new CLIConfig();
      (newConfig as any).configDir = testConfigDir;
      (newConfig as any).configPath = path.join(testConfigDir, 'config.json');
      (newConfig as any).lockFile = path.join(testConfigDir, 'config.lock');
      
      await newConfig.init();
      
      // Device ID should persist across sessions
      const deviceId3 = await newConfig.getDeviceId();
      expect(deviceId1).toBe(deviceId3);
    });
  });

  describe('Configuration Versioning and Migration', () => {
    it('should maintain configuration version compatibility', async () => {
      // Check that config has version
      const version = config.get('version');
      expect(version).toBeDefined();
      expect(version).toBe('1.0.0');
    });

    it('should handle atomic configuration saves', async () => {
      // Set some data
      await config.setAndSave('testKey', 'testValue');
      
      // Verify it was saved
      expect(config.get('testKey')).toBe('testValue');
      
      // Create new config instance and verify data persists
      const newConfig = new CLIConfig();
      (newConfig as any).configDir = testConfigDir;
      (newConfig as any).configPath = path.join(testConfigDir, 'config.json');
      (newConfig as any).lockFile = path.join(testConfigDir, 'config.lock');
      
      await newConfig.init();
      
      expect(newConfig.get('testKey')).toBe('testValue');
    });
  });

  describe('Credential Validation Against Server', () => {
    it('should validate stored credentials against server', async () => {
      const testVendorKey = 'pk_test123456789.sk_test123456789012345';
      
      // Mock successful server validation
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } } as any);
      
      // Set vendor key
      await config.setVendorKey(testVendorKey);
      
      // Validate credentials
      const isValid = await config.validateStoredCredentials();
      expect(isValid).toBe(true);
      
      // Verify server was called
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should return false when credentials are invalid', async () => {
      const testVendorKey = 'pk_test123456789.sk_test123456789012345';
      
      // Mock failed server validation
      mockAxios.get.mockRejectedValue({ response: { status: 401 } } as any);
      
      // Set vendor key
      await config.setVendorKey(testVendorKey);
      
      // Validate credentials
      const isValid = await config.validateStoredCredentials();
      expect(isValid).toBe(false);
      
      // Verify server was called
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });
  });
});