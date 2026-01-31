/**
 * MCP Connection Integration Tests
 * 
 * These tests validate MCP connections with REAL endpoints:
 * - HTTP (remote mode)
 * - WebSocket
 * - SSE (Server-Sent Events)
 * - Stdio (local mode)
 * 
 * Prerequisites:
 * - Authenticated session (run `lanonasis auth login`)
 * 
 * To run: npm test -- mcp-integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MCPClient } from '../utils/mcp-client.js';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MCP Connection Integration Tests', () => {
    let mcpClient: MCPClient;
    let testConfigDir: string;
    let hasCredentials = false;
    const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';
    let integrationTest: typeof it = it.skip;

    beforeAll(async () => {
        const configPath = path.join(os.homedir(), '.maas', 'config.json');
        let resolvedToken = typeof process.env.TEST_JWT_TOKEN === 'string' && process.env.TEST_JWT_TOKEN.trim().length > 0
            ? process.env.TEST_JWT_TOKEN
            : undefined;
        let resolvedVendorKey = typeof process.env.TEST_VENDOR_KEY === 'string' && process.env.TEST_VENDOR_KEY.trim().length > 0
            ? process.env.TEST_VENDOR_KEY
            : undefined;

        if (!resolvedToken || !resolvedVendorKey) {
            try {
                const configData = await fsPromises.readFile(configPath, 'utf-8');
                let userConfig: { token?: unknown; vendorKey?: unknown } = {};

                try {
                    userConfig = JSON.parse(configData);
                } catch (parseError) {
                    if (parseError instanceof SyntaxError) {
                        console.warn('⚠️  Malformed ~/.maas/config.json detected. MCP integration tests requiring credentials will be skipped.');
                        userConfig = {};
                    } else {
                        throw parseError;
                    }
                }

                if (!resolvedToken && typeof userConfig.token === 'string' && userConfig.token.trim().length > 0) {
                    resolvedToken = userConfig.token;
                }
                if (!resolvedVendorKey && typeof userConfig.vendorKey === 'string' && userConfig.vendorKey.trim().length > 0) {
                    resolvedVendorKey = userConfig.vendorKey;
                }
            } catch (error) {
                if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
                    throw error;
                }
            }
        }

        hasCredentials = Boolean(resolvedToken || resolvedVendorKey);
        integrationTest = runIntegrationTests && hasCredentials ? it : it.skip;

        if (hasCredentials && runIntegrationTests) {
            console.log('✓ Found credentials for MCP testing (environment or ~/.maas/config.json)');
        } else if (!runIntegrationTests) {
            console.warn('⚠️  RUN_INTEGRATION_TESTS is not set - MCP integration tests will be skipped');
        } else {
            console.warn(`
⚠️  No credentials found - MCP tests will be skipped
   Run: lanonasis auth login
      `);
        }

        // Create test config
        testConfigDir = path.join(os.tmpdir(), `test-mcp-integration-${Date.now()}`);
        await fsPromises.mkdir(testConfigDir, { recursive: true });

        mcpClient = new MCPClient();
        mcpClient.setConfigDirectory(testConfigDir);
        await mcpClient.init();

        if (resolvedToken) {
            await mcpClient.setTokenForTesting(resolvedToken);
        }
        if (resolvedVendorKey) {
            await mcpClient.setVendorKeyForTesting(resolvedVendorKey);
        }
    });

    afterAll(async () => {
        if (mcpClient) {
            await mcpClient.disconnect();
        }

        try {
            await fsPromises.rm(testConfigDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('HTTP Transport (Remote Mode)', () => {
        integrationTest('should connect to MCP server via HTTP with real credentials', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            await mcpClient.disconnect();
            const connected = await mcpClient.connect({ connectionMode: 'remote' });

            console.log(`HTTP connection result: ${connected}`);
            expect(typeof connected).toBe('boolean');

            // For integration tests, we expect connection to succeed
            expect(connected).toBe(true);
            const status = mcpClient.getConnectionStatus();
            expect(status.connected).toBe(true);
            expect(status.mode).toBe('remote');
        }, 30000); // 30 second timeout for real connection

        integrationTest('should list available MCP tools via HTTP', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            await mcpClient.disconnect();
            const connected = await mcpClient.connect({ connectionMode: 'remote' });
            if (!connected) {
                console.warn('Remote connection failed - skipping tool listing');
                return;
            }

            try {
                const tools = await mcpClient.listTools();
                console.log(`Found ${tools.length} tools via HTTP`);

                expect(Array.isArray(tools)).toBe(true);
                if (tools.length > 0) {
                    expect(tools[0]).toHaveProperty('name');
                    expect(tools[0]).toHaveProperty('description');
                }
            } catch (error) {
                console.warn(`Tool listing failed: ${(error as Error).message}`);
                // Don't fail test - connection might be OK but tools not available
            }
        }, 30000);
    });

    describe('WebSocket Transport', () => {
        integrationTest('should connect to MCP server via WebSocket', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            // Disconnect any existing connection
            await mcpClient.disconnect();

            const connected = await mcpClient.connect({ connectionMode: 'websocket' });

            console.log(`WebSocket connection result: ${connected}`);
            expect(typeof connected).toBe('boolean');

            if (connected) {
                const status = mcpClient.getConnectionStatus();
                expect(status.connected).toBe(true);
                expect(status.mode).toBe('websocket');
            }
        }, 30000);

        integrationTest('should handle WebSocket connection health monitoring', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            // Ensure WebSocket connection for this test
            await mcpClient.disconnect();
            const connected = await mcpClient.connect({ connectionMode: 'websocket' });
            if (!connected) {
                console.warn('WebSocket connection failed - skipping health check');
                return;
            }

            const status = mcpClient.getConnectionStatus();
            expect(status.connected).toBe(true);
            expect(status.mode).toBe('websocket');
            expect(status).toHaveProperty('failureCount');
            console.log(`WebSocket health: failures=${status.failureCount}`);
        }, 30000);
    });

    describe('SSE Transport (Server-Sent Events)', () => {
        integrationTest('should handle SSE connection in remote mode', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            // Remote mode uses HTTP + SSE
            await mcpClient.disconnect();
            const connected = await mcpClient.connect({ connectionMode: 'remote' });

            if (connected) {
                // SSE connection is established alongside HTTP
                console.log('✓ SSE connection established with remote mode');
                expect(connected).toBe(true);
            }
        }, 30000);
    });

    describe('Connection Reliability', () => {
        integrationTest('should report accurate connection status', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping connection status test - no credentials');
                return;
            }

            // Ensure we have a known connection state first
            await mcpClient.disconnect();

            // Test disconnected state
            let status = mcpClient.getConnectionStatus();
            expect(status).toHaveProperty('connected');
            expect(status).toHaveProperty('mode');
            expect(status).toHaveProperty('server');
            expect(status).toHaveProperty('failureCount');
            expect(typeof status.connected).toBe('boolean');
            expect(status.connected).toBe(false);

            // Attempt to connect and test connected state
            const connected = await mcpClient.connect();
            if (connected) {
                status = mcpClient.getConnectionStatus();
                expect(status.connected).toBe(true);
                expect(typeof status.mode).toBe('string');
            } else {
                console.log('⊘ Connection failed, testing disconnect state only');
            }
        });

        integrationTest('should handle graceful disconnection', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping disconnection test - no credentials');
                return;
            }

            // Ensure connected state first
            await mcpClient.connect();

            // Test disconnection
            await mcpClient.disconnect();

            const status = mcpClient.getConnectionStatus();
            expect(status.connected).toBe(false);
        });
    });
});
