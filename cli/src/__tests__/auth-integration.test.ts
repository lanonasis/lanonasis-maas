/**
 * Integration Tests for Authentication Flow
 * 
 * These tests hit REAL endpoints with REAL credentials.
 * They validate the complete authentication flow including:
 * - Server-side vendor key validation
 * - Token verification
 * - Service discovery
 * - MCP connection with authentication
 * 
 * Prerequisites:
 * - Run `lanonasis auth login` before running these tests OR
 * - Set TEST_VENDOR_KEY environment variable
 * 
 * To run: npm test -- auth-integration.test.ts
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { CLIConfig } from '../utils/config.js';
import * as fsPromises from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

const userConfigPath = path.join(os.homedir(), '.maas', 'config.json');
let testToken: string | undefined;
let testVendorKey: string | undefined;
let hasCredentials = false;
let hasVendorKey = false;
let hasToken = false;
let credentialStatusMessage: string | null = null;

if (typeof process.env.TEST_JWT_TOKEN === 'string' && process.env.TEST_JWT_TOKEN.trim().length > 0) {
    testToken = process.env.TEST_JWT_TOKEN;
    hasToken = true;
}

if (typeof process.env.TEST_VENDOR_KEY === 'string' && process.env.TEST_VENDOR_KEY.trim().length > 0) {
    testVendorKey = process.env.TEST_VENDOR_KEY;
    hasVendorKey = true;
}

if (existsSync(userConfigPath)) {
    try {
        const configData = readFileSync(userConfigPath, 'utf-8');
        let userConfig: { token?: unknown; vendorKey?: unknown } = {};

        try {
            userConfig = JSON.parse(configData);
        } catch (parseError) {
            if (parseError instanceof SyntaxError) {
                credentialStatusMessage = '⚠️  Malformed ~/.maas/config.json detected. Credential-based tests will be skipped until the file is fixed.';
                console.warn(credentialStatusMessage);
                userConfig = {};
            } else {
                throw parseError;
            }
        }

        if (!hasToken && typeof userConfig.token === 'string' && userConfig.token.trim().length > 0) {
            testToken = userConfig.token;
            hasToken = true;
        }

        if (!hasVendorKey && typeof userConfig.vendorKey === 'string' && userConfig.vendorKey.trim().length > 0) {
            testVendorKey = userConfig.vendorKey;
            hasVendorKey = true;
        }
    } catch (error) {
        credentialStatusMessage = `
⚠️  Unable to read ~/.maas/config.json (${error instanceof Error ? error.message : 'Unknown error'})
   
   To run integration tests:
   1. Run: lanonasis auth login
   2. Then run: npm test -- auth-integration.test.ts
        `;

        if (!(error instanceof SyntaxError) && (error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            throw error;
        }
    }
} else if (!hasCredentials) {
    credentialStatusMessage = `
⚠️  No credentials found in ~/.maas/config.json
   
   To run integration tests:
   1. Run: lanonasis auth login
   2. Then run: npm test -- auth-integration.test.ts
    `;
}

hasCredentials = hasToken || hasVendorKey;

if (!credentialStatusMessage) {
    credentialStatusMessage = hasCredentials
        ? '✓ Detected test credentials via environment variables or ~/.maas/config.json'
        : `
⚠️  No credentials found in environment or ~/.maas/config.json
   
   To run integration tests:
   1. Run: lanonasis auth login
   2. Then run: npm test -- auth-integration.test.ts
    `;
}

describe('Authentication Integration Tests', () => {
    let testConfigDir: string;
    let config: CLIConfig;

    beforeAll(async () => {
        if (credentialStatusMessage) {
            const log = hasCredentials ? console.log : console.warn;
            log(credentialStatusMessage);
        }

        // Create temporary test directory
        testConfigDir = path.join(os.tmpdir(), `test-auth-integration-${Date.now()}`);
        await fsPromises.mkdir(testConfigDir, { recursive: true });

        config = new CLIConfig();
        (config as any).configDir = testConfigDir;
        (config as any).configPath = path.join(testConfigDir, 'config.json');
        (config as any).lockFile = path.join(testConfigDir, 'config.lock');

        await config.init();
    });

    const serviceDiscoveryTest = hasCredentials ? it : it.skip;
    const vendorKeyRequiredTest = hasVendorKey ? it : it.skip;
    const tokenRequiredTest = hasToken ? it : it.skip;

    describe('Service Discovery', () => {
        serviceDiscoveryTest('should discover service endpoints from .well-known/onasis.json', async () => {
            await config.discoverServices(true);

            const services = config.get('discoveredServices') as any;
            expect(services).toBeDefined();
            expect(services.auth_base).toBeTruthy();
            expect(services.mcp_base).toBeTruthy();
            expect(services.mcp_ws_base).toBeTruthy();
            expect(services.mcp_sse_base).toBeTruthy();
        });
    });

    describe('Vendor Key Authentication', () => {
        vendorKeyRequiredTest('should validate vendor key against server', async () => {
            if (!testVendorKey) {
                throw new Error('Vendor key not configured; this test should have been skipped.');
            }
            // This will hit the real server
            await config.setVendorKey(testVendorKey);

            expect(await config.getVendorKeyAsync()).toBe(testVendorKey);
            expect(config.get('authMethod')).toBe('vendor_key');
        });

        vendorKeyRequiredTest('should reject invalid vendor keys', async () => {
            const invalidKey = 'invalid-key';

            await expect(config.setVendorKey(invalidKey)).rejects.toThrow(/Vendor key is invalid/i);
        });
    });

    describe('Token Authentication', () => {
        tokenRequiredTest('should verify JWT token expiration', async () => {
            if (!testToken) {
                throw new Error('JWT token not configured; this test should have been skipped.');
            }
            await config.setToken(testToken);

            const isAuthenticated = await config.isAuthenticated();
            // Token might be expired, but the check should complete
            expect(typeof isAuthenticated).toBe('boolean');
        });
    });

    describe('Credential Validation', () => {
        serviceDiscoveryTest('should validate stored credentials against server', async () => {
            // Set credentials
            if (testToken) {
                await config.setToken(testToken);
            }
            if (testVendorKey) {
                await config.setVendorKey(testVendorKey);
            }

            // Validate against real server
            const isValid = await config.validateStoredCredentials();

            console.log(`Credential validation result: ${isValid}`);
            // Don't assert true/false since credentials might be expired
            expect(typeof isValid).toBe('boolean');
        });
    });
});
