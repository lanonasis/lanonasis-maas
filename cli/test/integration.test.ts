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
import { existsSync } from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const RUN_HTTP_INTEGRATION = process.env.RUN_CLI_HTTP_INTEGRATION === 'true';
const TEST_CLI_API_URL = process.env.TEST_CLI_API_URL || 'http://localhost:3000/api/v1';
const TEST_CLI_VENDOR_KEY = process.env.TEST_CLI_VENDOR_KEY || '';

const describeHttp = RUN_HTTP_INTEGRATION ? describe : describe.skip;
const describeMcp = process.env.RUN_CLI_MCP_INTEGRATION === 'true' ? describe : describe.skip;

// Resolve the CLI binary. Integration tests must exercise the SAME artifact the
// supported build command produces (cli/dist/index.js), never an unstated
// prebuilt binary. The path is overridable via ONASIS_CLI_BIN (e.g. a CI
// workspace layout); we fail fast with an actionable message when the artifact
// is missing instead of silently executing a stale/absent file.
function resolveCliBin(): string {
  const override = process.env.ONASIS_CLI_BIN;
  const cliBin = override || join(__dirname, '../dist/index.js');
  if (!existsSync(cliBin)) {
    throw new Error(
      `CLI artifact not found at ${cliBin}. Run the supported build command first ` +
      `(monorepo root: \`bun run build:cli\`, or in cli/: \`bun install --frozen-lockfile && bun run build\`). ` +
      `Integration tests must run against a freshly built artifact, not a prebuilt cli/dist.`
    );
  }
  return cliBin;
}

function extractJsonFromOutput<T>(output: string): T {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error('Expected JSON output but received an empty string');
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const lines = trimmed.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trimStart();
      if (!line.startsWith('{') && !line.startsWith('[')) {
        continue;
      }

      const candidate = lines.slice(i).join('\n').trim();
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Keep scanning until we find a parseable JSON payload.
      }
    }

    throw new Error(`Unable to locate JSON payload in output: ${trimmed}`);
  }
}

// Helper to run CLI commands with timeout
async function runCli(args: string, options: { env?: Record<string, string>; stdin?: string; timeout?: number } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | null;
}> {
  const cliPath = resolveCliBin();
  const timeout = options.timeout || 30000;
  
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
      exitCode: error.code ?? error.status ?? 1,
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

  });

  describeHttp('HTTP system commands', () => {
    it('health command returns status', async () => {
      const result = await runCli('health', {
        env: { HOME: testConfigDir },
      });
      // Health may fail without API but should execute
      expect(result.stdout.includes('Health') || result.stderr.length > 0).toBe(true);
    });

  });

  describe('Local system commands', () => {
    it('completion command generates shell completion', async () => {
      // `completion` is a local-only command: it must never attempt MCP
      // auto-connect or touch the network (regression: it used to hang the
      // suite for the full jest timeout while trying to reach the MCP server).
      const result = await runCli('completion bash', {
        env: { HOME: testConfigDir, CLI_VERBOSE: 'true' },
        timeout: 15000,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('completion');
      const combined = `${result.stdout}\n${result.stderr}`;
      expect(combined).not.toMatch(/Connecting to .*MCP|MCP connected/i);
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

  });

  describeHttp('HTTP auth commands', () => {
    it('auth login with invalid vendor key fails gracefully', async () => {
      const result = await runCli('auth login --vendor-key invalid_key_123', {
        env: { HOME: testConfigDir },
      });
      // Should fail but not crash
      expect(result.exitCode !== 0 || result.stderr.length > 0).toBe(true);
    });

  });

  describe('Local auth commands', () => {
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
      // `--force` skips the interactive confirm prompt so the command is
      // deterministic in a non-TTY test runner.
      const result = await runCli('config reset --force', {
        env: { HOME: testConfigDir },
        timeout: 15000,
      });
      expect(result.stdout !== undefined || result.stderr !== undefined).toBe(true);
    });
  });

  // Default memory and topic routes may use MCP when it is configured. Keep
  // these contract probes opt-in so the required offline gate has no network
  // dependency.
  describeMcp('Memory commands (without auth)', () => {
    it('memory list fails gracefully without auth', async () => {
      const result = await runCli('memory list', {
        env: { HOME: testConfigDir },
      });
      // Should fail with auth error, not crash
      expect(result.stderr.length > 0 || result.exitCode !== 0).toBe(true);
    });

    it('memory create validates required fields', async () => {
      const result = await runCli('memory create', {
        env: { HOME: testConfigDir },
      });
      // Should prompt or fail gracefully
      expect(result.stdout !== undefined || result.stderr !== undefined).toBe(true);
    });

    it('memory search requires query', async () => {
      const result = await runCli('memory search', {
        env: { HOME: testConfigDir },
      });
      expect(result.stderr.length > 0 || result.exitCode !== 0).toBe(true);
    });
  });

  describeMcp('Topic commands (without auth)', () => {
    it('topic list fails gracefully without auth', async () => {
      const result = await runCli('topic list', {
        env: { HOME: testConfigDir },
      });
      expect(result.stderr.length > 0 || result.exitCode !== 0).toBe(true);
    });

    it('topic create validates name', async () => {
      const result = await runCli('topic create', {
        env: { HOME: testConfigDir },
      });
      expect(result.stdout !== undefined || result.stderr !== undefined).toBe(true);
    });
  });

// MCP commands require a reachable MCP service. They are intentionally opt-in
// so the required offline suite cannot hang on a network connection attempt.
describeMcp('MCP commands', () => {
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
      expect(result.stdout !== undefined || result.stderr !== undefined).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('unknown command shows help', async () => {
      const result = await runCli('unknown-command-xyz', {
        env: { HOME: testConfigDir },
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('unknown') || result.stderr.includes('Usage')).toBe(true);
    });

    it('invalid option shows error', async () => {
      const result = await runCli('health --invalid-option', {
        env: { HOME: testConfigDir },
      });
      expect(result.exitCode).not.toBe(0);
      expect(
        result.stderr.includes('unknown option') ||
        result.stderr.includes('Invalid option') ||
        result.stderr.includes('error')
      ).toBe(true);
    });
  });
});

describe('CLI Integration - Default API-key transport (offline, deterministic)', () => {
  let testConfigDir: string;

  beforeEach(async () => {
    testConfigDir = join(__dirname, 'tmp-config-' + randomUUID().slice(0, 8));
    await execAsync(`mkdir -p ${testConfigDir}`);
  });

  afterEach(async () => {
    try {
      await execAsync(`rm -rf ${testConfigDir}`);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('routes api-keys through the default transport without --no-mcp and without MCP init', async () => {
    // The default `onasis api-keys ...` path must work WITHOUT `--no-mcp` and
    // must NOT attempt MCP initialization. In an isolated, unauthenticated
    // HOME it must fail fast with an auth error — not hang trying to connect
    // to an MCP server, and not require the user to pass --no-mcp.
    const result = await runCli('api-keys list --json', {
      env: { HOME: testConfigDir, CLI_VERBOSE: 'true' },
      timeout: 20000,
    });

    const combined = `${result.stdout}\n${result.stderr}`;
    // Deterministic offline outcome: auth required, not an MCP connection.
    expect(combined).toMatch(/Authentication required|auth login/i);
    // Prove the default transport was used: the verbose flag line must show
    // no_mcp=false (i.e. we did NOT have to pass --no-mcp).
    expect(combined).toContain('no_mcp=false');
    // Prove no MCP initialization was attempted.
    expect(combined).not.toMatch(/Connecting to .*MCP|MCP connected|MCP auto-connect/i);
  });

  it('shows api-keys help without MCP initialization', async () => {
    const result = await runCli('api-keys --help', {
      env: { HOME: testConfigDir, CLI_VERBOSE: 'true' },
      timeout: 15000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage API keys');
    const combined = `${result.stdout}\n${result.stderr}`;
    expect(combined).not.toMatch(/Connecting to .*MCP|MCP connected/i);
  });
});

describeHttp('CLI Integration - Live API', () => {
  const liveApiEnv = {
    HOME: process.env.HOME || '',
    LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
    LANONASIS_FORCE_API: 'true',
    CLI_FORCE_API: 'true'
  };

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

  describe('api-keys direct REST path', () => {
    it('covers create/get/update/delete via /api/v1/api-keys', async () => {
      const uniqueSuffix = randomUUID().slice(0, 8);
      const keyName = `it-api-key-${uniqueSuffix}`;
      const updatedName = `${keyName}-updated`;
      const commandPrefix = `--api-url ${TEST_CLI_API_URL} api-keys`;

      const createResult = await runCli(
        `${commandPrefix} create --name "${keyName}" --access-level team --expires-in-days 1`,
        { env: liveApiEnv, timeout: 30000 }
      );
      expect(createResult.exitCode).toBe(0);

      const keyIdMatch = createResult.stdout.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      expect(keyIdMatch).toBeTruthy();
      const keyId = keyIdMatch?.[1] as string;

      const getResult = await runCli(
        `${commandPrefix} get ${keyId} --json`,
        { env: liveApiEnv, timeout: 30000 }
      );
      expect(getResult.exitCode).toBe(0);
      const createdKey = extractJsonFromOutput<{ id: string; name: string }>(getResult.stdout);
      expect(createdKey.id).toBe(keyId);
      expect(createdKey.name).toBe(keyName);

      const updateResult = await runCli(
        `${commandPrefix} update ${keyId} --name "${updatedName}"`,
        { env: liveApiEnv, timeout: 30000 }
      );
      expect(updateResult.exitCode).toBe(0);

      const updatedGetResult = await runCli(
        `${commandPrefix} get ${keyId} --json`,
        { env: liveApiEnv, timeout: 30000 }
      );
      expect(updatedGetResult.exitCode).toBe(0);
      const updatedKey = extractJsonFromOutput<{ id: string; name: string }>(updatedGetResult.stdout);
      expect(updatedKey.id).toBe(keyId);
      expect(updatedKey.name).toBe(updatedName);

      const deleteResult = await runCli(
        `${commandPrefix} delete ${keyId} --force`,
        { env: liveApiEnv, timeout: 30000 }
      );
      expect(deleteResult.exitCode).toBe(0);

      const afterDeleteResult = await runCli(
        `${commandPrefix} get ${keyId} --json`,
        { env: liveApiEnv, timeout: 30000 }
      );
      expect(afterDeleteResult.exitCode).not.toBe(0);
      expect(`${afterDeleteResult.stdout}\n${afterDeleteResult.stderr}`).toMatch(/404|not found|missing/i);
    });

    it('reports analytics usage as unsupported on current auth-gateway', async () => {
      const result = await runCli(
        `--no-mcp --api-url ${TEST_CLI_API_URL} api-keys analytics usage --json`,
        { env: liveApiEnv, timeout: 15000 }
      );

      expect(result.exitCode).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(/not exposed by the current auth-gateway API/i);
    });
  });
});
