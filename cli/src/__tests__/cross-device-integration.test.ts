import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CLIConfig } from '../utils/config.js';
import { MCPClient } from '../utils/mcp-client.js';
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
    device1Config = new (CLIConfig as any)();
    (device1Config as any).configDir = device1Dir;
    (device1Config as any).configPath = path.join(device1Dir, 'config.json');
    (device1Config as any).lockFile = path.join(device1Dir, 'config.lock');
    
    device2Config = new (CLIConfig as any)();
    (device2Config as any).configDir = device2Dir;
    (device2Config as any).configPath = path.join(device2Dir, 'config.json');
    (device2Config as any).lockFile = path.join(device2Dir, 'config.lock');
    
    device3Config = new (CLIConfig as any)();
    (device3Config as any).configDir = device3Dir;
    (device3Config as any).configPath = path.join(device3Dir, 'config.json');
    (device3Config as any).lockFile = path.join(device3Dir, 'config.lock');
    
    // Initialize all configs
    await device1Config.init();
    await device2Config.init();
    await device3Config.init();

    // Clear axios mocks
    mockAxios.get.mockClear();
    mockAxios.post.mockClear();
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
        auth: { login: 'https://api.lanonasis.com/auth/login' },
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
      // Mock service discovery failure
      mockAxios.get.mockRejectedValue(new Error('Service discovery failed') as any);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
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
      expect(services1.auth_base).toBe('https://api.lanonasis.com');
      expect(services1.mcp_base).toBe('https://mcp.lanonasis.com/api/v1');
      expect(services1.mcp_ws_base).toBe('wss://mcp.lanonasis.com/ws');
      
      consoleSpy.mockRestore();
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
      const configPath1 = (device1Config as any).configPath;
      const configData = JSON.parse(await fs.readFile(configPath1, 'utf-8'));
      
      const configPath2 = (device2Config as any).configPath;
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
      expect(errors[0]).toContain('Vendor key authentication failed');
    });

    it('should provide consistent validation error messages', async () => {
      const invalidFormats = [
        'invalid-key',
        'pk_short.sk_short',
        'pk_.sk_test123456789012345',
        'pk_test123456789.sk_'
      ];
      
      for (const invalidKey of invalidFormats) {
        const validationResults: (string | boolean)[] = [];
        
        // Test validation on all devices
        validationResults.push(device1Config.validateVendorKeyFormat(invalidKey));
        validationResults.push(device2Config.validateVendorKeyFormat(invalidKey));
        validationResults.push(device3Config.validateVendorKeyFormat(invalidKey));
        
        // All devices should return the same validation error
        expect(validationResults[0]).toBe(validationResults[1]);
        expect(validationResults[0]).toBe(validationResults[2]);
        expect(typeof validationResults[0]).toBe('string'); // Should be error message
      }
    });

    it('should maintain consistent failure tracking across devices', async () => {
      const sharedVendorKey = 'pk_shared123456789.sk_shared123456789012345';
      
      // Mock successful initial setup
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } } as any);
      
      // Set vendor key on all devices
      await device1Config.setVendorKey(sharedVendorKey);
      await device2Config.setVendorKey(sharedVendorKey);
      await device3Config.setVendorKey(sharedVendorKey);
      
      // Mock validation failure
      mockAxios.get.mockRejectedValue({
        response: { status: 401, data: { error: 'invalid credentials' } }
      } as any);
      
      // Validate credentials on all devices (should fail)
      await device1Config.validateStoredCredentials();
      await device2Config.validateStoredCredentials();
      await device3Config.validateStoredCredentials();
      
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