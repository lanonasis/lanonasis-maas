import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MCPClient } from '../utils/mcp-client.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import WebSocket from 'ws';

// Mock dependencies
const mockWebSocketConstructor = jest.fn();
const mockEventSourceConstructor = jest.fn();

jest.mock('ws', () => ({
  default: mockWebSocketConstructor
}));

jest.mock('eventsource', () => ({
  EventSource: mockEventSourceConstructor
}));

jest.mock('chalk', () => ({
  default: {
    blue: {
      bold: (str: string) => str,
    },
    cyan: (str: string) => str,
    gray: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
  }
}));

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

// Mock MCP SDK
const mockMCPClientConstructor = jest.fn();
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: mockMCPClientConstructor.mockImplementation(() => ({
    connect: jest.fn(),
    close: jest.fn(),
    callTool: jest.fn(),
    listTools: jest.fn()
  }))
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn()
}));

describe('MCP Connection Reliability Tests', () => {
  let mcpClient: MCPClient;
  let testConfigDir: string;

  beforeEach(async () => {
    // Set test environment to skip service discovery
    process.env.NODE_ENV = 'test';
    process.env.SKIP_SERVICE_DISCOVERY = 'true';

    // Create temporary test directory
    testConfigDir = path.join(os.tmpdir(), `test-mcp-reliability-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testConfigDir, { recursive: true });

    // Create MCP client instance
    mcpClient = new MCPClient();

    // Mock the config to use test directory
    const config = (mcpClient as any).config;
    (config as any).configDir = testConfigDir;
    (config as any).configPath = path.join(testConfigDir, 'config.json');
    (config as any).lockFile = path.join(testConfigDir, 'config.lock');

    // Initialize with test credentials
    await config.init();
    await config.setAndSave('token', 'test-token');
    await config.setAndSave('vendorKey', 'pk_test123456789.sk_test123456789012345');

    // Clear all mocks and set defaults
    mockAxios.get.mockClear();
    mockAxios.post.mockClear();
    mockWebSocketConstructor.mockClear();
    mockEventSourceConstructor.mockClear();
    mockMCPClientConstructor.mockClear();

    // Default responses
    mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
    mockAxios.post.mockResolvedValue({ status: 200, data: { valid: true } });

    // Skip server validation in tests
    process.env.SKIP_SERVER_VALIDATION = 'true';
  });

  afterEach(async () => {
    // Disconnect and cleanup
    try {
      await mcpClient.disconnect();
    } catch (error) {
      // Ignore disconnect errors in tests
    }

    // Clean up test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Reset environment
    delete process.env.SKIP_SERVER_VALIDATION;
    delete process.env.NODE_ENV;
    delete process.env.SKIP_SERVICE_DISCOVERY;
  });

  describe('Connection Retry Logic with Simulated Failures', () => {
    it('should retry connection on network failures with exponential backoff', async () => {
      // Mock network failure followed by success
      mockAxios.get
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({ status: 200, data: { status: 'ok' } });

      // Mock EventSource for SSE connection
      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSourceConstructor.mockImplementation(() => mockSSEInstance);

      // Spy on console to verify retry messages
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      // Attempt connection with remote mode
      const connected = await mcpClient.connect({ connectionMode: 'remote' });

      // Should eventually succeed after retries
      expect(connected).toBe(true);

      // Should have made multiple attempts
      expect(mockAxios.get).toHaveBeenCalledTimes(3);

      // Should show retry messages
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retry')
      );

      consoleSpy.mockRestore();
    });

    it('should fail after maximum retry attempts', async () => {
      // Mock persistent network failure
      mockAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      // Attempt connection
      const connected = await mcpClient.connect({ connectionMode: 'remote' });

      // Should fail after max retries
      expect(connected).toBe(false);

      // Should have made maximum attempts (3 retries + 1 initial = 4 total)
      expect(mockAxios.get).toHaveBeenCalledTimes(4);

      // Should show failure message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect after')
      );

      consoleSpy.mockRestore();
    });

    it('should not retry authentication errors', async () => {
      // Mock authentication failure
      mockAxios.get.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      // Attempt connection
      const connected = await mcpClient.connect({ connectionMode: 'remote' });

      // Should fail immediately without retries
      expect(connected).toBe(false);

      // Should only make one attempt (no retries for auth errors)
      expect(mockAxios.get).toHaveBeenCalledTimes(1);

      // Should show authentication error
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failed')
      );

      consoleSpy.mockRestore();
    });

    it('should calculate exponential backoff delays correctly', async () => {
      // Access private method for testing
      const backoffMethod = (mcpClient as any).exponentialBackoff.bind(mcpClient);

      // Test exponential backoff calculation
      const delay1 = await backoffMethod(1);
      const delay2 = await backoffMethod(2);
      const delay3 = await backoffMethod(3);
      const delay4 = await backoffMethod(4);

      // Should increase exponentially but with jitter
      expect(delay1).toBeGreaterThanOrEqual(750); // ~1000ms ± 25%
      expect(delay1).toBeLessThanOrEqual(1250);

      expect(delay2).toBeGreaterThanOrEqual(1500); // ~2000ms ± 25%
      expect(delay2).toBeLessThanOrEqual(2500);

      expect(delay3).toBeGreaterThanOrEqual(3000); // ~4000ms ± 25%
      expect(delay3).toBeLessThanOrEqual(5000);

      // Should cap at 10 seconds
      expect(delay4).toBeLessThanOrEqual(10000);
    });
  });

  describe('Health Monitoring and Automatic Reconnection', () => {
    it('should start health monitoring after successful connection', async () => {
      // Mock successful connection
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });

      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSourceConstructor.mockImplementation(() => mockSSEInstance);

      // Connect
      const connected = await mcpClient.connect({ connectionMode: 'remote' });
      expect(connected).toBe(true);

      // Health monitoring should be active
      const healthInterval = (mcpClient as any).healthCheckInterval;
      expect(healthInterval).toBeDefined();
      expect(healthInterval).not.toBeNull();
    });

    it('should perform health checks at regular intervals', async () => {
      // Mock successful connection
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });

      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSourceConstructor.mockImplementation(() => mockSSEInstance);

      // Connect
      await mcpClient.connect({ connectionMode: 'remote' });

      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have made health check calls
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          timeout: 5000
        })
      );
    });

    it('should attempt reconnection when health check fails', async () => {
      // Mock initial successful connection
      mockAxios.get.mockResolvedValueOnce({ status: 200, data: { status: 'ok' } });

      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSourceConstructor.mockImplementation(() => mockSSEInstance);

      // Connect
      await mcpClient.connect({ connectionMode: 'remote' });

      // Mock health check failure followed by successful reconnection
      mockAxios.get
        .mockRejectedValueOnce(new Error('Health check failed'))
        .mockResolvedValueOnce({ status: 200, data: { status: 'ok' } });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      // Trigger health check failure
      const performHealthCheck = (mcpClient as any).performHealthCheck.bind(mcpClient);
      await performHealthCheck();

      // Should attempt reconnection
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reconnected to MCP server')
      );

      consoleSpy.mockRestore();
    });

    it('should stop health monitoring when disconnected', async () => {
      // Mock successful connection
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });

      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSourceConstructor.mockImplementation(() => mockSSEInstance);

      // Connect
      await mcpClient.connect({ connectionMode: 'remote' });

      // Verify health monitoring is active
      expect((mcpClient as any).healthCheckInterval).not.toBeNull();

      // Disconnect
      await mcpClient.disconnect();

      // Health monitoring should be stopped
      expect((mcpClient as any).healthCheckInterval).toBeNull();
    });
  });

  describe('Transport Protocol Fallback Scenarios', () => {
    it('should handle WebSocket connection failures gracefully', async () => {
      // Mock WebSocket connection failure
      const mockWSInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // Simulate immediate error
            setTimeout(() => (callback as any)(new Error('WebSocket connection failed')), 10);
          }
        }),
        close: jest.fn(),
        send: jest.fn(),
        readyState: WebSocket.CONNECTING
      };
      mockWebSocketConstructor.mockImplementation(() => mockWSInstance);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      // Attempt WebSocket connection
      const connected = await mcpClient.connect({ connectionMode: 'websocket' });

      // Should fail gracefully
      expect(connected).toBe(false);

      // Should show appropriate error message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket error')
      );

      consoleSpy.mockRestore();
    });

    it('should handle SSE connection failures in remote mode', async () => {
      // Mock successful HTTP connection but SSE failure
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSSEInstance: any = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSourceConstructor.mockImplementation(() => {
        const instance = mockSSEInstance;
        // Simulate SSE error
        setTimeout(() => {
          if (instance.onerror) {
            instance.onerror(new Error('SSE connection failed'));
          }
        }, 10);
        return instance;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      // Connect in remote mode
      const connected = await mcpClient.connect({ connectionMode: 'remote' });

      // Should still connect (SSE is optional for remote mode)
      expect(connected).toBe(true);

      // Wait for SSE error
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should log SSE error but not fail connection
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SSE connection error')
      );

      consoleSpy.mockRestore();
    });

    it('should handle local MCP server not found', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      // Attempt local connection (server file won't exist in test)
      const connected = await mcpClient.connect({
        connectionMode: 'local',
        serverPath: '/nonexistent/path/server.js'
      });

      // Should fail with helpful message
      expect(connected).toBe(false);

      // Should provide guidance for remote connection
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Local MCP server not found')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('For remote connection, use:')
      );

      consoleSpy.mockRestore();
    });

    it.skip('should auto-reconnect WebSocket after connection drop', async () => {
      // Mock successful initial WebSocket connection
      const mockWSInstance = {
        on: jest.fn(),
        close: jest.fn(),
        send: jest.fn(),
        readyState: WebSocket.OPEN
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let onCloseCallback: any = null;

      mockWSInstance.on.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => (callback as any)(), 10);
        } else if (event === 'close') {
          onCloseCallback = callback;
        }
      });

      mockWebSocketConstructor.mockImplementation(() => mockWSInstance);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      // Connect
      const connected = await mcpClient.connect({ connectionMode: 'websocket' });
      expect(connected).toBe(true);

      // Simulate connection drop
      if (onCloseCallback) {
        onCloseCallback(1006, 'Connection lost');
      }

      // Should log reconnection attempt
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket connection closed')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling and User Guidance Accuracy', () => {
    it('should provide specific guidance for authentication errors', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      // Call authentication guidance helper directly to avoid relying on full connect() flow
      const error = {
        response: { status: 401 },
        message: 'AUTHENTICATION_REQUIRED'
      };
      const provideAuthGuidance = (mcpClient as any).provideAuthenticationGuidance.bind(mcpClient);
      provideAuthGuidance(error);

      // Should provide specific authentication guidance
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No credentials found')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('lanonasis auth login')
      );

      consoleSpy.mockRestore();
    });

    it('should provide specific guidance for network errors', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      // Call network troubleshooting helper directly
      const networkError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED'
      };
      const provideNetworkGuidance = (mcpClient as any).provideNetworkTroubleshootingGuidance.bind(mcpClient);
      provideNetworkGuidance(networkError);

      // Should provide specific network guidance
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection refused')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Check https://mcp.lanonasis.com/health')
      );

      consoleSpy.mockRestore();
    });

    it('should provide specific guidance for timeout errors', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      // Call network troubleshooting helper directly for timeout
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'timeout'
      };
      const provideNetworkGuidance = (mcpClient as any).provideNetworkTroubleshootingGuidance.bind(mcpClient);
      provideNetworkGuidance(timeoutError);

      // Should provide specific timeout guidance
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection timeout')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Check network')
      );

      consoleSpy.mockRestore();
    });

    it('should provide specific guidance for SSL/TLS errors', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      // Call network troubleshooting helper directly for SSL/TLS error
      const sslError = {
        message: 'certificate verify failed'
      };
      const provideNetworkGuidance = (mcpClient as any).provideNetworkTroubleshootingGuidance.bind(mcpClient);
      provideNetworkGuidance(sslError);

      // Should provide specific SSL guidance
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SSL/TLS certificate issue')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Check system time')
      );

      consoleSpy.mockRestore();
    });

    it('should validate authentication before connection attempts', async () => {
      // Create config without credentials
      const config = (mcpClient as any).config;
      await config.clearInvalidCredentials();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      // Attempt connection
      const connected = await mcpClient.connect({ connectionMode: 'remote' });

      // Should fail with authentication error
      expect(connected).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('AUTHENTICATION_REQUIRED')
      );

      consoleSpy.mockRestore();
    });

    it('should provide connection status with detailed information', () => {
      const status = mcpClient.getConnectionStatus();

      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('mode');
      expect(status).toHaveProperty('server');
      expect(status).toHaveProperty('failureCount');
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.mode).toBe('string');
      expect(typeof status.failureCount).toBe('number');
    });

    it('should track connection uptime and health check status', async () => {
      // Mock successful connection
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });

      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSourceConstructor.mockImplementation(() => mockSSEInstance);

      // Connect
      await mcpClient.connect({ connectionMode: 'remote' });
      // Perform an explicit health check to update status deterministically
      const performHealthCheck = (mcpClient as any).performHealthCheck.bind(mcpClient);
      await performHealthCheck();

      const status = mcpClient.getConnectionStatus();

      expect(status.connected).toBe(true);
      expect(status.connectionUptime).toBeGreaterThan(0);
      expect(status.lastHealthCheck).toBeDefined();
    });
  });

  describe('Tool Execution Reliability', () => {
    it('should handle tool execution failures gracefully', async () => {
      // Configure MCP client as a connected remote client without using real network
      const internalClient = mcpClient as any;
      internalClient.isConnected = true;

      const config = internalClient.config;
      await config.setAndSave('mcpUseRemote', true);

      const remoteSpy = jest
        .spyOn(internalClient, 'callRemoteTool')
        .mockRejectedValue(new Error('Remote tool call failed'));

      await expect(mcpClient.callTool('memory_create_memory', {
        title: 'test',
        content: 'test content'
      })).rejects.toThrow('Remote tool call failed');

      expect(remoteSpy).toHaveBeenCalledWith('memory_create_memory', {
        title: 'test',
        content: 'test content'
      });
    });

    it('should validate connection before tool execution', async () => {
      // Don't connect first

      // Should fail with connection error
      await expect(mcpClient.callTool('memory_create_memory', {
        title: 'test',
        content: 'test content'
      })).rejects.toThrow('Not connected to MCP server');
    });

    it('should list available tools correctly', async () => {
      // Configure MCP client with a local SDK client stub to avoid real MCP interaction
      const internalClient = mcpClient as any;
      internalClient.isConnected = true;

      const config = internalClient.config;
      await config.setAndSave('mcpUseRemote', false);

      const sdkClientMock = {
        listTools: jest.fn().mockResolvedValue({
          tools: [
            { name: 'memory_create_memory', description: 'Create a new memory entry' }
          ]
        })
      };
      internalClient.client = sdkClientMock;

      const tools = await mcpClient.listTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty('name', 'memory_create_memory');
      expect(tools[0]).toHaveProperty('description');
    });
  });
});