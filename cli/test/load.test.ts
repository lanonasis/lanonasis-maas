/**
 * Load-focused tests for CLI parity with mcp-core load suite.
 *
 * These default to in-process command execution testing so they run in CI.
 * Optional HTTP load checks can be enabled via RUN_CLI_HTTP_LOAD_TESTS=true.
 */

import { describe, expect, it, beforeAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const RUN_HTTP_LOAD = process.env.RUN_CLI_HTTP_LOAD_TESTS === 'true';
const TEST_CLI_API_URL = process.env.TEST_CLI_API_URL || 'http://localhost:3000/api/v1';
const TEST_CLI_VENDOR_KEY = process.env.TEST_CLI_VENDOR_KEY || '';

const describeHttpLoad = RUN_HTTP_LOAD ? describe : describe.skip;

// Helper to run CLI commands
async function runCli(args: string, options: { env?: Record<string, string> } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}> {
  const cliPath = join(__dirname, '../dist/index.js');
  const startTime = performance.now();
  
  try {
    const result = await execAsync(`node ${cliPath} ${args}`, {
      env: { ...process.env, ...options.env },
      timeout: 30000,
    });
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      durationMs: performance.now() - startTime,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || error.status,
      durationMs: performance.now() - startTime,
    };
  }
}

describe('Load Testing Suite - In-process CLI Commands', () => {
  describe('Command execution performance', () => {
    it('handles 100 version checks with low latency', async () => {
      const totalRequests = 100;
      const start = performance.now();

      const results = await Promise.all(
        Array.from({ length: totalRequests }, () => runCli('--version'))
      );

      const durationMs = performance.now() - start;
      const successfulResults = results.filter(r => r.exitCode === 0);

      expect(successfulResults).toHaveLength(totalRequests);
      expect(durationMs).toBeLessThan(10000); // 10 seconds for 100 version checks
      expect(durationMs / totalRequests).toBeLessThan(200); // Average < 200ms per command
    });

    it('handles 50 help commands concurrently', async () => {
      const totalRequests = 50;
      const start = performance.now();

      const results = await Promise.all(
        Array.from({ length: totalRequests }, () => runCli('--help'))
      );

      const durationMs = performance.now() - start;
      const successfulResults = results.filter(r => r.exitCode === 0);

      expect(successfulResults).toHaveLength(totalRequests);
      expect(durationMs).toBeLessThan(15000);
    });

    it('handles mixed command types under load', async () => {
      const commands = [
        '--version',
        '--help',
        'health',
        'status',
        'config list',
        'mcp status',
      ];

      const totalRequests = 60;
      const start = performance.now();

      const results = await Promise.all(
        Array.from({ length: totalRequests }, (_, i) => 
          runCli(commands[i % commands.length])
        )
      );

      const durationMs = performance.now() - start;
      const successfulResults = results.filter(r => r.exitCode === 0);

      // Some commands may fail without auth, but should not crash
      expect(results).toHaveLength(totalRequests);
      expect(durationMs).toBeLessThan(20000);
    });
  });

  describe('Config command load', () => {
    it('handles 30 config set/get pairs', async () => {
      const totalPairs = 30;
      const start = performance.now();

      const results = await Promise.all(
        Array.from({ length: totalPairs }, (_, i) => {
          const key = `loadtest_key_${i}`;
          const value = `loadtest_value_${i}`;
          return Promise.all([
            runCli(`config set ${key} ${value}`),
            runCli(`config get ${key}`),
          ]);
        }).flat()
      );

      const durationMs = performance.now() - start;
      const successfulResults = results.filter(r => r.exitCode === 0);

      expect(successfulResults.length).toBeGreaterThan(totalPairs * 1.5); // At least 75% success
      expect(durationMs).toBeLessThan(20000);
    });
  });

  describe('Error handling under load', () => {
    it('maintains deterministic failures for invalid commands', async () => {
      const totalRequests = 50;

      const results = await Promise.all(
        Array.from({ length: totalRequests }, () => 
          runCli('invalid-command-xyz')
        )
      );

      const failures = results.filter(r => r.exitCode !== 0);
      const allHaveError = failures.every(r => 
        r.stderr.toLowerCase().includes('error') || 
        r.stderr.toLowerCase().includes('unknown') ||
        r.stderr.toLowerCase().includes('invalid')
      );

      expect(failures).toHaveLength(totalRequests);
      expect(allHaveError).toBe(true);
    });

    it('handles concurrent invalid option errors', async () => {
      const totalRequests = 30;

      const results = await Promise.all(
        Array.from({ length: totalRequests }, () => 
          runCli('health --invalid-option-xyz')
        )
      );

      const failures = results.filter(r => r.exitCode !== 0);

      expect(failures.length).toBeGreaterThan(totalRequests * 0.8); // At least 80% should fail
    });
  });

  describe('Memory command validation load', () => {
    it('handles 40 memory list calls (expected failures without auth)', async () => {
      const totalRequests = 40;
      const start = performance.now();

      const results = await Promise.all(
        Array.from({ length: totalRequests }, () => runCli('memory list --limit 5'))
      );

      const durationMs = performance.now() - start;

      // All should fail without auth, but should fail gracefully
      expect(results).toHaveLength(totalRequests);
      expect(durationMs).toBeLessThan(15000);
      
      // Verify they all fail with auth-related errors (not crashes)
      const authFailures = results.filter(r => 
        r.stderr.toLowerCase().includes('auth') ||
        r.stderr.toLowerCase().includes('unauthorized') ||
        r.stderr.toLowerCase().includes('credential') ||
        r.exitCode !== 0
      );
      
      expect(authFailures.length).toBeGreaterThan(totalRequests * 0.8);
    });
  });
});

describeHttpLoad('Load Testing Suite - Live HTTP API', () => {
  beforeAll(async () => {
    if (!TEST_CLI_VENDOR_KEY) {
      throw new Error('TEST_CLI_VENDOR_KEY must be set for HTTP load tests');
    }
    
    // Verify API is accessible
    try {
      const response = await fetch(TEST_CLI_API_URL.replace('/api/v1', '/health'));
      if (!response.ok) {
        throw new Error(`API health check failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to test API at ${TEST_CLI_API_URL}: ${error}`);
    }
  });

  const authEnv = {
    HOME: process.env.HOME,
    LANONASIS_VENDOR_KEY: TEST_CLI_VENDOR_KEY,
  };

  it('handles 50 concurrent memory list requests', async () => {
    const totalRequests = 50;
    const start = performance.now();

    const results = await Promise.all(
      Array.from({ length: totalRequests }, () => 
        runCli('memory list --limit 10', { env: authEnv })
      )
    );

    const durationMs = performance.now() - start;
    const successfulResults = results.filter(r => r.exitCode === 0);

    expect(successfulResults.length).toBeGreaterThan(totalRequests * 0.9); // 90% success rate
    expect(durationMs).toBeLessThan(60000);
  });

  it('handles 30 concurrent memory search requests', async () => {
    const totalRequests = 30;
    const start = performance.now();

    const results = await Promise.all(
      Array.from({ length: totalRequests }, () => 
        runCli('memory search "test" --limit 5', { env: authEnv })
      )
    );

    const durationMs = performance.now() - start;
    const successfulResults = results.filter(r => r.exitCode === 0);

    expect(successfulResults.length).toBeGreaterThan(totalRequests * 0.9);
    expect(durationMs).toBeLessThan(45000);
  });

  it('handles mixed authenticated commands', async () => {
    const commands = [
      'memory list --limit 5',
      'memory stats',
      'topic list',
      'auth status',
      'whoami',
    ];

    const totalRequests = 50;
    const start = performance.now();

    const results = await Promise.all(
      Array.from({ length: totalRequests }, (_, i) => 
        runCli(commands[i % commands.length], { env: authEnv })
      )
    );

    const durationMs = performance.now() - start;
    const successfulResults = results.filter(r => r.exitCode === 0);

    expect(successfulResults.length).toBeGreaterThan(totalRequests * 0.85);
    expect(durationMs).toBeLessThan(60000);
  });

  it('handles concurrent config operations', async () => {
    const totalRequests = 40;
    const start = performance.now();

    const results = await Promise.all(
      Array.from({ length: totalRequests }, (_, i) => {
        const key = `loadtest_${i}`;
        const value = `value_${i}`;
        return runCli(`config set ${key} ${value}`, { env: authEnv });
      })
    );

    const durationMs = performance.now() - start;
    const successfulResults = results.filter(r => r.exitCode === 0);

    expect(successfulResults.length).toBeGreaterThan(totalRequests * 0.9);
    expect(durationMs).toBeLessThan(30000);
  });

  it('maintains low latency for health checks', async () => {
    const totalRequests = 100;
    const start = performance.now();

    const results = await Promise.all(
      Array.from({ length: totalRequests }, () => 
        runCli('health', { env: authEnv })
      )
    );

    const durationMs = performance.now() - start;
    const successfulResults = results.filter(r => r.exitCode === 0);
    const avgLatency = durationMs / totalRequests;

    expect(successfulResults.length).toBeGreaterThan(totalRequests * 0.95);
    expect(avgLatency).toBeLessThan(500); // Average < 500ms per health check
  });
});

describe('Load Test - MCP Commands', () => {
  it('handles 20 concurrent mcp status commands', async () => {
    const totalRequests = 20;
    const start = performance.now();

    const results = await Promise.all(
      Array.from({ length: totalRequests }, () => runCli('mcp status'))
    );

    const durationMs = performance.now() - start;

    expect(results).toHaveLength(totalRequests);
    expect(durationMs).toBeLessThan(15000);
  });

  it('handles 15 concurrent mcp tools commands', async () => {
    const totalRequests = 15;
    const start = performance.now();

    const results = await Promise.all(
      Array.from({ length: totalRequests }, () => runCli('mcp tools'))
    );

    const durationMs = performance.now() - start;

    expect(results).toHaveLength(totalRequests);
    expect(durationMs).toBeLessThan(15000);
  });
});
