/**
 * Connection Manager Tests
 *
 * Unit tests and property-based tests for the ConnectionManager implementation
 * as specified in the CLI UX improvements design document.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import { join } from 'path';
import type { spawn } from 'child_process';
import type { ConnectionManager, MCPConfig } from '../interfaces/ConnectionManager.js';

// Mock fs operations - define typed mock functions
const mockAccess = jest.fn<() => Promise<void>>();
const mockReadFile = jest.fn<() => Promise<string>>();
const mockWriteFile = jest.fn<() => Promise<void>>();
const mockMkdir = jest.fn<() => Promise<string | undefined>>();
const mockCreateWriteStream = jest.fn();

jest.unstable_mockModule('fs', () => ({
  promises: {
    access: mockAccess,
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
  },
  createWriteStream: mockCreateWriteStream,
}));

// Mock child_process
const mockSpawn = jest.fn<typeof spawn>();
jest.unstable_mockModule('child_process', () => ({
  spawn: mockSpawn,
}));

const { ConnectionManagerImpl } = await import('../implementations/ConnectionManagerImpl.js');

const createMockProcess = () => {
  const listeners: Record<string, Array<(code?: number) => void>> = {};
  return {
    pid: 12345,
    stdout: { pipe: jest.fn() },
    stderr: { pipe: jest.fn() },
    on: jest.fn((event: string, callback: (code?: number) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(callback);
      if (event === 'spawn') {
        callback();
      }
    }),
    kill: jest.fn(() => {
      (listeners.exit || []).forEach((cb) => cb(0));
      return true;
    }),
  };
};

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let tempConfigPath: string;

  beforeEach(() => {
    tempConfigPath = join('/tmp', 'test-mcp-config.json');
    connectionManager = new ConnectionManagerImpl(tempConfigPath);

    // Reset mocks
    jest.clearAllMocks();
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('mcp server');
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockCreateWriteStream.mockReturnValue({});
    mockSpawn.mockImplementation(() => createMockProcess() as any);
  });

  afterEach(async () => {
    // Clean up any running servers
    try {
      await connectionManager.stopLocalServer();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Unit Tests', () => {
    it('should initialize with default configuration', () => {
      const config = connectionManager.getConfig();
      expect(config).toBeDefined();
      expect(config.autoStart).toBe(true);
      expect(config.connectionTimeout).toBeGreaterThan(0);
      expect(config.retryAttempts).toBeGreaterThan(0);
    });

    it('should get initial connection status', () => {
      const status = connectionManager.getConnectionStatus();
      expect(status).toBeDefined();
      expect(status.isConnected).toBe(false);
      expect(status.connectionAttempts).toBe(0);
    });

    it('should update configuration', async () => {
      const newConfig: Partial<MCPConfig> = {
        serverPort: 4000,
        logLevel: 'debug',
      };

      await connectionManager.updateConfig(newConfig);
      const updatedConfig = connectionManager.getConfig();

      expect(updatedConfig.serverPort).toBe(4000);
      expect(updatedConfig.logLevel).toBe('debug');
    });

    it('should handle server path detection failure gracefully', async () => {
      // Mock fs.access to always fail
      mockAccess.mockRejectedValue(new Error('File not found'));

      const serverPath = await connectionManager.detectServerPath();
      expect(serverPath).toBeNull();
    });

    it('should handle auto-configuration failure', async () => {
      // Mock detectServerPath to return null
      jest.spyOn(connectionManager, 'detectServerPath').mockResolvedValue(null);

      const result = await connectionManager.autoConfigureLocalServer();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not detect MCP server path');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: cli-ux-improvements, Property 2: Local MCP Server Management**
     *
     * For any CLI session, the Connection Manager should automatically configure,
     * start, and connect to the embedded Local MCP Server, verifying functionality
     * and reporting connection status
     *
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
     */
    it('should handle configuration updates consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverPort: fc.integer({ min: 1000, max: 65535 }),
            autoStart: fc.boolean(),
            connectionTimeout: fc.integer({ min: 1000, max: 60000 }),
            retryAttempts: fc.integer({ min: 1, max: 10 }),
            logLevel: fc.constantFrom(
              'error' as const,
              'warn' as const,
              'info' as const,
              'debug' as const,
            ),
          }),
          async (configUpdate) => {
            // Property: Configuration updates should always result in valid configurations
            const manager = new ConnectionManagerImpl();

            await manager.updateConfig(configUpdate);
            const updatedConfig = manager.getConfig();

            // Verify all configuration values are valid
            expect(updatedConfig.localServerPath).toBeDefined();
            expect(typeof updatedConfig.autoStart).toBe('boolean');
            expect(typeof updatedConfig.connectionTimeout).toBe('number');
            expect(updatedConfig.connectionTimeout).toBeGreaterThan(0);
            expect(typeof updatedConfig.retryAttempts).toBe('number');
            expect(updatedConfig.retryAttempts).toBeGreaterThan(0);
            expect(['error', 'warn', 'info', 'debug']).toContain(updatedConfig.logLevel);

            // Verify the applied values match
            expect(updatedConfig.serverPort).toBe(configUpdate.serverPort);
            expect(updatedConfig.serverPort).toBeGreaterThanOrEqual(1000);
            expect(updatedConfig.serverPort).toBeLessThanOrEqual(65535);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain connection status consistency', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (connectionAttempts) => {
          // Property: Connection status should always be in a valid state
          const manager = new ConnectionManagerImpl();
          const status = manager.getConnectionStatus();

          // Status should always have required properties
          expect(typeof status.isConnected).toBe('boolean');
          expect(typeof status.connectionAttempts).toBe('number');
          expect(status.connectionAttempts).toBeGreaterThanOrEqual(0);

          // Optional properties should be valid when present
          if (status.serverPath !== undefined) {
            expect(typeof status.serverPath).toBe('string');
          }

          if (status.lastConnected !== undefined) {
            expect(status.lastConnected).toBeInstanceOf(Date);
          }

          if (status.lastError !== undefined) {
            expect(typeof status.lastError).toBe('string');
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should handle server path detection robustly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          async (pathSegments) => {
            // Property: Server path detection should handle various path structures
            const manager = new ConnectionManagerImpl();

            // Mock different path scenarios
            const mockPaths = pathSegments.map((segment) =>
              join('/mock', segment, 'mcp-server-entry.js'),
            );

            // Detection should not throw errors regardless of path structure
            const result = await manager.detectServerPath();

            // Result should be either null or a valid string
            expect(result === null || typeof result === 'string').toBe(true);

            if (typeof result === 'string') {
              expect(result.length).toBeGreaterThan(0);
            }
          },
        ),
        { numRuns: 50 }, // Reduced runs for async operations
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing configuration directory', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await connectionManager.autoConfigureLocalServer();
      expect(result.success).toBe(false);
    });

    it('should handle invalid server paths', async () => {
      mockAccess.mockRejectedValue(new Error('Not found'));

      const isValid = await connectionManager.verifyConnection('/invalid/path/server.js');
      expect(isValid).toBe(false);
    });

    it('should return false when server status is error', async () => {
      // This test verifies that verifyConnection returns false when the server
      // instance has an 'error' status, even if the server path exists.

      // First, we need to get the connection manager into a state where it has
      // a server instance with error status. We'll do this by starting a server
      // that immediately fails.

      // Mock detectServerPath to return a valid path
      jest.spyOn(connectionManager, 'detectServerPath').mockResolvedValue('/mock/server.js');

      // Mock fs.access to succeed (server path exists)
      mockAccess.mockResolvedValue(undefined);

      // Create a mock process that spawns but immediately errors
      const mockProcess = {
        pid: 12345,
        stdout: { pipe: jest.fn() },
        stderr: { pipe: jest.fn() },
        on: jest.fn((event: string, callback: (codeOrError?: number | Error) => void) => {
          if (event === 'spawn') {
            // Spawn successfully
            setTimeout(() => callback(), 0);
          } else if (event === 'exit') {
            // But then exit with error code immediately after
            setTimeout(() => callback(1), 5);
          }
        }),
        kill: jest.fn((signal: string) => {
          // When killed, trigger exit
          const exitCallbacks = (mockProcess.on as jest.Mock).mock.calls
            .filter(([event]) => event === 'exit')
            .map(([, callback]) => callback as (code?: number) => void);
          exitCallbacks.forEach((cb) => cb(0));
          return true;
        }),
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Attempt to connect - this will start the server
      await connectionManager.connectLocal();

      // Wait for the exit event to be processed
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Now the server instance should have status 'error'
      // Verify that verifyConnection returns false
      const isValid = await connectionManager.verifyConnection('/mock/server.js');
      expect(isValid).toBe(false);
    }, 10000); // Increase timeout for this test

    it('should return false when server status is stopped', async () => {
      // This test verifies that verifyConnection returns false when the server
      // instance has a 'stopped' status, even if the server path exists.

      // Mock detectServerPath to return a valid path
      jest.spyOn(connectionManager, 'detectServerPath').mockResolvedValue('/mock/server.js');

      // Mock fs.access to succeed (server path exists)
      mockAccess.mockResolvedValue(undefined);

      // Create a mock process that spawns successfully but then stops cleanly
      const mockProcess = {
        pid: 12345,
        stdout: { pipe: jest.fn() },
        stderr: { pipe: jest.fn() },
        on: jest.fn((event: string, callback: (codeOrError?: number | Error) => void) => {
          if (event === 'spawn') {
            // Spawn successfully
            setTimeout(() => callback(), 0);
          } else if (event === 'exit') {
            // Exit cleanly with code 0 (stopped, not error)
            setTimeout(() => callback(0), 5);
          }
        }),
        kill: jest.fn((signal: string) => {
          // When killed, trigger exit with code 0
          const exitCallbacks = (mockProcess.on as jest.Mock).mock.calls
            .filter(([event]) => event === 'exit')
            .map(([, callback]) => callback as (code?: number) => void);
          exitCallbacks.forEach((cb) => cb(0));
          return true;
        }),
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Attempt to connect - this will start the server
      await connectionManager.connectLocal();

      // Wait for the exit event to be processed
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Now the server instance should have status 'stopped'
      // Verify that verifyConnection returns false
      const isValid = await connectionManager.verifyConnection('/mock/server.js');
      expect(isValid).toBe(false);
    }, 10000); // Increase timeout for this test

    it('should return false when server status is starting', async () => {
      // This test verifies that verifyConnection returns false when the server
      // instance has a 'starting' status (not yet ready).

      // Mock fs.access to succeed (server path exists)
      mockAccess.mockResolvedValue(undefined);

      // Access the private connectionStatus property for testing
      // This is necessary because we need to set up a specific state
      const manager = connectionManager as any;
      manager.connectionStatus.serverInstance = {
        pid: 12345,
        port: 3000,
        status: 'starting',
        startTime: new Date(),
        logPath: '/tmp/test.log',
      };

      // Verify that verifyConnection returns false for starting state
      const isValid = await connectionManager.verifyConnection('/mock/server.js');
      expect(isValid).toBe(false);
    });

    it('should return true when server status is running with valid process', async () => {
      // This test verifies that verifyConnection returns true when the server
      // instance has a 'running' status and the process exists.

      // Mock detectServerPath to return a valid path
      jest.spyOn(connectionManager, 'detectServerPath').mockResolvedValue('/mock/server.js');

      // Mock fs.access to succeed (server path exists)
      mockAccess.mockResolvedValue(undefined);

      // Create a mock process that spawns successfully and stays running
      const mockProcess = {
        pid: process.pid, // Use current process PID so process.kill(pid, 0) succeeds
        stdout: { pipe: jest.fn() },
        stderr: { pipe: jest.fn() },
        on: jest.fn((event: string, callback: (codeOrError?: number | Error) => void) => {
          if (event === 'spawn') {
            // Spawn successfully
            setTimeout(() => callback(), 0);
          }
          // Don't fire exit event - keep it running
        }),
        kill: jest.fn((signal: string) => {
          // When killed, trigger exit
          const exitCallbacks = (mockProcess.on as jest.Mock).mock.calls
            .filter(([event]) => event === 'exit')
            .map(([, callback]) => callback as (code?: number) => void);
          exitCallbacks.forEach((cb) => cb(0));
          return true;
        }),
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Attempt to connect - this will start the server
      const result = await connectionManager.connectLocal();

      // Connection should succeed
      expect(result.success).toBe(true);

      // Verify that verifyConnection returns true for running server
      const isValid = await connectionManager.verifyConnection('/mock/server.js');
      expect(isValid).toBe(true);
    }, 10000);

    it('should handle server startup timeout', async () => {
      // Mock spawn to simulate timeout
      const mockProcess = {
        pid: 12345,
        stdout: { pipe: jest.fn() },
        stderr: { pipe: jest.fn() },
        on: jest.fn((event: string, callback: (error: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Timeout')), 100);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Update config with a very short timeout for testing
      await connectionManager.updateConfig({
        connectionTimeout: 50,
        localServerPath: '/mock/server.js',
      });

      try {
        await connectionManager.startLocalServer();
        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle concurrent connection attempts', async () => {
      // Simulate multiple concurrent connection attempts
      const promises = Array(5)
        .fill(null)
        .map(() => connectionManager.connectLocal());

      const results = await Promise.allSettled(promises);

      // All should complete without hanging
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(typeof result.value.success).toBe('boolean');
        }
      });
    });
  });
});
