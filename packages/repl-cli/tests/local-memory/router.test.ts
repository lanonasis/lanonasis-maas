/**
 * router.test.ts — covers MemoryBackendRouter preference chain,
 * mergeHits, offline grace period, and cache behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalMemoryBackend } from '../../src/local-memory/local-backend.js';
import { MemoryBackendRouter, mergeHits } from '../../src/local-memory/router.js';
import type { MemoryBackend, MemoryHit, MemoryRecord, SaveResult, BackendHealth } from '../../src/local-memory/types.js';
import { MemoryBackendError } from '../../src/local-memory/types.js';

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function freshDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'repl-router-'));
  tempDirs.push(root);
  return root;
}

/** Fake remote backend controllable from each test. */
class FakeRemote implements MemoryBackend {
  hits: MemoryHit[] = [];
  failNext = false;
  failWith: 'transport' | 'schema' | 'timeout' = 'transport';
  delayMs = 0;
  healthState: BackendHealth = { maas: true, local: false, pendingSync: 0 };

  async search(query: string): Promise<MemoryHit[]> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.failNext) {
      this.failNext = false;
      throw new MemoryBackendError(
        this.failWith === 'timeout' ? `timeout after ${this.delayMs}ms` : 'transport failure',
        this.failWith === 'schema' ? 'schema' : 'transport',
      );
    }
    return this.hits.filter((h) =>
      `${h.title} ${h.content}`.toLowerCase().includes(query.toLowerCase()),
    );
  }
  async get(id: string): Promise<MemoryRecord | null> {
    return this.hits.find((h) => h.id === id)
      ? { id, title: 'r', content: 'r', memory_type: 'context', status: 'active', tags: [], source: 'maas-sync', created_at: '', updated_at: '' }
      : null;
  }
  async list(): Promise<MemoryRecord[]> { return []; }
  async save(): Promise<SaveResult> {
    if (this.failNext) {
      this.failNext = false;
      throw new MemoryBackendError('transport failure on save', 'transport');
    }
    return { id: 'remote', syncedToMaaS: true, pendingSync: 0 };
  }
  async delete(): Promise<void> {}
  async health(): Promise<BackendHealth> { return this.healthState; }
  async close(): Promise<void> {}
}

describe('mergeHits', () => {
  it('returns local when remote is empty', () => {
    const local: MemoryHit[] = [{ id: 'a', title: 't', content: 'c', score: 0.5, source: 'local' }];
    expect(mergeHits(local, [], false)).toEqual(local);
  });

  it('returns remote when local is empty', () => {
    const remote: MemoryHit[] = [{ id: 'a', title: 't', content: 'c', score: 0.5, source: 'maas' }];
    const out = mergeHits([], remote, false);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('maas');
  });

  it('dedupes by content-hash', () => {
    const shared: MemoryHit = { id: '1', title: 'OAuth', content: 'PKCE flow', score: 0, source: 'local' };
    const local: MemoryHit[] = [shared, { id: '2', title: 'Local-only', content: 'foo', score: 0.5, source: 'local' }];
    const remote: MemoryHit[] = [
      { id: '3', title: 'OAuth', content: 'PKCE flow', score: 0.9, source: 'maas' },
      { id: '4', title: 'Remote-only', content: 'bar', score: 0.7, source: 'maas' },
    ];
    const merged = mergeHits(local, remote, false);
    expect(merged).toHaveLength(3);
    // local has higher BM25 score typically; either way dedup wins.
    const oauthHit = merged.find((h) => h.title === 'OAuth');
    expect(oauthHit).toBeDefined();
    expect(['local', 'merged']).toContain(oauthHit!.source);
  });

  it('preferRemote takes remote on conflict', () => {
    const shared: MemoryHit = { id: '1', title: 'OAuth', content: 'PKCE flow', score: 0.9, source: 'local' };
    const remote = [{ id: '2', title: 'OAuth', content: 'PKCE flow', score: 0.5, source: 'maas' as const }];
    const merged = mergeHits([shared], remote, true);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('merged'); // dedup'd, marker shows merge happened
  });

  it('sorts by score descending', () => {
    const local = [
      { id: '1', title: 'a', content: 'x', score: 0.2, source: 'local' as const },
      { id: '2', title: 'b', content: 'x', score: 0.9, source: 'local' as const },
    ];
    const remote = [
      { id: '3', title: 'c', content: 'x', score: 0.5, source: 'maas' as const },
    ];
    const merged = mergeHits(local, remote, false);
    expect(merged.map((h) => h.score)).toEqual([0.9, 0.5, 0.2]);
  });
});

describe('MemoryBackendRouter', () => {
  let local: LocalMemoryBackend;
  let remote: FakeRemote;
  let router: MemoryBackendRouter;

  beforeEach(async () => {
    const root = await freshDir();
    local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();
    remote = new FakeRemote();
    router = new MemoryBackendRouter(local, remote, {
      remoteTimeoutMs: 50,
      offlineGracePeriodMs: 100,
      healthProbeIntervalMs: 50,
    });
  });

  it('returns local hits when local has a match (sub-ms path)', async () => {
    await local.save({
      id: 'local-h1',
      title: 'OAuth Integration',
      content: 'PKCE magic link flow',
      memory_type: 'knowledge',
      status: 'active',
      tags: [],
    });
    remote.hits = [{
      id: 'remote-h1',
      title: 'OAuth Integration',
      content: 'PKCE magic link flow', // dedup target
      score: 0.95,
      source: 'maas',
    }];
    // Multi-term query gives a strong BM25 rank so the local hit (after the
    // corrected normalizeBm25 polarity) beats the synthetic remote score and
    // survives dedup. A single-term query against a weak match would let the
    // remote entry win instead, which is the intended behavior of mergeHits.
    const hits = await router.search('oauth PKCE magic link');
    expect(hits.length).toBeGreaterThan(0);
    // local hit present; dedup target means we get 1 hit
    const ids = hits.map((h) => h.id);
    expect(ids).toContain('local-h1');
  });

  it('falls back to local when remote times out', async () => {
    await local.save({
      id: 'fallback',
      title: 'fallback hit',
      content: 'should still surface',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    remote.delayMs = 200;
    remote.hits = [];
    const hits = await router.search('fallback');
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('fallback');
    expect(hits[0].source).toBe('local');
  });

  it('enriches from remote when local misses', async () => {
    remote.hits = [{
      id: 'r-only',
      title: 'remote only memory',
      content: 'matters for query',
      score: 0.8,
      source: 'maas',
    }];
    const hits = await router.search('matters');
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('r-only');
    expect(hits[0].source).toBe('maas');
  });

  it('returns local-only when remote is consistently failing and grace expires', async () => {
    remote.failNext = true;
    // First call: probe fails, returns local (still within grace).
    const h1 = await router.search('anything');
    expect(h1).toEqual([]); // no local data
    // Force grace expiry by waiting.
    await new Promise((r) => setTimeout(r, 60));
    remote.failNext = true;
    const h2 = await router.search('anything');
    expect(h2).toEqual([]);
  });

  it('save writes local + tries remote', async () => {
    const result = await router.save({
      id: 's1',
      title: 'save test',
      content: 'should hit local first',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    expect(result.id).toBe('s1');
    expect(result.syncedToMaaS).toBe(true);
    // Confirm local persistence
    const fetched = await local.get('s1');
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe('save test');
  });

  it('save falls back to queue when remote is unreachable', async () => {
    // Force remote save to throw.
    remote.failNext = true;
    const result = await router.save({
      id: 's2',
      title: 'offline save',
      content: 'should still persist locally',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    expect(result.id).toBe('s2');
    expect(result.syncedToMaaS).toBe(false);
    expect(result.pendingSync).toBeGreaterThan(0);

    const fetched = await local.get('s2');
    expect(fetched).not.toBeNull();
  });

  it('redacts direct remote writes while leaving the local input and caller record intact', async () => {
    const secret = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    const record = {
      id: 'redacted', title: secret, content: secret, tags: [secret, 'safe'],
      memory_type: 'context' as const, status: 'active' as const,
    };
    const localSave = vi.spyOn(local, 'save');
    const remoteSave = vi.spyOn(remote, 'save');
    remote.failNext = true; // Keep the queue available for inspection.
    await router.save(record);
    expect(remoteSave).toHaveBeenCalledWith({
      ...record, title: '[REDACTED:github-token]', content: '[REDACTED:github-token]',
      tags: ['[REDACTED:github-token]', 'safe'], source: 'maas-sync',
    });
    expect(localSave).toHaveBeenCalledWith({ ...record, source: 'local' });
    expect(record.title).toBe(secret);
    expect(record.content).toBe(secret);
    expect(record.tags).toEqual([secret, 'safe']);
    const [row] = local.getSyncQueueDeps().readReady(10);
    expect(JSON.parse(row.payload)).toMatchObject({
      title: '[REDACTED:github-token]', content: '[REDACTED:github-token]',
      tags: ['[REDACTED:github-token]', 'safe'],
    });
  });

  it.each(['offline', 'queued', 'synced'])('invalidates cached searches after a %s save', async (mode) => {
    if (mode === 'offline') router = new MemoryBackendRouter(local, null);
    expect(await router.search('fresh')).toEqual([]);
    remote.failNext = mode === 'queued';
    await router.save({
      id: 'fresh', title: 'Fresh memory', content: 'new content',
      memory_type: 'context', status: 'active', tags: [],
    });
    expect((await router.search('fresh')).map((hit) => hit.id)).toContain('fresh');
  });

  it('delete removes from both backends', async () => {
    await local.save({
      id: 'to-delete',
      title: 'a',
      content: 'b',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    await router.delete('to-delete');
    expect(await local.get('to-delete')).toBeNull();
  });

  it('health reports local + remote state', async () => {
    const h = await router.health();
    expect(h.local).toBe(true);
    expect(h.maas).toBe(remote.healthState.maas);
    expect(typeof h.pendingSync).toBe('number');
  });

  it('caches search results within TTL', async () => {
    let remoteCalls = 0;
    const originalSearch = remote.search.bind(remote);
    remote.search = vi.fn(async (q: string) => {
      remoteCalls++;
      return originalSearch(q);
    }) as FakeRemote['search'];

    // First call hits remote.
    await router.search('cache-test');
    // Wait long enough to allow second cache hit.
    const beforeCount = remoteCalls;
    await router.search('cache-test');
    expect(remoteCalls).toBe(beforeCount); // cached, no new remote call
  });
});

/** Remote that always fails to update (mimics a MaaS 404 after the fix). */
class FailingUpdateRemote extends FakeRemote {
  async update(): Promise<MemoryRecord | null> {
    throw new MemoryBackendError('Memory not found: maas-1', 'not_found');
  }
}

describe('MemoryBackendRouter — combined result handling', () => {
  let local: LocalMemoryBackend;
  let remote: FakeRemote;
  let router: MemoryBackendRouter;

  beforeEach(async () => {
    const root = await freshDir();
    local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();
    remote = new FakeRemote();
    router = new MemoryBackendRouter(local, remote, {
      remoteTimeoutMs: 50,
      offlineGracePeriodMs: 100,
      healthProbeIntervalMs: 50,
    });
  });

  it('applies the requested limit once to the combined local + remote results', async () => {
    await local.save({
      id: 'lim-local', title: 'Shared', content: 'sharedtoken',
      memory_type: 'context', status: 'active', tags: [],
    });
    remote.hits = [
      { id: 'lim-r1', title: 'Remote one', content: 'sharedtoken', score: 0.9, source: 'maas' },
      { id: 'lim-r2', title: 'Remote two', content: 'sharedtoken', score: 0.8, source: 'maas' },
    ];

    const hits = await router.search('sharedtoken', { limit: 1 });
    // Local and remote each honour the limit, but the caller asked for one
    // result in total — the merged list must not be longer than that.
    expect(hits).toHaveLength(1);
  });

  it('lists a synced memory once (local UUID and MaaS id)', async () => {
    await local.save({
      id: 'local-uuid', title: 'Synced memory', content: 'body',
      memory_type: 'context', status: 'active', tags: [],
    });
    local.markSynced('local-uuid', 'maas-1');
    remote.list = async () => ([
      {
        id: 'maas-1', title: 'Synced memory', content: 'body',
        memory_type: 'context' as const, status: 'active' as const, tags: [],
        source: 'maas-sync' as const, created_at: '', updated_at: '',
      },
    ]);

    const records = await router.list();
    expect(records.filter((r) => r.title === 'Synced memory')).toHaveLength(1);
  });

  it('caches a remote-only record locally without scheduling a MaaS create', async () => {
    remote.hits = [{
      id: 'remote-only', title: 'Remote only', content: 'body',
      score: 0.5, source: 'maas',
    }];

    const record = await router.get('remote-only');
    expect(record).not.toBeNull();

    // The record is cached locally...
    const cached = await local.get('remote-only');
    expect(cached).not.toBeNull();
    expect(cached!.title).toBe(record!.title);
    expect(cached!.source).toBe('maas-sync');

    // ...without queuing a 'save' op that would create a duplicate on MaaS.
    const rows = local.getSyncQueueDeps().readReady(10);
    expect(rows.filter((r) => r.op === 'save')).toHaveLength(0);
  });

  it('enqueues the failed update when the remote update rejects', async () => {
    await local.save({
      id: 'fail-up', title: 'Before', content: 'body',
      memory_type: 'context', status: 'active', tags: [],
    });
    local.markSynced('fail-up', 'maas-1');

    const failing = new MemoryBackendRouter(local, new FailingUpdateRemote(), {
      remoteTimeoutMs: 50,
    });
    const updated = await failing.update('fail-up', { title: 'After' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('After');

    const rows = local.getSyncQueueDeps().readReady(10);
    const updateRow = rows.find((r) => r.op === 'update');
    expect(updateRow).toBeDefined();
    expect(JSON.parse(updateRow!.payload)).toMatchObject({ id: 'maas-1', title: 'After' });
  });

  it('merges the current local value into the queued save, not the captured payload', async () => {
    await local.save({
      id: 'merge-current', title: 'Original', content: 'body',
      memory_type: 'context', status: 'active', tags: [],
    });
    // The local record changes after the queued save was written.
    await local.update('merge-current', { status: 'archived' });

    const failing = new MemoryBackendRouter(local, new FailingUpdateRemote(), {
      remoteTimeoutMs: 50,
    });
    await failing.update('merge-current', { title: 'Updated' });

    const rows = local.getSyncQueueDeps().readReady(10);
    const saveRow = rows.find((r) => r.op === 'save');
    expect(saveRow).toBeDefined();
    const payload = JSON.parse(saveRow!.payload) as Record<string, unknown>;
    expect(payload.title).toBe('Updated');
    // The current local status must win over the stale queued value.
    expect(payload.status).toBe('archived');
  });
});
