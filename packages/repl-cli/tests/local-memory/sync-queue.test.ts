/**
 * sync-queue.test.ts — covers AsyncSyncQueueRunner's retry/backoff
 * semantics, success/failure classification, and end-to-end drain
 * against a LocalMemoryBackend.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalMemoryBackend } from '../../src/local-memory/local-backend.js';
import { AsyncSyncQueueRunner, type SyncSubmitter } from '../../src/local-memory/sync-queue.js';
import { redactSecrets } from '../../src/local-memory/privacy.js';

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function freshDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'repl-sync-'));
  tempDirs.push(root);
  return root;
}

describe('privacy.redactSecrets', () => {
  it('is pure (no shared state between calls)', () => {
    const r1 = redactSecrets(`key1=${['sk', 'abcdefghijklmnopqrstuvwxyz012345'].join('-')}`);
    const r2 = redactSecrets(`key2=${['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_')}`);
    expect(r1.secretsFound).toBeGreaterThan(0);
    expect(r2.secretsFound).toBeGreaterThan(0);
    // Different secrets detected independently
    expect(r1.types).toContain('openai-api-key');
    expect(r2.types).toContain('github-token');
  });
});

describe('AsyncSyncQueueRunner', () => {
  let backend: LocalMemoryBackend;
  let runner: AsyncSyncQueueRunner;

  beforeEach(async () => {
    const root = await freshDir();
    backend = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await backend.init();
    runner = new AsyncSyncQueueRunner(backend.getSyncQueueDeps(), {
      submitTimeoutMs: 1000,
      baseBackoffSeconds: 1,
      maxBackoffSeconds: 60,
    });
  });

  it('drains saves on first try when submitter succeeds', async () => {
    await backend.save({
      id: 'q1', title: 'q', content: 'drain me',
      memory_type: 'context', status: 'active', tags: [],
    });
    const submitter: SyncSubmitter = {
      submitSave: async (p) => {
        expect(p.id).toBe('q1');
        return { maas_id: 'm_q1' };
      },
      submitDelete: async () => { /* unused */ },
    };
    const r = await runner.tick(submitter);
    expect(r.succeeded).toBe(1);
    expect(r.failed).toBe(0);
    expect(backend.getSyncQueueDeps().count()).toBe(0);

    // markSynced is the caller's responsibility; verify the helper.
    backend.markSynced('q1', 'm_q1');
    const fetched = await backend.get('q1');
    expect(fetched!.maas_id).toBe('m_q1');
  });

  it('reschedules on retryable failure with exponential backoff', async () => {
    await backend.save({
      id: 'q2', title: 'q', content: 'retry me',
      memory_type: 'context', status: 'active', tags: [],
    });
    const submitter: SyncSubmitter = {
      submitSave: async () => { throw new Error('network ECONNRESET'); },
      submitDelete: async () => { /* unused */ },
    };
    const r = await runner.tick(submitter);
    expect(r.failed).toBe(1);
    expect(r.succeeded).toBe(0);
    expect(backend.getSyncQueueDeps().count()).toBe(1);

    // Inspect: next_retry_at should be in the future.
    const rows = backend.getSyncQueueDeps().readReady(10);
    expect(rows.length).toBe(0); // not ready yet
    const allRows = backend.getSyncQueueDeps().readReady(10); // same
    expect(allRows.length).toBe(0);
  });

  it('drops rows on fatal schema/400 errors', async () => {
    await backend.save({
      id: 'q3', title: 'q', content: 'bad payload',
      memory_type: 'context', status: 'active', tags: [],
    });
    const submitter: SyncSubmitter = {
      submitSave: async () => { throw new Error('400 Bad Request: schema mismatch'); },
      submitDelete: async () => { /* unused */ },
    };
    const r = await runner.tick(submitter);
    expect(r.dropped).toBe(1);
    expect(r.failed).toBe(0);

    // The row is still in the queue but with next_retry_at far in the future
    // — our drop() doesn't delete, it pushes next_retry_at out.
    // The runner treats dropped rows as terminal.
    const deps = backend.getSyncQueueDeps();
    const ready = deps.readReady(10);
    expect(ready.length).toBe(0);
  });

  it('drops rows on auth errors', async () => {
    await backend.save({
      id: 'q4', title: 'q', content: 'auth fail',
      memory_type: 'context', status: 'active', tags: [],
    });
    const submitter: SyncSubmitter = {
      submitSave: async () => { throw new Error('401 Unauthorized'); },
      submitDelete: async () => { /* unused */ },
    };
    const r = await runner.tick(submitter);
    expect(r.dropped).toBe(1);
  });

  it('processes deletes separately from saves', async () => {
    await backend.delete('q5');
    const submitter: SyncSubmitter = {
      submitSave: async () => { throw new Error('should not be called for delete'); },
      submitDelete: async (p) => { expect(p.id).toBe('q5'); },
    };
    const r = await runner.tick(submitter);
    expect(r.succeeded).toBe(1);
  });

  it('handles empty queue gracefully', async () => {
    const submitter: SyncSubmitter = {
      submitSave: async () => ({ maas_id: '' }),
      submitDelete: async () => { /* unused */ },
    };
    const r = await runner.tick(submitter);
    expect(r).toEqual({ attempted: 0, succeeded: 0, failed: 0, dropped: 0, durationMs: expect.any(Number) });
  });

  it('serializes concurrent ticks', async () => {
    await backend.save({
      id: 'q6', title: 'q', content: 'concurrent',
      memory_type: 'context', status: 'active', tags: [],
    });
    let inflight = 0;
    let maxInflight = 0;
    const submitter: SyncSubmitter = {
      submitSave: async () => {
        inflight++;
        maxInflight = Math.max(maxInflight, inflight);
        await new Promise((r) => setTimeout(r, 30));
        inflight--;
        return { maas_id: 'm_q6' };
      },
      submitDelete: async () => { /* unused */ },
    };
    const [r1, r2] = await Promise.all([runner.tick(submitter), runner.tick(submitter)]);
    expect(r1.attempted + r2.attempted).toBe(1);
    expect(r1.succeeded + r2.succeeded).toBe(1);
    expect(maxInflight).toBeLessThanOrEqual(1);
  });

  it('survives submitter throwing synchronously', async () => {
    await backend.save({
      id: 'q7', title: 'q', content: 'throw',
      memory_type: 'context', status: 'active', tags: [],
    });
    const submitter: SyncSubmitter = {
      submitSave: (() => {
        throw new Error('sync explode');
      }) as SyncSubmitter['submitSave'],
      submitDelete: async () => { /* unused */ },
    };
    const r = await runner.tick(submitter);
    // Synchronous throw is still classified as retryable.
    expect(r.failed + r.dropped).toBe(1);
  });
});
