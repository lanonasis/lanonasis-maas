import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MCPClient } from '../utils/mcp-client.js';
import { CLIConfig } from '../utils/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import WebSocket from 'ws';
import { EventSource } from 'eventsource';

// Mock dependencies
jest.mock('ws');
jest.mock('eventsource');
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

const mockAxios = {
  get: jest.fn(),
  post: jest.fn()
};

jest.mock('axios', () => ({
  default: mockAxios,
  get: mockAxios.get,
  post: mockAxios.post
}));

// Mock MCP SDK
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

describe('MCP Connection Reliability Tests', () => {
  let mcpClient: MCPClient;
  let testConfigDir: string;
  let mockAxios: any;
  let mockWebSocket: any;
  let mockEventSource: any;
  let mockMCPClient: any;

  beforeEach(async () => {
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
    
    // Setup mocks
    mockAxios = (await import('axios')).default;
    mockWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;
    mockEventSource = EventSource as jest.MockedClass<typeof EventSource>;
    mockMCPClient = (await import('@modelcontextprotocol/sdk/client/index.js')).Client;
    
    // Clear all mocks
    mockAxios.get.mockClear();
    mockAxios.post.mockClear();
    mockWebSocket.mockClear();
    mockEventSource.mockClear();
    mockMCPClient.mockClear();
  });

  afterEach(async () => {
    // Disconnect and cleanup
    await mcpClient.disconnect();
    
    // Clean up test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
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
      mockEventSource.mockImplementation(() => mockSSEInstance);
      
      // Spy on console to verify retry messages
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
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
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
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
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
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
      mockEventSource.mockImplementation(() => mockSSEInstance);
      
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
      mockEventSource.mockImplementation(() => mockSSEInstance);
      
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
      mockEventSource.mockImplementation(() => mockSSEInstance);
      
      // Connect
      await mcpClient.connect({ connectionMode: 'remote' });
      
      // Mock health check failure followed by successful reconnection
      mockAxios.get
        .mockRejectedValueOnce(new Error('Health check failed'))
        .mockResolvedValueOnce({ status: 200, data: { status: 'ok' } });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
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
      mockEventSource.mockImplementation(() => mockSSEInstance);
      
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
      mockWebSocket.mockImplementation(() => mockWSInstance);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
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
      
      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSource.mockImplementation(() => {
        const instance = mockSSEInstance;
        // Simulate SSE error
        setTimeout(() => {
          if (instance.onerror) {
            instance.onerror(new Error('SSE connection failed'));
          }
        }, 10);
        return instance;
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
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

    it('should auto-reconnect WebSocket after connection drop', async () => {
      // Mock successful initial WebSocket connection
      const mockWSInstance = {
        on: jest.fn(),
        close: jest.fn(),
        send: jest.fn(),
        readyState: WebSocket.OPEN
      };
      
      let onCloseCallback: ((code: number, reason: string) => void) | null = null;
      
      mockWSInstance.on.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => (callback as any)(), 10);
        } else if (event === 'close') {
          onCloseCallback = callback as (code: number, reason: string) => void;
        }
      });
      
      mockWebSocket.mockImplementation(() => mockWSInstance);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
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
      // Mock authentication error
      mockAxios.get.mockRejectedValue({
        response: { status: 401 },
        message: 'AUTHENTICATION_REQUIRED'
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Attempt connection
      await mcpClient.connect({ connectionMode: 'remote' });
      
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
      // Mock network error
      mockAxios.get.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED'
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Attempt connection
      await mcpClient.connect({ connectionMode: 'remote' });
      
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
      // Mock timeout error
      mockAxios.get.mockRejectedValue({
        code: 'ETIMEDOUT',
        message: 'timeout'
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Attempt connection
      await mcpClient.connect({ connectionMode: 'remote' });
      
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
      // Mock SSL error
      mockAxios.get.mockRejectedValue({
        message: 'certificate verify failed'
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Attempt connection
      await mcpClient.connect({ connectionMode: 'remote' });
      
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
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Attempt connection
      const connected = await mcpClient.connect({ connectionMode: 'remote' });
      
      // Should fail with authentication error
      expect(connected).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
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
      mockEventSource.mockImplementation(() => mockSSEInstance);
      
      // Connect
      await mcpClient.connect({ connectionMode: 'remote' });
      
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = mcpClient.getConnectionStatus();
      
      expect(status.connected).toBe(true);
      expect(status.connectionUptime).toBeGreaterThan(0);
      expect(status.lastHealthCheck).toBeDefined();
    });
  });

  describe('Tool Execution Reliability', () => {
    it('should handle tool execution failures gracefully', async () => {
      // Mock successful connection
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      
      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSource.mockImplementation(() => mockSSEInstance);
      
      await mcpClient.connect({ connectionMode: 'remote' });
      
      // Mock tool execution failure
      mockAxios.mockRejectedValue({
        response: { 
          status: 500, 
          data: { error: 'Internal server error' } 
        }
      });
      
      // Should handle tool execution error
      await expect(mcpClient.callTool('memory_create_memory', { 
        title: 'test', 
        content: 'test content' 
      })).rejects.toThrow('Remote tool call failed');
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
      // Mock successful connection
      mockAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      
      const mockSSEInstance = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      };
      mockEventSource.mockImplementation(() => mockSSEInstance);
      
      await mcpClient.connect({ connectionMode: 'remote' });
      
      // Should return list of available tools
      const tools = await mcpClient.listTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty('name');
      expect(tools[0]).toHaveProperty('description');
    });
  });
});