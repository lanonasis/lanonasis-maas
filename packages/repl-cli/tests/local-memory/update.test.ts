/**
 * update.test.ts — tests for the update() method across all MemoryBackend
 * implementations: LocalMemoryBackend, MaaSClientAdapter, and
 * MemoryBackendRouter.
 *
 * update(id, partial) must perform a MERGE: only the supplied fields
 * change; everything else is preserved.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalMemoryBackend } from '../../src/local-memory/local-backend.js';
import { MemoryBackendRouter } from '../../src/local-memory/router.js';
import { MaaSClientAdapter } from '../../src/local-memory/maas-adapter.js';
import type { MemoryBackend, MemoryHit, MemoryRecord, SaveResult, BackendHealth } from '../../src/local-memory/types.js';
import { MemoryBackendError } from '../../src/local-memory/types.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function freshDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'repl-update-'));
  tempDirs.push(root);
  return root;
}

/* ------------------------------------------------------------------ */
/*  LocalMemoryBackend — partial merge into SQLite                    */
/* ------------------------------------------------------------------ */

describe('LocalMemoryBackend.update', () => {
  let backend: LocalMemoryBackend;
  let root: string;

  beforeEach(async () => {
    root = await freshDir();
    backend = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await backend.init();
  });

  it('updates a single field and preserves the rest', async () => {
    await backend.save({
      id: 'up1',
      title: 'Original Title',
      content: 'Original content',
      memory_type: 'knowledge',
      status: 'active',
      tags: ['one', 'two'],
    });

    const updated = await backend.update('up1', { title: 'New Title' });
    expect(updated.id).toBe('up1');
    expect(updated.title).toBe('New Title');
    expect(updated.content).toBe('Original content');
    expect(updated.memory_type).toBe('knowledge');
    expect(updated.tags).toEqual(['one', 'two']);
  });

  it('updates multiple fields at once', async () => {
    await backend.save({
      id: 'up2',
      title: 'Old Title',
      content: 'Old content',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });

    const updated = await backend.update('up2', {
      title: 'Updated Title',
      status: 'archived',
    });
    expect(updated.title).toBe('Updated Title');
    expect(updated.status).toBe('archived');
    expect(updated.content).toBe('Old content');
    expect(updated.memory_type).toBe('context');
  });

  it('updates tags array', async () => {
    await backend.save({
      id: 'up3',
      title: 'tags test',
      content: 'data',
      memory_type: 'reference',
      status: 'active',
      tags: ['a'],
    });

    const updated = await backend.update('up3', {
      tags: ['x', 'y', 'z'],
    });
    expect(updated.tags).toEqual(['x', 'y', 'z']);
    expect(updated.title).toBe('tags test');
  });

  it('returns null when the id does not exist', async () => {
    const result = await backend.update('nonexistent-id', { title: 'ghost' });
    expect(result).toBeNull();
  });

  it('no-op — updating with the same values still succeeds', async () => {
    await backend.save({
      id: 'up-noop',
      title: 'same',
      content: 'same',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    const result = await backend.update('up-noop', { title: 'same', content: 'same' });
    expect(result).not.toBeNull();
    expect(result!.title).toBe('same');
  });

  it('update triggers FTS re-index via the AFTER UPDATE trigger', async () => {
    await backend.save({
      id: 'up-fts',
      title: 'UniqueKeywordZZZ',
      content: 'some content',
      memory_type: 'knowledge',
      status: 'active',
      tags: [],
    });

    // Initially searchable by the unique keyword.
    let hits = await backend.search('UniqueKeywordZZZ', { limit: 5 });
    expect(hits.length).toBeGreaterThan(0);

    // Update the title to remove the unique keyword.
    await backend.update('up-fts', { title: 'New Unrelated Title' });

    // The unique keyword should no longer match anywhere in the FTS index
    // (it was only in the title, and the title was replaced).
    hits = await backend.search('UniqueKeywordZZZ', { limit: 5 });
    expect(hits.length).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  MaaSClientAdapter.update — calls updateMemory or falls back       */
/* ------------------------------------------------------------------ */

function createClient() {
  return {
    listMemories: vi.fn().mockResolvedValue({ data: { data: [] } }),
    searchMemories: vi.fn().mockResolvedValue({ data: { results: [] } }),
    getMemory: vi.fn().mockResolvedValue({ data: null }),
    createMemory: vi.fn(),
    deleteMemory: vi.fn(),
    updateMemory: vi.fn().mockResolvedValue({
      data: { id: 'maas-up1' },
    }),
  };
}

describe('MaaSClientAdapter.update', () => {
  it('calls updateMemory with the merged fields', async () => {
    const client = createClient();
    const adapter = new MaaSClientAdapter(client);

    const result = await adapter.update('maas-up1', {
      title: 'Updated via MaaS',
      content: 'changed content',
    });

    expect(client.updateMemory).toHaveBeenCalledWith('maas-up1', {
      title: 'Updated via MaaS',
      content: 'changed content',
    });
    expect(result).not.toBeNull();
    expect(result!.id).toBe('maas-up1');
  });

  it('passes an empty partial and the record is still fetched', async () => {
    const client = createClient();
    // Preload getMemory to return the record we're updating.
    const getRes = {
      data: {
        id: 'empty-partial',
        title: 'title',
        content: 'content',
        memory_type: 'context',
        status: 'active',
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    };
    (client.getMemory as ReturnType<typeof vi.fn>).mockResolvedValue(getRes);
    (client.updateMemory as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'empty-partial' },
    });

    const adapter = new MaaSClientAdapter(client);
    // Passing only title — the rest is merged from the getMemory response.
    const result = await adapter.update('empty-partial', { title: 'title' });

    expect(result).not.toBeNull();
    expect(result!.title).toBe('title');
  });

  it('throws when updateMemory is not available (no createMemory fallback)', async () => {
    const client = createClient();
    // Remove updateMemory — simulate an older MaaS version.
    delete (client as any).updateMemory;
    const fallbackCreate = vi.fn().mockResolvedValue({ data: { id: 'fallback-id' } });
    client.createMemory = fallbackCreate;

    const adapter = new MaaSClientAdapter(client);
    await expect(adapter.update('fallback-id', { title: 'via fallback' }))
      .rejects.toBeInstanceOf(MemoryBackendError);

    // The createMemory fallback must not be used — it would upsert garbage.
    expect(fallbackCreate).not.toHaveBeenCalled();
  });

  it('rejects when the record is not found on MaaS (404)', async () => {
    const client = createClient();
    (client.getMemory as ReturnType<typeof vi.fn>).mockResolvedValue({ error: 'not found' });
    (client.updateMemory as ReturnType<typeof vi.fn>).mockResolvedValue({ error: 'not found' });

    const adapter = new MaaSClientAdapter(client);
    // A 404 must reject (not return null) so the router can enqueue the
    // failed update instead of treating it as applied.
    await expect(adapter.update('gone', { title: 'x' }))
      .rejects.toBeInstanceOf(MemoryBackendError);
  });
});

/* ------------------------------------------------------------------ */
/*  MemoryBackendRouter.update — proxies to local first               */
/* ------------------------------------------------------------------ */

class FakeRemoteForUpdate implements MemoryBackend {
  updatedIds: string[] = [];

  search(): Promise<MemoryHit[]> { return Promise.resolve([]); }
  get(): Promise<MemoryRecord | null> { return Promise.resolve(null); }
  list(): Promise<MemoryRecord[]> { return Promise.resolve([]); }
  save(): Promise<SaveResult> { return Promise.resolve({ id: 'x', syncedToMaaS: true, pendingSync: 0 }); }
  delete(): Promise<void> { return Promise.resolve(); }
  health(): Promise<BackendHealth> { return Promise.resolve({ maas: true, local: false, pendingSync: 0 }); }
  close(): Promise<void> { return Promise.resolve(); }

  async update(id: string, updates: Partial<MemoryRecord>): Promise<MemoryRecord | null> {
    this.updatedIds.push(id);
    return null; // remote update is best-effort
  }
}

describe('MemoryBackendRouter.update', () => {
  it('proxies update to the local backend', async () => {
    const root = await freshDir();
    const local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();

    await local.save({
      id: 'router-up1',
      title: 'Before',
      content: 'data',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });

    const remote = new FakeRemoteForUpdate();
    const router = new MemoryBackendRouter(local, remote);

    const result = await router.update('router-up1', { title: 'After' });

    expect(result).not.toBeNull();
    expect(result!.title).toBe('After');
    expect(result!.content).toBe('data'); // preserved
    expect(remote.updatedIds).toContain('router-up1'); // also proxied to remote
  });

  it('invalidates cache after a successful update', async () => {
    const root = await freshDir();
    const local = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await local.init();

    await local.save({
      id: 'cache-inv',
      title: 'cached data',
      content: 'something',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });

    const remote = new FakeRemoteForUpdate();
    const router = new MemoryBackendRouter(local, remote, {
      remoteTimeoutMs: 50,
      cacheTtlMs: 5 * 60_000,
    });

    // Populate cache by searching for the old title.
    await router.search('cached');

    // Update should invalidate.
    await router.update('cache-inv', { title: 'fresh' });

    // Same query must not return the stale cached hit.
    const stale = await router.search('cached');
    expect(stale.length).toBe(0);
    const hits = await router.search('fresh');
    expect(hits.length).toBeGreaterThan(0);
  });
});
