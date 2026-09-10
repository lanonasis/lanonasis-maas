/**
 * offline-degrade.test.ts — covers the user's exact scenario:
 *
 *   1. MaaS unreachable (DNS / network / 5xx)
 *   2. Local backend has data
 *   3. fetchRelevantContext returns real local results, not
 *      fabricated "80% relevance" hand-waving
 *   4. Save still persists (durable locally; queues for later sync)
 *   5. Recovery: when remote comes back, the queue drains
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalMemoryBackend } from '../../src/local-memory/local-backend.js';
import { MemoryBackendRouter } from '../../src/local-memory/router.js';
import { AsyncSyncQueueRunner, type SyncSubmitter } from '../../src/local-memory/sync-queue.js';
import type { MemoryBackend, MemoryHit, MemoryRecord, SaveResult, BackendHealth } from '../../src/local-memory/types.js';
import { MemoryBackendError } from '../../src/local-memory/types.js';

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function freshDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'repl-offline-'));
  tempDirs.push(root);
  return root;
}

/** Always-fail remote — simulates DNS-down or 5xx storm. */
class AlwaysFailRemote implements MemoryBackend {
  async search(): Promise<MemoryHit[]> {
    throw new MemoryBackendError('ECONNREFUSED api.lanonasis.com:443', 'transport');
  }
  async get(): Promise<MemoryRecord | null> { return null; }
  async list(): Promise<MemoryRecord[]> { return []; }
  async save(): Promise<SaveResult> {
    throw new MemoryBackendError('500 Internal Server Error', 'transport');
  }
  async delete(): Promise<void> {
    throw new MemoryBackendError('network unreachable', 'transport');
  }
  async health(): Promise<BackendHealth> {
    return { maas: false, local: false, pendingSync: 0 };
  }
  async close(): Promise<void> {}
}

/** Switchable remote — flips from fail → succeed to simulate recovery. */
class SwitchableRemote implements MemoryBackend {
  failing = false;
  setRecovered() { this.failing = false; }
  setOffline() { this.failing = true; }
  async search(): Promise<MemoryHit[]> {
    if (this.failing) throw new MemoryBackendError('transport down', 'transport');
    return [{
      id: 'recovered',
      title: 'Recovered memory',
      content: 'sourced from MaaS after recovery',
      score: 0.95,
      source: 'maas',
    }];
  }
  async get(): Promise<MemoryRecord | null> { return null; }
  async list(): Promise<MemoryRecord[]> { return []; }
  async save(record: { id: string }): Promise<SaveResult> {
    if (this.failing) throw new MemoryBackendError('transport down', 'transport');
    return { id: record.id, syncedToMaaS: true, pendingSync: 0 };
  }
  async delete(): Promise<void> {
    if (this.failing) throw new MemoryBackendError('transport down', 'transport');
  }
  async health(): Promise<BackendHealth> {
    return { maas: !this.failing, local: false, pendingSync: 0 };
  }
  async close(): Promise<void> {}
}

describe('offline degrade', () => {
  it('read returns local results when MaaS is unreachable', async () => {
    const root = await freshDir();
    const local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();
    // Pre-populate with the user's actual data shape:
    await local.save({
      id: 'lang-pref',
      title: 'TypeScript preference',
      content: 'Derick prefers TypeScript over JavaScript for all new projects.',
      memory_type: 'preference' as 'personal', // tolerate preference as personal
      status: 'active',
      tags: ['preferences'],
    });
    await local.save({
      id: 'oauth-flow',
      title: 'OAuth PKCE magic link',
      content: 'Standard auth flow for LanOnasis integrations.',
      memory_type: 'knowledge',
      status: 'active',
      tags: ['auth'],
    });

    const router = new MemoryBackendRouter(local, new AlwaysFailRemote(), {
      remoteTimeoutMs: 50,
      offlineGracePeriodMs: 100,
      healthProbeIntervalMs: 50,
    });

    // User asks about TypeScript — must return real local result,
    // NOT a fabricated 80% "TikTok" match.
    const hits = await router.search('typescript preference');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.id === 'lang-pref')).toBe(true);
    expect(hits.every((h) => h.source === 'local')).toBe(true);
  });

  it('save persists locally and queues for later sync when MaaS unreachable', async () => {
    const root = await freshDir();
    const local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();
    const router = new MemoryBackendRouter(local, new AlwaysFailRemote(), {
      remoteTimeoutMs: 50,
      offlineGracePeriodMs: 100,
      healthProbeIntervalMs: 50,
    });

    const result = await router.save({
      id: 'offline-save',
      title: 'saved while offline',
      content: 'must persist locally even when MaaS is down',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });

    expect(result.syncedToMaaS).toBe(false);
    expect(result.pendingSync).toBeGreaterThan(0);

    // Local SQLite has the record.
    const fetched = await local.get('offline-save');
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe('saved while offline');

    // Sync queue has the row.
    const deps = local.getSyncQueueDeps();
    const ready = deps.readReady(10);
    expect(ready.length).toBe(1);
    expect(ready[0].op).toBe('save');
  });

  it('queue drains when MaaS recovers', async () => {
    const root = await freshDir();
    const local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();
    const remote = new SwitchableRemote();
    remote.setOffline();
    const router = new MemoryBackendRouter(local, remote, {
      remoteTimeoutMs: 50,
      offlineGracePeriodMs: 100,
      healthProbeIntervalMs: 50,
    });
    const runner = new AsyncSyncQueueRunner(local.getSyncQueueDeps(), {
      submitTimeoutMs: 1000,
      baseBackoffSeconds: 1,
      maxBackoffSeconds: 10,
    });

    // 1. Save while offline → queues.
    const offlineSave = await router.save({
      id: 'recover-me',
      title: 'saved during outage',
      content: 'will sync once MaaS is back',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    expect(offlineSave.syncedToMaaS).toBe(false);
    expect(local.getSyncQueueDeps().count()).toBe(1);

    // 2. MaaS recovers.
    remote.setRecovered();

    // 3. Drain queue.
    const submitter: SyncSubmitter = {
      submitSave: async (p) => {
        expect(p.id).toBe('recover-me');
        return { maas_id: 'm_recover' };
      },
      submitDelete: async () => { /* unused */ },
    };
    const tick = await runner.tick(submitter);
    expect(tick.succeeded).toBe(1);
    expect(local.getSyncQueueDeps().count()).toBe(0);

    // 4. After drain, mark synced and verify.
    local.markSynced('recover-me', 'm_recover');
    const synced = await local.get('recover-me');
    expect(synced!.maas_synced_at).not.toBeNull();
    expect(synced!.maas_id).toBe('m_recover');

    // 5. Future reads now hit local (which has the synced record).
    const hits = await router.search('outage');
    expect(hits.some((h) => h.id === 'recover-me' && h.source === 'local')).toBe(true);
  });

  it('air-gapped: no auth, no network, never blocks the user', async () => {
    const root = await freshDir();
    const local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();

    // No remote at all — pure offline.
    const router = new MemoryBackendRouter(local, null, {});

    // Save must work without auth.
    const r = await router.save({
      id: 'airgap-only',
      title: 'offline-only note',
      content: 'totally self-contained',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    expect(r.syncedToMaaS).toBe(false);
    expect(r.pendingSync).toBe(1); // exactly one queued

    // Search still works without ever touching the network.
    const hits = await router.search('offline-only');
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('airgap-only');
    expect(hits[0].source).toBe('local');
  });

  it('flapping network: rapid fail/succeed does not lose writes', async () => {
    const root = await freshDir();
    const local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();
    const remote = new SwitchableRemote();
    const router = new MemoryBackendRouter(local, remote, {
      remoteTimeoutMs: 50,
      offlineGracePeriodMs: 50,
      healthProbeIntervalMs: 30,
    });

    // Online save → should sync.
    await router.save({
      id: 'flap-1',
      title: 'a', content: 'a',
      memory_type: 'context', status: 'active', tags: [],
    });
    // Offline save → queues.
    remote.setOffline();
    await router.save({
      id: 'flap-2',
      title: 'b', content: 'b',
      memory_type: 'context', status: 'active', tags: [],
    });
    // Online save → should sync.
    remote.setRecovered();
    await router.save({
      id: 'flap-3',
      title: 'c', content: 'c',
      memory_type: 'context', status: 'active', tags: [],
    });

    // flap-2 must still be in queue.
    expect(local.getSyncQueueDeps().count()).toBe(1);
  });

  it('daily markdown audit file is written even when MaaS is down', async () => {
    const root = await freshDir();
    const local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: true });
    await local.init();
    const router = new MemoryBackendRouter(local, new AlwaysFailRemote(), {
      remoteTimeoutMs: 50,
      offlineGracePeriodMs: 50,
    });

    await router.save({
      id: 'audit',
      title: 'audit entry',
      content: 'this should appear in today\'s markdown',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });

    const today = new Date().toISOString().slice(0, 10);
    const memDir = join(root, 'memory');
    const files = await readdir(memDir);
    expect(files.length).toBeGreaterThan(0);
    const mdPath = join(memDir, `${today}.md`);
    const content = await readFile(mdPath, 'utf8');
    expect(content).toContain('## audit entry');
    expect(content).toContain('id: audit');
  });
});
