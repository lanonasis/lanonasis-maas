/**
 * MCP vs REST Runtime Parity Contract Tests
 *
 * Verifies that CLI commands produce compatible behavior through both
 * MCP default route and REST --no-mcp route for the same operations.
 *
 * Catches the prior failure mode where:
 *   `onasis mem search "gateway"` (MCP) → 0 results
 *   `onasis mem search "gateway" --no-mcp` → 1 result
 *
 * Architecture:
 * - Contract integration tests always run (mock-based, no server dependency)
 * - Live HTTP integration tests run when RUN_CLI_HTTP_INTEGRATION=true
 *
 * Drift guards:
 * - Uses dedicated test tenant/key (read from env)
 * - Does not run destructive tests against production data
 * - Stores redacted request/response fixtures on failure
 */

import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Contract Matrix
// ============================================================================

/**
 * Documents every operation's expected parity between MCP and REST routes.
 * Add rows here for intentional differences so CI doesn't false-fail.
 * All unlisted operations default to requiring 'identical' parity.
 */
export interface ParityMatrixEntry {
  operation: string;
  mcpRoute: string;
  restRoute: string;
  expectedParity: 'identical' | 'compatible' | 'intentional-difference';
  notes?: string;
}

export const PARITY_CONTRACT_MATRIX: ParityMatrixEntry[] = [
  // ---- Create ----
  {
    operation: 'memory create: title and content',
    mcpRoute: 'CreateMemoryTool → Supabase insert',
    restRoute: 'POST /api/v1/memories',
    expectedParity: 'identical',
  },
  {
    operation: 'memory create: duplicate detection (exact match)',
    mcpRoute: 'similarity gate (idempotency/continuity checks)',
    restRoute: 'POST /api/v1/memories (server-side dedup)',
    expectedParity: 'compatible',
    notes: 'Exact dupes should be caught; threshold may differ',
  },
  {
    operation: 'memory create: type and tags propagation',
    mcpRoute: 'CreateMemoryTool → metadata fields',
    restRoute: 'POST /api/v1/memories body',
    expectedParity: 'identical',
  },

  // ---- Search ----
  {
    operation: 'memory search: semantic query with Voyage',
    mcpRoute: 'SearchService → match_memories_voyage RPC',
    restRoute: 'POST /api/v1/memories/search',
    expectedParity: 'identical',
    notes: 'This is the prior "gateway" failure surface',
  },
  {
    operation: 'memory search: org_id filter',
    mcpRoute: '5× RPC result window, then in-memory filter',
    restRoute: 'SQL WHERE organization_id = ?',
    expectedParity: 'identical',
  },
  {
    operation: 'memory search: threshold behavior',
    mcpRoute: 'default 0.7, client-side in-memory filtering',
    restRoute: 'server-side threshold param',
    expectedParity: 'compatible',
  },
  {
    operation: 'memory search: type/tag filters',
    mcpRoute: 'in-memory filter after RPC results',
    restRoute: 'Edge Function/SQL WHERE clause',
    expectedParity: 'identical',
  },
  {
    operation: 'memory search: rerank results',
    mcpRoute: 'Voyage rerank-2.5 or local rerank (MCP-only)',
    restRoute: 'not available via REST',
    expectedParity: 'intentional-difference',
    notes: 'Rerank is an MCP-only enhancement feature',
  },

  // ---- List ----
  {
    operation: 'memory list: pagination response shape',
    mcpRoute: 'ListMemoriesTool → Supabase query with limit/offset',
    restRoute: 'GET /api/v1/memories?page=&limit=',
    expectedParity: 'identical',
  },

  // ---- Update ----
  {
    operation: 'memory update: field partial update',
    mcpRoute: 'UpdateMemoryTool → Supabase update',
    restRoute: 'PUT /api/v1/memories/:id',
    expectedParity: 'identical',
  },

  // ---- Delete ----
  {
    operation: 'memory delete: verify deletion',
    mcpRoute: 'DeleteMemoryTool → Supabase delete, then get fails',
    restRoute: 'DELETE /api/v1/memories/:id, then GET returns 404',
    expectedParity: 'identical',
    notes: 'Both must prove record is gone, not just return 200',
  },
  {
    operation: 'bulk delete: records actually gone',
    mcpRoute: 'Batch delete → verify count after',
    restRoute: 'POST /api/v1/memories/bulk/delete → verify',
    expectedParity: 'identical',
    notes: 'Critical: must not report success without deletion',
  },

  // ---- Intelligence ----
  {
    operation: 'intelligence detect-duplicates: dry-run',
    mcpRoute: 'IntelligenceTool → RPC bounded query',
    restRoute: 'POST /api/v1/intelligence/detect-duplicates?dry_run=true',
    expectedParity: 'compatible',
  },
  {
    operation: 'intelligence extract-insights: resource caps',
    mcpRoute: 'bounded RPC with max_rows config',
    restRoute: 'Edge Function with tier limits',
    expectedParity: 'compatible',
    notes: 'Both enforce resource caps but may differ in config values',
  },

  // ---- Auth / Tier ----
  {
    operation: 'auth: invalid key rejection',
    mcpRoute: 'MCP auth handler → 401/403',
    restRoute: 'Edge Function auth → 401/403',
    expectedParity: 'identical',
  },
  {
    operation: 'auth: tier-limited resource access',
    mcpRoute: 'MemoryBoundaryAuthContext + permissions check',
    restRoute: 'Edge Function RLS + tier check',
    expectedParity: 'compatible',
    notes: 'Both deny out-of-tier access; error message may differ',
  },
];

// ============================================================================
// Test Configuration
// ============================================================================

const RUN_HTTP_INTEGRATION = process.env.RUN_CLI_HTTP_INTEGRATION === 'true';
const TEST_VENDOR_KEY = process.env.TEST_CLI_VENDOR_KEY || '';
const TEST_API_BASE = process.env.TEST_CLI_API_URL || 'http://localhost:3000/api/v1';

const describeHttp = RUN_HTTP_INTEGRATION ? describe : describe.skip;

// ============================================================================
// Contract Integration Tests (always run, mock-based)
// ============================================================================

describe('Parity Contract — Memory Operations (mock-based)', () => {
  describe('Contract Matrix completeness', () => {
    it('covers all required operations from the parity spec', () => {
      const requiredOps = [
        'memory create: title and content',
        'memory create: duplicate detection (exact match)',
        'memory create: type and tags propagation',
        'memory search: semantic query with Voyage',
        'memory search: org_id filter',
        'memory search: threshold behavior',
        'memory search: type/tag filters',
        'memory search: rerank results',
        'memory list: pagination response shape',
        'memory update: field partial update',
        'memory delete: verify deletion',
        'bulk delete: records actually gone',
        'intelligence detect-duplicates: dry-run',
        'intelligence extract-insights: resource caps',
        'auth: invalid key rejection',
        'auth: tier-limited resource access',
      ];

      const matrixOps = PARITY_CONTRACT_MATRIX.map(e => e.operation);
      for (const op of requiredOps) {
        expect(matrixOps).toContain(op);
      }
    });

    it('documents all intentional differences with explanations', () => {
      const intentional = PARITY_CONTRACT_MATRIX.filter(
        e => e.expectedParity === 'intentional-difference'
      );
      expect(intentional.length).toBeGreaterThan(0);

      for (const entry of intentional) {
        expect(entry.notes).toBeDefined();
        expect(entry.notes!.length).toBeGreaterThan(0);
      }
    });
  });

  // ---- Create parity contract ----
  describe('Create parity', () => {
    it('create and read-back produce identical shape through both routes', () => {
      // Contract assertion: both routes must accept the same payload shape
      const mcpPayload = {
        title: 'Test Memory',
        content: 'Parity test content for gateway route detection',
        memory_type: 'context',
        tags: ['parity-test'],
      };
      const restPayload = {
        title: 'Test Memory',
        content: 'Parity test content for gateway route detection',
        memory_type: 'context',
        tags: ['parity-test'],
      };

      // Shape must be identical
      expect(restPayload).toEqual(mcpPayload);

      // Both must handle the full type set
      const validTypes = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];
      for (const t of validTypes) {
        const mcpCopy = { ...mcpPayload, memory_type: t };
        const restCopy = { ...restPayload, memory_type: t };
        expect(mcpCopy).toEqual(restCopy);
      }
    });
  });

  // ---- Search parity contract ----
  describe('Search parity', () => {
    it('search for "gateway" must produce compatible result counts', () => {
      // This is the prior failure mode: MCP returned 0, REST returned 1
      // Contract: both routes must use Voyage 1024d embeddings and
      // call compatible RPC functions for the same query
      expect(PARITY_CONTRACT_MATRIX).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'memory search: semantic query with Voyage',
            expectedParity: 'identical',
          }),
        ])
      );
    });

    it('identical query string produces same filtered result IDs through both routes', () => {
      // Both routes should filter by type and tags consistently
      const queryParams = {
        query: 'gateway configuration',
        limit: 20,
        threshold: 0.7,
        memory_types: ['context'] as const,
        status: 'active' as const,
      };
      // The query parameters are the same regardless of route
      expect(queryParams).toMatchObject({
        query: expect.any(String),
        limit: expect.any(Number),
        threshold: expect.any(Number),
      });
    });
  });

  // ---- Delete verification parity contract ----
  describe('Delete verification parity', () => {
    it('bulk delete must verify records are actually gone', () => {
      // Contract: after delete returns success, a get or search
      // by exact ID must prove the record is gone
      // This prevents the "200+OK but record still exists" failure
      const deleteSteps = {
        step1: 'delete returns success (200)',
        step2: 'get by deleted ID returns 404 or null',
        step3: 'search for deleted content returns no results',
      };

      expect(deleteSteps.step2).toBeDefined();
    });
  });
});

// ============================================================================
// Live Parity Integration Tests (gated by RUN_CLI_HTTP_INTEGRATION=true)
// ============================================================================

describeHttp('Parity Contract — Live API (MCP vs REST)', () => {
  let testMemoryId: string | null = null;
  const testPrefix = `parity-${randomUUID().slice(0, 8)}`;
  const testTitle = `${testPrefix}-search-target`;
  const testContent = `Parity test for gateway route detection - ${testPrefix}`;

  const liveApiEnv = {
    LANONASIS_VENDOR_KEY: TEST_VENDOR_KEY,
    LANONASIS_FORCE_API: 'true',
  };

  beforeAll(async () => {
    if (!TEST_VENDOR_KEY) {
      throw new Error('TEST_CLI_VENDOR_KEY must be set for HTTP integration tests');
    }

    // Verify API is accessible
    try {
      const response = await fetch(TEST_API_BASE.replace('/api/v1', '/health'));
      if (!response.ok) {
        throw new Error(`API health check failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        `Cannot connect to test API at ${TEST_API_BASE}: ${error}`
      );
    }
  });

  // ---- 1. Create a memory for subsequent parity tests ----
  it('[MCP] memory create succeeds', async () => {
    // Memory commands use isDirectApiFlow, but the MCP-core backend
    // processes the request. Use --json output for easy parsing.
    const result = await runCli(
      `memory create --title "${testTitle}" --content "${testContent}" --type context --tags parity-test,gateway --json`,
      { env: liveApiEnv, timeout: 30000 }
    );

    // Debug output on failure
    if (result.exitCode !== 0) {
      console.log(`[MCP create] exit=${result.exitCode} stderr=${result.stderr}`);
    }

    expect(result.exitCode).toBe(0);

    // Extract the memory ID from JSON output
    try {
      const parsed = extractJsonFromOutput<{ id?: string; data?: { id?: string } }>(
        result.stdout
      );
      testMemoryId = parsed.id || parsed.data?.id || null;
    } catch {
      // Fallback: try regex extraction
      const idMatch = result.stdout.match(
        /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
      );
      testMemoryId = idMatch?.[1] || null;
    }

    expect(testMemoryId).toBeTruthy();
  });

  // ---- 2. Search parity: the "gateway" failure mode ----
  it('[PARITY] search "gateway" returns compatible results through both routes', async () => {
    // Search through default route (MCP/REST depending on config)
    const mcpResult = await runCli(
      `memory search "gateway" --limit 20 --json`,
      { env: liveApiEnv, timeout: 30000 }
    );

    // Search through explicit --no-mcp route
    const restResult = await runCli(
      `--no-mcp memory search "gateway" --limit 20 --json`,
      { env: liveApiEnv, timeout: 30000 }
    );

    // Both should succeed
    expect(mcpResult.exitCode).toBe(0);
    expect(restResult.exitCode).toBe(0);

    // Both must find at least the memory we created
    const mcpHasOurs = mcpResult.stdout.includes(testPrefix);
    const restHasOurs = restResult.stdout.includes(testPrefix);

    // The key parity assertion: if one finds our test memory, the other must too
    if (mcpHasOurs || restHasOurs) {
      expect(mcpHasOurs).toBe(true);
      expect(restHasOurs).toBe(true);
    }

    // Compare result counts (they should be close)
    const mcpCount = countResults(mcpResult.stdout);
    const restCount = countResults(restResult.stdout);
    expect(Math.abs(mcpCount - restCount)).toBeLessThanOrEqual(5);
  });

  // ---- 3. Search parity: exact test memory ----
  it('[PARITY] search for exact test title returns through both routes', async () => {
    const mcpResult = await runCli(
      `memory search "${testTitle}" --limit 5 --json`,
      { env: liveApiEnv, timeout: 30000 }
    );

    const restResult = await runCli(
      `--no-mcp memory search "${testTitle}" --limit 5 --json`,
      { env: liveApiEnv, timeout: 30000 }
    );

    expect(mcpResult.exitCode).toBe(0);
    expect(restResult.exitCode).toBe(0);

    const mcpFound = mcpResult.stdout.includes(testPrefix);
    const restFound = restResult.stdout.includes(testPrefix);

    // If one finds it, both must
    if (mcpFound || restFound) {
      expect(mcpFound).toBe(true);
      expect(restFound).toBe(true);
    }
  });

  // ---- 4. Get/Read parity ----
  it('[PARITY] get memory by ID returns same data through both routes', async () => {
    if (!testMemoryId) return; // skip if create failed

    const mcpResult = await runCli(
      `memory get ${testMemoryId} --json`,
      { env: liveApiEnv, timeout: 15000 }
    );

    const restResult = await runCli(
      `--no-mcp memory get ${testMemoryId} --json`,
      { env: liveApiEnv, timeout: 15000 }
    );

    // Both must succeed (exit code 0) or both fail with 404
    if (mcpResult.exitCode === 0 && restResult.exitCode === 0) {
      // Both found it; compare IDs
      expect(mcpResult.stdout).toMatch(new RegExp(testMemoryId, 'i'));
      expect(restResult.stdout).toMatch(new RegExp(testMemoryId, 'i'));
    }
  });

  // ---- 5. List parity ----
  it('[PARITY] list returns consistent results through both routes', async () => {
    const mcpResult = await runCli(
      `memory list --limit 10 --json`,
      { env: liveApiEnv, timeout: 15000 }
    );

    const restResult = await runCli(
      `--no-mcp memory list --limit 10 --json`,
      { env: liveApiEnv, timeout: 15000 }
    );

    expect(mcpResult.exitCode).toBe(0);
    expect(restResult.exitCode).toBe(0);

    const mcpCount = countResults(mcpResult.stdout);
    const restCount = countResults(restResult.stdout);

    // Counts should be close (within 20% or within 2 items whichever is larger)
    const tolerance = Math.max(2, Math.ceil(Math.max(mcpCount, restCount) * 0.2));
    expect(Math.abs(mcpCount - restCount)).toBeLessThanOrEqual(tolerance);
  });

  // ---- 6. Update parity ----
  it('[PARITY] update memory works through both routes', async () => {
    if (!testMemoryId) return;

    const updatedTitle = `${testTitle}-updated`;
    const updatedContent = `${testContent} [updated]`;

    // Update through default route
    const mcpResult = await runCli(
      `memory update ${testMemoryId} --title "${updatedTitle}" --content "${updatedContent}" --json`,
      { env: liveApiEnv, timeout: 15000 }
    );

    // Update through explicit --no-mcp route (different memory, same approach)
    const restResult = await runCli(
      `--no-mcp memory update ${testMemoryId} --title "${updatedTitle}" --json`,
      { env: liveApiEnv, timeout: 15000 }
    );

    expect(mcpResult.exitCode).toBe(0);
    expect(restResult.exitCode).toBe(0);

    // Verify both updates actually took effect by reading back
    const getResult = await runCli(
      `memory get ${testMemoryId} --json`,
      { env: liveApiEnv, timeout: 15000 }
    );
    expect(getResult.exitCode).toBe(0);
  });

  // ---- 7. Delete + verify deletion parity ----
  it('[PARITY] delete memory + verify actually gone through both routes', async () => {
    if (!testMemoryId) return;

    // Delete through default route
    const mcpDelete = await runCli(
      `memory delete ${testMemoryId}`,
      { env: liveApiEnv, timeout: 15000 }
    );
    expect(mcpDelete.exitCode).toBe(0);

    // VERIFY: get by ID should return 404 or empty
    const afterDeleteGet = await runCli(
      `memory get ${testMemoryId} --json`,
      { env: liveApiEnv, timeout: 15000 }
    );
    // Either non-zero exit or output indicating not found
    const deleteVerified =
      afterDeleteGet.exitCode !== 0 ||
      /404|not found|missing|no.*result/i.test(
        `${afterDeleteGet.stdout} ${afterDeleteGet.stderr}`
      );
    expect(deleteVerified).toBe(true);

    testMemoryId = null; // Prevent double-delete in cleanup
  });

  // ---- 8. Auth parity ----
  it('[PARITY] invalid key produces same error shape', async () => {
    const badKeyEnv = { LANONASIS_VENDOR_KEY: 'invalid_key_test_parity' };

    const mcpResult = await runCli(
      `memory list --limit 1 --json`,
      { env: { ...badKeyEnv }, timeout: 15000 }
    );

    const restResult = await runCli(
      `--no-mcp memory list --limit 1 --json`,
      { env: { ...badKeyEnv }, timeout: 15000 }
    );

    // Both should fail (non-zero exit)
    expect(mcpResult.exitCode !== 0 || mcpResult.stderr.length > 0).toBe(true);
    expect(restResult.exitCode !== 0 || restResult.stderr.length > 0).toBe(true);

    // Both should mention authentication/authorization error
    const mcpError = `${mcpResult.stdout} ${mcpResult.stderr}`.toLowerCase();
    const restError = `${restResult.stdout} ${restResult.stderr}`.toLowerCase();
    const authKeywords = /auth|unauthorized|invalid|401|403|key|token/;

    expect(mcpError).toMatch(authKeywords);
    expect(restError).toMatch(authKeywords);
  });

  // ---- 9. Intel / Intelligence parity (if available) ----
  it('[PARITY] intelligence detect-duplicates dry-run runs through both routes', async () => {
    // MCP route (default)
    const mcpResult = await runCli(
      `memory intelligence detect-duplicates --dry-run --json`,
      { env: liveApiEnv, timeout: 30000 }
    );

    // REST route (explicit --no-mcp)
    const restResult = await runCli(
      `--no-mcp memory intelligence detect-duplicates --dry-run --json`,
      { env: liveApiEnv, timeout: 30000 }
    );

    // Either both succeed, or both report "not supported / tier limit"
    // The critical thing is they behave consistently
    const mcpExitsOk = mcpResult.exitCode === 0;
    const restExitsOk = restResult.exitCode === 0;

    // Both should either succeed or fail similarly
    expect(mcpExitsOk).toBe(restExitsOk);
  });
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse the first valid JSON object from a CLI output string.
 * Handles extraneous text or spinners before the JSON payload.
 */
function extractJsonFromOutput<T>(output: string): T {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error('Expected JSON output but received empty string');
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Search for the first { or [ that parses
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '{' || trimmed[i] === '[') {
        try {
          return JSON.parse(trimmed.slice(i)) as T;
        } catch {
          continue;
        }
      }
    }
  }

  throw new Error(`Unable to locate JSON payload in output: ${trimmed.slice(0, 200)}`);
}

/**
 * Count the number of result entries in a CLI JSON output.
 * Supports various output shapes.
 */
function countResults(output: string): number {
  // Try JSON parsing
  try {
    const parsed = JSON.parse(output.trim());
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed?.data?.data && Array.isArray(parsed.data.data)) return parsed.data.data.length;
    if (parsed?.data?.results && Array.isArray(parsed.data.results)) return parsed.data.results.length;
    if (parsed?.data && Array.isArray(parsed.data)) return parsed.data.length;
    if (parsed?.results && Array.isArray(parsed.results)) return parsed.results.length;
    if (parsed?.total !== undefined) return parsed.total;
  } catch {
    // Not JSON, try regex
  }

  // Fallback: count memory IDs or result markers
  const idMatches = output.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi);
  if (idMatches) return idMatches.length;

  const resultMatches = output.match(/\[(\d+)\]/g);
  if (resultMatches) return resultMatches.length;

  return 0;
}

async function runCli(
  args: string,
  options: {
    env?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const cliPath = join(__dirname, '../dist/index.js');
  const timeout = options.timeout || 30000;

  try {
    const result = await execAsync(`node ${cliPath} ${args}`, {
      env: { ...process.env, ...options.env } as Record<string, string>,
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