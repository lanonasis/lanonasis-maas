import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CLIConfig } from '../utils/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAxios: any = {
  get: jest.fn(),
  post: jest.fn()
};

jest.mock('axios', () => ({
  default: mockAxios,
  get: mockAxios.get,
  post: mockAxios.post
}));

jest.mock('eventsource');
jest.mock('ws');
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    close: jest.fn(),
    callTool: jest.fn(),
    listTools: jest.fn()
  }))
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn()
}));

describe('Cross-Device Integration Tests', () => {
  let device1Config: CLIConfig;
  let device2Config: CLIConfig;
  let device3Config: CLIConfig;
  let device1Dir: string;
  let device2Dir: string;
  let device3Dir: string;

  beforeEach(async () => {
    // Create separate test directories for each "device"
    device1Dir = path.join(os.tmpdir(), `test-device1-${Date.now()}-${Math.random()}`);
    device2Dir = path.join(os.tmpdir(), `test-device2-${Date.now()}-${Math.random()}`);
    device3Dir = path.join(os.tmpdir(), `test-device3-${Date.now()}-${Math.random()}`);

    await fs.mkdir(device1Dir, { recursive: true });
    await fs.mkdir(device2Dir, { recursive: true });
    await fs.mkdir(device3Dir, { recursive: true });

    // Create config instances for each "device"
    device1Config = new CLIConfig();
    device1Config.setConfigDirectory(device1Dir);

    device2Config = new CLIConfig();
    device2Config.setConfigDirectory(device2Dir);

    device3Config = new CLIConfig();
    device3Config.setConfigDirectory(device3Dir);

    // Initialize all configs
    await device1Config.init();
    await device2Config.init();
    await device3Config.init();

    // Clear axios mocks and set defaults
    mockAxios.get.mockClear();
    mockAxios.post.mockClear();

    // Set default responses for mocked axios
    mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
    mockAxios.post.mockResolvedValue({ status: 200, data: { valid: true } });

    // Skip server validation by default
    process.env.SKIP_SERVER_VALIDATION = 'true';
  });

  afterEach(async () => {
    // Clean up all test directories
    try {
      await fs.rm(device1Dir, { recursive: true, force: true });
      await fs.rm(device2Dir, { recursive: true, force: true });
      await fs.rm(device3Dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Reset environment
    delete process.env.SKIP_SERVER_VALIDATION;
  });

  describe('Same Credentials Working on Multiple Simulated Devices', () => {
    it('should allow same vendor key to work on multiple devices', async () => {
      const sharedVendorKey = 'pk_shared123456789.sk_shared123456789012345';

      // Mock successful server validation for all devices
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } } as any);

      // Set same vendor key on all devices
      await device1Config.setVendorKey(sharedVendorKey);
      await device2Config.setVendorKey(sharedVendorKey);
      await device3Config.setVendorKey(sharedVendorKey);

      // Verify all devices have the same vendor key
      expect(device1Config.getVendorKey()).toBe(sharedVendorKey);
      expect(device2Config.getVendorKey()).toBe(sharedVendorKey);
      expect(device3Config.getVendorKey()).toBe(sharedVendorKey);

      // Verify all devices have same auth method
      expect(device1Config.get('authMethod')).toBe('vendor_key');
      expect(device2Config.get('authMethod')).toBe('vendor_key');
      expect(device3Config.get('authMethod')).toBe('vendor_key');

      // Verify server validation was called for each device
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should maintain separate device IDs while sharing credentials', async () => {
      const sharedVendorKey = 'pk_shared123456789.sk_shared123456789012345';

      // Mock successful server validation
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } } as any);

      // Set same vendor key on all devices
      await device1Config.setVendorKey(sharedVendorKey);
      await device2Config.setVendorKey(sharedVendorKey);
      await device3Config.setVendorKey(sharedVendorKey);

      // Get device IDs
      const deviceId1 = await device1Config.getDeviceId();
      const deviceId2 = await device2Config.getDeviceId();
      const deviceId3 = await device3Config.getDeviceId();

      // Device IDs should be different
      expect(deviceId1).not.toBe(deviceId2);
      expect(deviceId1).not.toBe(deviceId3);
      expect(deviceId2).not.toBe(deviceId3);

      // But credentials should be the same
      expect(device1Config.getVendorKey()).toBe(sharedVendorKey);
      expect(device2Config.getVendorKey()).toBe(sharedVendorKey);
      expect(device3Config.getVendorKey()).toBe(sharedVendorKey);
    });
  });

  describe('Service Discovery Consistency Across Environments', () => {
    it('should discover same service endpoints from all devices', async () => {
      // Mock service discovery response
      const mockDiscoveryResponse = {
        auth: { login: 'https://auth.lanonasis.com/auth/login' },
        endpoints: {
          http: 'https://mcp.lanonasis.com/api/v1',
          websocket: 'wss://mcp.lanonasis.com/ws',
          sse: 'https://mcp.lanonasis.com/api/v1/events'
        }
      };

      mockAxios.get.mockResolvedValue({ data: mockDiscoveryResponse } as any);

      // Perform service discovery on all devices
      await device1Config.discoverServices();
      await device2Config.discoverServices();
      await device3Config.discoverServices();

      // All devices should have discovered the same endpoints
      const services1 = device1Config.get('discoveredServices') as any;
      const services2 = device2Config.get('discoveredServices') as any;
      const services3 = device3Config.get('discoveredServices') as any;

      expect(services1).toEqual(services2);
      expect(services1).toEqual(services3);
      expect(services2).toEqual(services3);

      // Verify specific endpoints
      expect(services1.mcp_base).toBe('https://mcp.lanonasis.com/api/v1');
      expect(services1.mcp_ws_base).toBe('wss://mcp.lanonasis.com/ws');
      expect(services1.mcp_sse_base).toBe('https://mcp.lanonasis.com/api/v1/events');
    });

    it('should handle service discovery failures consistently', async () => {
      // Temporarily disable test mode to test actual failure handling
      delete process.env.SKIP_SERVER_VALIDATION;

      const originalFallbackEnv = {
        AUTH_BASE: process.env.AUTH_BASE,
        MCP_BASE: process.env.MCP_BASE,
        MCP_WS_BASE: process.env.MCP_WS_BASE,
        MCP_SSE_BASE: process.env.MCP_SSE_BASE,
        MEMORY_BASE: process.env.MEMORY_BASE
      };

      process.env.AUTH_BASE = 'https://fallback-auth.example.com';
      process.env.MCP_BASE = 'https://fallback-mcp.example.com/api';
      process.env.MCP_WS_BASE = 'wss://fallback-mcp.example.com/ws';
      process.env.MCP_SSE_BASE = 'https://fallback-mcp.example.com/events';
      process.env.MEMORY_BASE = 'https://fallback-memory.example.com/api/v1';

      // Mock discovery failure
      mockAxios.get.mockRejectedValue(new Error('Service discovery failed') as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      try {
        // Attempt service discovery on all devices
        await device1Config.discoverServices(true);
        await device2Config.discoverServices(true);
        await device3Config.discoverServices(true);

        // All devices should fall back to same default endpoints
        const services1 = device1Config.get('discoveredServices') as any;
        const services2 = device2Config.get('discoveredServices') as any;
        const services3 = device3Config.get('discoveredServices') as any;

        expect(services1).toEqual(services2);
        expect(services1).toEqual(services3);

        // Should use fallback endpoints
        expect(services1.auth_base).toBe('https://fallback-auth.example.com');
        expect(services1.mcp_base).toBe('https://fallback-mcp.example.com/api');
        expect(services1.mcp_ws_base).toBe('wss://fallback-mcp.example.com/ws');
        expect(services1.mcp_sse_base).toBe('https://fallback-mcp.example.com/events');
        expect(services1.memory_base).toBe('https://fallback-memory.example.com/api/v1');
      } finally {
        consoleSpy.mockRestore();

        // Restore test mode
        process.env.SKIP_SERVER_VALIDATION = 'true';

        // Restore fallback environment variables
        const envEntries = Object.entries(originalFallbackEnv) as [keyof typeof originalFallbackEnv, string | undefined][];
        for (const [key, value] of envEntries) {
          if (typeof value === 'undefined') {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }
    });
  });

  describe('Configuration Synchronization and Compatibility', () => {
    it('should maintain configuration version compatibility across devices', async () => {
      // All devices should have the same config version
      expect(device1Config.get('version')).toBe('1.0.0');
      expect(device2Config.get('version')).toBe('1.0.0');
      expect(device3Config.get('version')).toBe('1.0.0');

      // Set some data on device 1
      await device1Config.setAndSave('testData', 'test-value');

      // Read config file directly and apply to device 2
      const configPath1 = device1Config.getConfigPath();
      const configData = JSON.parse(await fs.readFile(configPath1, 'utf-8'));

      const configPath2 = device2Config.getConfigPath();
      await fs.writeFile(configPath2, JSON.stringify(configData, null, 2));

      // Reload device 2 config
      await device2Config.load();

      // Device 2 should have the same data and version
      expect(device2Config.get('testData')).toBe('test-value');
      expect(device2Config.get('version')).toBe('1.0.0');
    });

    it('should create consistent backup files across devices', async () => {
      const testData = { test: 'backup-data', timestamp: Date.now() };

      // Set data on all devices
      await device1Config.setAndSave('backupTest', testData);
      await device2Config.setAndSave('backupTest', testData);
      await device3Config.setAndSave('backupTest', testData);

      // Create backups on all devices
      const backup1 = await device1Config.backupConfig();
      const backup2 = await device2Config.backupConfig();
      const backup3 = await device3Config.backupConfig();

      // All backups should exist
      expect(await fs.access(backup1).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(backup2).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(backup3).then(() => true).catch(() => false)).toBe(true);

      // All backups should contain the same data
      const backupData1 = JSON.parse(await fs.readFile(backup1, 'utf-8'));
      const backupData2 = JSON.parse(await fs.readFile(backup2, 'utf-8'));
      const backupData3 = JSON.parse(await fs.readFile(backup3, 'utf-8'));

      expect(backupData1.backupTest).toEqual(testData);
      expect(backupData2.backupTest).toEqual(testData);
      expect(backupData3.backupTest).toEqual(testData);

      // All should have same version
      expect(backupData1.version).toBe('1.0.0');
      expect(backupData2.version).toBe('1.0.0');
      expect(backupData3.version).toBe('1.0.0');
    });
  });

  describe('Error Message Consistency Across Different Failure Scenarios', () => {
    it('should provide consistent error messages for authentication failures', async () => {
      const invalidVendorKey = 'pk_invalid.sk_invalid';

      // Mock authentication failure
      mockAxios.get.mockRejectedValue({
        response: { status: 401, data: { error: 'invalid vendor key' } }
      } as any);

      // Attempt to set invalid vendor key on all devices
      const errors: string[] = [];

      try {
        await device1Config.setVendorKey(invalidVendorKey);
      } catch (error) {
        errors.push((error as Error).message);
      }

      try {
        await device2Config.setVendorKey(invalidVendorKey);
      } catch (error) {
        errors.push((error as Error).message);
      }

      try {
        await device3Config.setVendorKey(invalidVendorKey);
      } catch (error) {
        errors.push((error as Error).message);
      }

      // All devices should get the same error message
      expect(errors).toHaveLength(3);
      expect(errors[0]).toBe(errors[1]);
      expect(errors[0]).toBe(errors[2]);
      expect(errors[0]).toContain('Vendor key validation failed');
    });

    it('should provide consistent validation error messages', async () => {
      const invalidInputs = ['', '   '];

      for (const invalidKey of invalidInputs) {
        const validationResults: (string | boolean)[] = [];

        // Test validation on all devices
        validationResults.push(device1Config.validateVendorKeyFormat(invalidKey));
        validationResults.push(device2Config.validateVendorKeyFormat(invalidKey));
        validationResults.push(device3Config.validateVendorKeyFormat(invalidKey));

        // All devices should return the same validation error
        expect(validationResults[0]).toBe(validationResults[1]);
        expect(validationResults[0]).toBe(validationResults[2]);
        expect(typeof validationResults[0]).toBe('string'); // Should be error message
        expect(validationResults[0]).toBe('Vendor key is required');
      }
    });

    it('should maintain consistent failure tracking across devices', async () => {
      const sharedVendorKey = 'pk_shared123456789.sk_shared123456789012345';

      // Set vendor key on all devices (server validation skipped)
      await device1Config.setVendorKey(sharedVendorKey);
      await device2Config.setVendorKey(sharedVendorKey);
      await device3Config.setVendorKey(sharedVendorKey);

      // Manually increment failure counts to test consistency
      await device1Config.incrementFailureCount();
      await device2Config.incrementFailureCount();
      await device3Config.incrementFailureCount();

      // All devices should have incremented failure count
      expect(device1Config.getFailureCount()).toBe(1);
      expect(device2Config.getFailureCount()).toBe(1);
      expect(device3Config.getFailureCount()).toBe(1);

      // Add more failures to test delay calculation consistency
      await device1Config.incrementFailureCount();
      await device1Config.incrementFailureCount();
      await device2Config.incrementFailureCount();
      await device2Config.incrementFailureCount();
      await device3Config.incrementFailureCount();
      await device3Config.incrementFailureCount();

      // All devices should have same failure count and delay
      expect(device1Config.getFailureCount()).toBe(3);
      expect(device2Config.getFailureCount()).toBe(3);
      expect(device3Config.getFailureCount()).toBe(3);

      expect(device1Config.shouldDelayAuth()).toBe(true);
      expect(device2Config.shouldDelayAuth()).toBe(true);
      expect(device3Config.shouldDelayAuth()).toBe(true);

      expect(device1Config.getAuthDelayMs()).toBe(2000);
      expect(device2Config.getAuthDelayMs()).toBe(2000);
      expect(device3Config.getAuthDelayMs()).toBe(2000);
    });
  });
});
