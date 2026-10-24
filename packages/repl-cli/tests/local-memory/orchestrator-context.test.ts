/**
 * orchestrator-context.test.ts — the prompt-context path end to end.
 *
 * offline-degrade.test.ts proves the router degrades to local; this proves
 * the orchestrator's fetchRelevantContext actually goes through the router
 * (it previously called the MaaS client directly, so an unreachable MaaS
 * left every prompt without memory context).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NaturalLanguageOrchestrator } from '../../src/core/orchestrator';

const originalLocalMemory = process.env.LANONASIS_LOCAL_MEMORY;
const originalLocalMemoryDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;

let root: string;
let orchestrators: NaturalLanguageOrchestrator[];
let fetchUrls: string[];

function makeOrchestrator() {
  const o = new NaturalLanguageOrchestrator({
    apiUrl: 'https://memory.invalid',
    authToken: 'lano_memory_key',
    l0: { enabled: false },
  } as never);
  orchestrators.push(o);
  return o;
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'repl-orch-context-'));
  orchestrators = [];
  fetchUrls = [];
  process.env.LANONASIS_LOCAL_MEMORY_DIR = root;
  // Simulate killed DNS: every network call fails.
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown) => {
      fetchUrls.push(String(url));
      throw new TypeError('fetch failed: getaddrinfo ENOTFOUND memory.invalid');
    }),
  );
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  for (const o of orchestrators) await o.closeMemory();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalLocalMemory === undefined) delete process.env.LANONASIS_LOCAL_MEMORY;
  else process.env.LANONASIS_LOCAL_MEMORY = originalLocalMemory;
  if (originalLocalMemoryDir === undefined) delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
  else process.env.LANONASIS_LOCAL_MEMORY_DIR = originalLocalMemoryDir;
  await rm(root, { recursive: true, force: true });
});

describe('fetchRelevantContext', () => {
  it('returns local memories when MaaS is unreachable', async () => {
    delete process.env.LANONASIS_LOCAL_MEMORY; // default: local memory on
    const o = makeOrchestrator();
    const local = (o as unknown as { localBackend: {
      init(): Promise<void>;
      save(r: Record<string, unknown>): Promise<unknown>;
    } }).localBackend;
    await local.init();
    await local.save({
      id: 'lang-pref',
      title: 'TypeScript preference',
      content: 'Prefers TypeScript over JavaScript for all new projects.',
      memory_type: 'personal',
      status: 'active',
      tags: ['preferences'],
    });

    const first = await o.fetchRelevantContext('typescript preference', 3);
    expect(first).toEqual([
      '📌 TypeScript preference: Prefers TypeScript over JavaScript for all new projects.',
    ]);

    // Once the router has seen MaaS fail, later prompts answer from
    // local without waiting on the network again.
    const t0 = Date.now();
    const second = await o.fetchRelevantContext('typescript', 3);
    expect(Date.now() - t0).toBeLessThan(100);
    expect(second).toHaveLength(1);
  });

  it('returns [] (never fabricated context) when nothing matches anywhere', async () => {
    delete process.env.LANONASIS_LOCAL_MEMORY;
    const o = makeOrchestrator();
    await expect(o.fetchRelevantContext('nothing stored about this', 3)).resolves.toEqual([]);
  });

  it('LANONASIS_LOCAL_MEMORY=0 keeps the direct MaaS search path', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '0';
    // The direct path has no offline budget (the SDK retries network
    // errors for seconds), so answer here rather than fail.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        fetchUrls.push(String(url));
        return new Response(
          JSON.stringify({
            results: [{ id: 'r1', title: 'Remote', content: 'from MaaS', similarity_score: 0.9 }],
            total_results: 1,
            search_time_ms: 3,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );
    const o = makeOrchestrator();
    expect(o.getMemoryRouter()).toBeUndefined();
    await expect(o.fetchRelevantContext('typescript', 3)).resolves.toEqual(['📌 Remote: from MaaS']);
    expect(fetchUrls.some((u) => u.includes('/search'))).toBe(true);
  });
});
