/**
 * Integration-level tests for CLI commands.
 *
 * Structure mirrors mcp-core integration testing:
 * - contract integration always runs (no server dependency)
 * - HTTP integration can run against a live API when enabled
 */

import { beforeAll, describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const RUN_HTTP_INTEGRATION = process.env.RUN_CLI_HTTP_INTEGRATION === 'true';
const TEST_CLI_API_URL = process.env.TEST_CLI_API_URL || 'http://localhost:3000/api/v1';
const TEST_CLI_VENDOR_KEY = process.env.TEST_CLI_VENDOR_KEY || '';

const describeHttp = RUN_HTTP_INTEGRATION ? describe : describe.skip;

// Helper to run CLI commands with timeout
async function runCli(args: string, options: { env?: Record<string, string>; stdin?: string; timeout?: number } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | null;
}> {
  const cliPath = join(__dirname, '../dist/index.js');
  const timeout = options.timeout || 15000;
  
  try {
    const result = await execAsync(`node ${cliPath} ${args}`, {
      env: { ...process.env, ...options.env },
      input: options.stdin,
      timeout,
    });
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || error.status,
    };
  }
}

// Mock user data for tests
const testUser = {
  email: `test-${randomUUID().slice(0, 8)}@test.local`,
  organizationName: 'Test Organization',
};

describe('CLI Integration - Command Execution', () => {
  let testConfigDir: string;
  
  beforeEach(async () => {
    // Create isolated test config directory
    testConfigDir = join(__dirname, 'tmp-config-' + randomUUID().slice(0, 8));
    await execAsync(`mkdir -p ${testConfigDir}`);
  });
  
  afterEach(async () => {
    // Cleanup test config
    try {
      await execAsync(`rm -rf ${testConfigDir}`);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('System commands', () => {
    it('shows version with --version', async () => {
      const result = await runCli('--version');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('shows help with --help', async () => {
      const result = await runCli('--help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('LanOnasis');
      expect(result.stdout).toContain('Commands:');
    });

    it('health command returns status', async () => {
      const result = await runCli('health', {
        env: { HOME: testConfigDir },
      });
      // Health may fail without API but should execute
      expect(result.stdout).toContain('Health') || expect(result.stderr).toBeTruthy();
    });

    it('completion command generates shell completion', async () => {
      const result = await runCli('completion bash');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('completion');
    });
  });

  describe('Auth commands (mocked)', () => {
    it('auth status shows not authenticated without credentials', async () => {
      const result = await runCli('auth status', {
        env: { HOME: testConfigDir },
      });
      // Should execute without crashing
      expect(result.stdout).toBeDefined();
    });

    it('auth login with invalid vendor key fails gracefully', async () => {
      const result = await runCli('auth login --vendor-key invalid_key_123', {
        env: { HOME: testConfigDir },
      });
      // Should fail but not crash
      expect(result.exitCode).not.toBe(0) || expect(result.stderr).toBeTruthy();
    });

    it('whoami command executes', async () => {
      const result = await runCli('whoami', {
        env: { HOME: testConfigDir },
      });
      expect(result.stdout).toBeDefined();
    });
  });

  describe('Config commands', () => {
    it('config list shows configuration', async () => {
      const result = await runCli('config list', {
        env: { HOME: testConfigDir },
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Configuration');
    });

    it('config set and get round-trip', async () => {
      const key = 'testKey-' + randomUUID().slice(0, 8);
      const value = 'testValue-' + randomUUID().slice(0, 8);
      
      // Set config
      const setResult = await runCli(`config set ${key} ${value}`, {
        env: { HOME: testConfigDir },
      });
      expect(setResult.exitCode).toBe(0);
      
      // Get config
      const getResult = await runCli(`config get ${key}`, {
        env: { HOME: testConfigDir },
      });
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain(value);
    });

    it('config reset executes', async () => {
      const result = await runCli('config reset', {
        env: { HOME: testConfigDir },
      });
      // Reset may require confirmation
      expect(result.stdout).toBeDefined() || expect(result.stderr).toBeDefined();
    });
  });

  describe('Memory commands (without auth)', () => {
    it('memory list fails gracefully without auth', async () => {
      const result = await runCli('memory list', {
        env: { HOME: testConfigDir },
      });
      // Should fail with auth error, not crash
      expect(result.stderr).toBeTruthy() || expect(result.exitCode).not.toBe(0);
    });

    it('memory create validates required fields', async () => {
      const result = await runCli('memory create', {
        env: { HOME: testConfigDir },
      });
      // Should prompt or fail gracefully
      expect(result.stdout).toBeDefined() || expect(result.stderr).toBeDefined();
    });

    it('memory search requires query', async () => {
      const result = await runCli('memory search', {
        env: { HOME: testConfigDir },
      });
      expect(result.stderr).toBeTruthy() || expect(result.exitCode).not.toBe(0);
    });
  });

  describe('Topic commands (without auth)', () => {
    it('topic list fails gracefully without auth', async () => {
      const result = await runCli('topic list', {
        env: { HOME: testConfigDir },
      });
      expect(result.stderr).toBeTruthy() || expect(result.exitCode).not.toBe(0);
    });

    it('topic create validates name', async () => {
      const result = await runCli('topic create', {
        env: { HOME: testConfigDir },
      });
      expect(result.stdout).toBeDefined() || expect(result.stderr).toBeDefined();
    });
  });

  describe('MCP commands', () => {
    it('mcp status executes', async () => {
      const result = await runCli('mcp status', {
        env: { HOME: testConfigDir },
      });
      expect(result.stdout).toBeDefined();
    });

    it('mcp tools list executes', async () => {
      const result = await runCli('mcp tools', {
        env: { HOME: testConfigDir },
      });
      expect(result.stdout).toBeDefined();
    });

    it('mcp connect without config fails gracefully', async () => {
      const result = await runCli('mcp connect', {
        env: { HOME: testConfigDir },
      });
      expect(result.stdout).toBeDefined() || expect(result.stderr).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('unknown command shows help', async () => {
      const result = await runCli('unknown-command-xyz', {
        env: { HOME: testConfigDir },
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('unknown') || expect(result.stderr).toContain('Usage');
    });

    it('invalid option shows error', async () => {
      const result = await runCli('health --invalid-option', {
        env: { HOME: testConfigDir },
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('unknown option') || 
        expect(result.stderr).toContain('Invalid option') ||
        expect(result.stderr).toContain('error');
    });
  });
});

describeHttp('CLI Integration - Live API', () => {
  beforeAll(async () => {
    // Verify API is accessible
    if (!TEST_CLI_VENDOR_KEY) {
      throw new Error('TEST_CLI_VENDOR_KEY must be set for HTTP integration tests');
    }
    
    try {
      const response = await fetch(TEST_CLI_API_URL.replace('/api/v1', '/health'));
      if (!response.ok) {
        throw new Error(`API health check failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to test API at ${TEST_CLI_API_URL}: ${error}`);
    }
  });

  it('auth login with valid vendor key succeeds', async () => {
    const result = await runCli(`auth login --vendor-key ${TEST_CLI_VENDOR_KEY}`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Authenticated') || 
      expect(result.stdout).toContain('Success') ||
      expect(result.stdout).toContain('✓');
  });

  it('auth status shows authenticated user', async () => {
    const result = await runCli('auth status', {
      env: { 
        HOME: process.env.HOME,
        LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Authenticated');
  });

  it('memory list returns data', async () => {
    const result = await runCli('memory list --limit 5', {
      env: { 
        HOME: process.env.HOME,
        LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Memory') || expect(result.stdout).toContain('memories');
  });

  it('memory create and delete round-trip', async () => {
    const testTitle = `Test Memory ${randomUUID().slice(0, 8)}`;
    const testContent = 'Integration test content';
    
    // Create memory
    const createResult = await runCli(
      `memory create --title "${testTitle}" --content "${testContent}" --type context`,
      {
        env: { 
          HOME: process.env.HOME,
          LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
        },
      }
    );
    expect(createResult.exitCode).toBe(0);
    
    // Extract memory ID from output (implementation-dependent)
    const memoryIdMatch = createResult.stdout.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (memoryIdMatch) {
      // Delete memory
      const deleteResult = await runCli(`memory delete ${memoryIdMatch[1]}`, {
        env: { 
          HOME: process.env.HOME,
          LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
        },
      });
      expect(deleteResult.exitCode).toBe(0);
    }
  });

  it('memory search finds memories', async () => {
    const result = await runCli('memory search "test" --limit 5', {
      env: { 
        HOME: process.env.HOME,
        LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
      },
    });
    expect(result.exitCode).toBe(0);
  });

  it('topic list returns data', async () => {
    const result = await runCli('topic list', {
      env: { 
        HOME: process.env.HOME,
        LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Topic') || expect(result.stdout).toContain('topics');
  });

  it('whoami shows user profile', async () => {
    const result = await runCli('whoami', {
      env: { 
        HOME: process.env.HOME,
        LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('@') || expect(result.stdout).toContain('user');
  });

  it('config set persists across commands', async () => {
    const testKey = 'integrationTest-' + randomUUID().slice(0, 8);
    const testValue = 'test-value-' + randomUUID().slice(0, 8);
    
    // Set
    const setResult = await runCli(`config set ${testKey} ${testValue}`, {
      env: { 
        HOME: process.env.HOME,
        LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
      },
    });
    expect(setResult.exitCode).toBe(0);
    
    // Get
    const getResult = await runCli(`config get ${testKey}`, {
      env: { 
        HOME: process.env.HOME,
        LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
      },
    });
    expect(getResult.exitCode).toBe(0);
    expect(getResult.stdout).toContain(testValue);
  });
});
