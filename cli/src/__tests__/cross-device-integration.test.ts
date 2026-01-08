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
    // Set test environment to skip service discovery
    process.env.NODE_ENV = 'test';
    process.env.SKIP_SERVICE_DISCOVERY = 'true';

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
    delete process.env.NODE_ENV;
    delete process.env.SKIP_SERVICE_DISCOVERY;
    delete process.env.FORCE_SERVICE_DISCOVERY;
  });

  describe('Same Credentials Working on Multiple Simulated Devices', () => {
    it('should allow same vendor key to work on multiple devices', async () => {
      const previousSkipValidation = process.env.SKIP_SERVER_VALIDATION;
      process.env.SKIP_SERVER_VALIDATION = 'false';
      const pingSpy = jest.spyOn(CLIConfig.prototype as any, 'pingAuthHealth');

      const sharedVendorKey = 'pk_shared123456789.sk_shared123456789012345';

      // Mock successful server validation for all devices
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } } as any);

      try {
        // Set same vendor key on all devices
        await device1Config.setVendorKey(sharedVendorKey);
        await device2Config.setVendorKey(sharedVendorKey);
        await device3Config.setVendorKey(sharedVendorKey);

        // Verify all devices have the same vendor key
        expect(await device1Config.getVendorKeyAsync()).toBe(sharedVendorKey);
        expect(await device2Config.getVendorKeyAsync()).toBe(sharedVendorKey);
        expect(await device3Config.getVendorKeyAsync()).toBe(sharedVendorKey);

        // Verify all devices have same auth method
        expect(device1Config.get('authMethod')).toBe('vendor_key');
        expect(device2Config.get('authMethod')).toBe('vendor_key');
        expect(device3Config.get('authMethod')).toBe('vendor_key');

        // Verify server validation health checks were triggered
        expect(pingSpy).toHaveBeenCalled();
      } finally {
        pingSpy.mockRestore();
        if (typeof previousSkipValidation === 'undefined') {
          delete process.env.SKIP_SERVER_VALIDATION;
        } else {
          process.env.SKIP_SERVER_VALIDATION = previousSkipValidation;
        }
      }
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
      expect(await device1Config.getVendorKeyAsync()).toBe(sharedVendorKey);
      expect(await device2Config.getVendorKeyAsync()).toBe(sharedVendorKey);
      expect(await device3Config.getVendorKeyAsync()).toBe(sharedVendorKey);
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
      const previousEnv = {
        skipDiscovery: process.env.SKIP_SERVICE_DISCOVERY,
        skipValidation: process.env.SKIP_SERVER_VALIDATION,
        forceDiscovery: process.env.FORCE_SERVICE_DISCOVERY
      };

      process.env.FORCE_SERVICE_DISCOVERY = 'true';
      process.env.SKIP_SERVICE_DISCOVERY = 'false';
      delete process.env.SKIP_SERVER_VALIDATION;

      const fallbackEnvKeys = [
        'LANONASIS_FALLBACK_AUTH_BASE',
        'LANONASIS_FALLBACK_MCP_BASE',
        'LANONASIS_FALLBACK_MCP_WS_BASE',
        'LANONASIS_FALLBACK_MCP_SSE_BASE',
        'LANONASIS_FALLBACK_MEMORY_BASE'
      ] as const;

      const originalFallbackEnv: Partial<Record<typeof fallbackEnvKeys[number], string | undefined>> = {};
      fallbackEnvKeys.forEach((key) => {
        originalFallbackEnv[key] = process.env[key];
      });

      process.env.LANONASIS_FALLBACK_AUTH_BASE = 'https://fallback-auth.example.com';
      process.env.LANONASIS_FALLBACK_MCP_BASE = 'https://fallback-mcp.example.com/api';
      process.env.LANONASIS_FALLBACK_MCP_WS_BASE = 'wss://fallback-mcp.example.com/ws';
      process.env.LANONASIS_FALLBACK_MCP_SSE_BASE = 'https://fallback-mcp.example.com/events';
      process.env.LANONASIS_FALLBACK_MEMORY_BASE = 'https://fallback-memory.example.com/api/v1';

      // Mock discovery failure (ensure categorizeServiceDiscoveryError sees a network error)
      const networkError = new Error('Service discovery failed');
      (networkError as any).code = 'ECONNREFUSED';
      mockAxios.get.mockRejectedValue(networkError as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      try {
        // Simulate discovery failures directly to exercise fallback logic
        const triggerFallback = async (config: CLIConfig) => {
          await (config as any).handleServiceDiscoveryFailure(networkError, true);
        };

        await triggerFallback(device1Config);
        await triggerFallback(device2Config);
        await triggerFallback(device3Config);

        // All devices should fall back to same endpoints
        const services1 = device1Config.get('discoveredServices') as any;
        const services2 = device2Config.get('discoveredServices') as any;
        const services3 = device3Config.get('discoveredServices') as any;

        expect(services1).toEqual(services2);
        expect(services1).toEqual(services3);

        // Should use fallback endpoints derived from environment overrides
        expect(services1.auth_base).toBe('https://fallback-auth.example.com');
        expect(services1.mcp_base).toBe('https://fallback-mcp.example.com/api');
        expect(services1.mcp_ws_base).toBe('wss://fallback-mcp.example.com/ws');
        expect(services1.mcp_sse_base).toBe('https://fallback-mcp.example.com/events');
        expect(services1.memory_base).toBe('https://fallback-memory.example.com/api/v1');
      } finally {
        consoleSpy.mockRestore();

        if (typeof previousEnv.skipDiscovery === 'undefined') {
          delete process.env.SKIP_SERVICE_DISCOVERY;
        } else {
          process.env.SKIP_SERVICE_DISCOVERY = previousEnv.skipDiscovery;
        }

        if (typeof previousEnv.skipValidation === 'undefined') {
          delete process.env.SKIP_SERVER_VALIDATION;
        } else {
          process.env.SKIP_SERVER_VALIDATION = previousEnv.skipValidation;
        }

        if (typeof previousEnv.forceDiscovery === 'undefined') {
          delete process.env.FORCE_SERVICE_DISCOVERY;
        } else {
          process.env.FORCE_SERVICE_DISCOVERY = previousEnv.forceDiscovery;
        }

        // Restore fallback environment variables
        fallbackEnvKeys.forEach((key) => {
          const value = originalFallbackEnv[key];
          if (typeof value === 'undefined') {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        });
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
    it('should consistently store vendor keys when validation is skipped', async () => {
      const sharedVendorKey = 'pk_test_shared_123.sk_test_shared_456';

      // Under SKIP_SERVER_VALIDATION the configs should accept the vendor key without hitting the network
      await expect(device1Config.setVendorKey(sharedVendorKey)).resolves.not.toThrow();
      await expect(device2Config.setVendorKey(sharedVendorKey)).resolves.not.toThrow();
      await expect(device3Config.setVendorKey(sharedVendorKey)).resolves.not.toThrow();

      expect(await device1Config.getVendorKeyAsync()).toBe(sharedVendorKey);
      expect(await device2Config.getVendorKeyAsync()).toBe(sharedVendorKey);
      expect(await device3Config.getVendorKeyAsync()).toBe(sharedVendorKey);
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
