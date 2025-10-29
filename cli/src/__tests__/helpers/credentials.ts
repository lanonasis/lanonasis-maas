/**
 * Test credentials helper
 * 
 * Loads test credentials from environment variables or ~/.maas/config.json
 * 
 * To run integration tests with real server validation:
 * 1. Set TEST_VENDOR_KEY environment variable OR
 * 2. Ensure you're authenticated with `lanonasis auth login`
 * 
 * Tests will gracefully skip server validation if credentials are not available.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface TestCredentials {
    vendorKey?: string;
    token?: string;
    hasCredentials: boolean;
}

export async function getTestCredentials(): Promise<TestCredentials> {
    // First check environment variables
    if (process.env.TEST_VENDOR_KEY) {
        return {
            vendorKey: process.env.TEST_VENDOR_KEY,
            token: process.env.TEST_JWT_TOKEN,
            hasCredentials: true
        };
    }

    // Try to load from user's config
    try {
        const configPath = path.join(os.homedir(), '.maas', 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);

        if (config.vendorKey || config.token) {
            return {
                vendorKey: config.vendorKey,
                token: config.token,
                hasCredentials: true
            };
        }
    } catch {
        // Config file doesn't exist or is invalid
    }

    return {
        hasCredentials: false
    };
}

export function skipIfNoCredentials(testCredentials: TestCredentials): void {
    if (!testCredentials.hasCredentials) {
        console.warn(`
⚠️  Skipping server validation tests - no credentials available
   
   To enable these tests:
   1. Run: lanonasis auth login
   2. Or set TEST_VENDOR_KEY environment variable
    `);
    }
}
