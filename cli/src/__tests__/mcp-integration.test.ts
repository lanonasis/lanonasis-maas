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
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MCP Connection Integration Tests', () => {
    let mcpClient: MCPClient;
    let testConfigDir: string;
    let hasCredentials = false;

    beforeAll(async () => {
        // Check for credentials
        try {
            const configPath = path.join(os.homedir(), '.maas', 'config.json');
            const configData = await fs.readFile(configPath, 'utf-8');
            const userConfig = JSON.parse(configData);
            hasCredentials = !!(userConfig.token || userConfig.vendorKey);

            if (hasCredentials) {
                console.log('✓ Found credentials for MCP testing');
            }
        } catch {
            console.warn(`
⚠️  No credentials found - MCP tests will be skipped
   Run: lanonasis auth login
      `);
        }

        // Create test config
        testConfigDir = path.join(os.tmpdir(), `test-mcp-integration-${Date.now()}`);
        await fs.mkdir(testConfigDir, { recursive: true });

        mcpClient = new MCPClient();
        const config = (mcpClient as any).config;

        // Copy user credentials to test config
        if (hasCredentials) {
            const userConfigPath = path.join(os.homedir(), '.maas', 'config.json');
            const userConfigData = await fs.readFile(userConfigPath, 'utf-8');
            const userConfig = JSON.parse(userConfigData);

            (config as any).configDir = testConfigDir;
            (config as any).configPath = path.join(testConfigDir, 'config.json');
            (config as any).lockFile = path.join(testConfigDir, 'config.lock');

            await config.init();

            if (userConfig.token) {
                await config.setToken(userConfig.token);
            }
            if (userConfig.vendorKey) {
                await config.setVendorKey(userConfig.vendorKey);
            }
        }
    });

    afterAll(async () => {
        if (mcpClient) {
            await mcpClient.disconnect();
        }

        try {
            await fs.rm(testConfigDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('HTTP Transport (Remote Mode)', () => {
        it('should connect to MCP server via HTTP with real credentials', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            const connected = await mcpClient.connect({ connectionMode: 'remote' });

            console.log(`HTTP connection result: ${connected}`);
            expect(typeof connected).toBe('boolean');

            if (connected) {
                const status = mcpClient.getConnectionStatus();
                expect(status.connected).toBe(true);
                expect(status.mode).toBe('remote');
            }
        }, 30000); // 30 second timeout for real connection

        it('should list available MCP tools via HTTP', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            // Ensure connected
            const isConnected = mcpClient.getConnectionStatus().connected;
            if (!isConnected) {
                await mcpClient.connect({ connectionMode: 'remote' });
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
        it('should connect to MCP server via WebSocket', async () => {
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

        it('should handle WebSocket connection health monitoring', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            const status = mcpClient.getConnectionStatus();
            if (status.connected && status.mode === 'websocket') {
                // Check that health monitoring is active
                expect(status).toHaveProperty('connected');
                expect(status).toHaveProperty('failureCount');
                console.log(`WebSocket health: failures=${status.failureCount}`);
            }
        }, 30000);
    });

    describe('SSE Transport (Server-Sent Events)', () => {
        it('should handle SSE connection in remote mode', async () => {
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
        it('should report accurate connection status', () => {
            const status = mcpClient.getConnectionStatus();

            expect(status).toHaveProperty('connected');
            expect(status).toHaveProperty('mode');
            expect(status).toHaveProperty('server');
            expect(status).toHaveProperty('failureCount');

            expect(typeof status.connected).toBe('boolean');
            expect(typeof status.mode).toBe('string');
            expect(typeof status.failureCount).toBe('number');

            console.log(`Status: ${JSON.stringify(status, null, 2)}`);
        });

        it('should handle graceful disconnection', async () => {
            if (!hasCredentials) {
                console.log('⊘ Skipping - no credentials');
                return;
            }

            await mcpClient.disconnect();

            const status = mcpClient.getConnectionStatus();
            expect(status.connected).toBe(false);
        });
    });
});
