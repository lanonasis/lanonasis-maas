/**
 * orchestrator-execute-action.test.ts — verifies that executeAction() delegates
 * all memory operations to the MemoryBackendRouter instead of calling the MaaS
 * client directly.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NaturalLanguageOrchestrator } from '../../src/core/orchestrator.js';

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function freshDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'execute-action-'));
  tempDirs.push(root);
  return root;
}

function buildOrchestrator(root: string) {
  return new NaturalLanguageOrchestrator({
    apiUrl: 'http://localhost:3000',
    authToken: 'test-token',
    openaiApiKey: 'sk-test',
  });
}

// ── create ──────────────────────────────────────────────────────────────────

describe('executeAction — create', () => {
  it('delegates to router.save when memory is enabled', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const router = o.getMemoryRouter();
      expect(router).toBeDefined();

      const saveSpy = vi.spyOn(router!, 'save');
      saveSpy.mockResolvedValue({ id: 'created-1', syncedToMaaS: true, pendingSync: 0 });

      const result = await o.executeAction({
        type: 'create',
        params: {
          title: 'Test Memory',
          content: 'Test content',
          memory_type: 'knowledge',
          tags: ['test'],
        },
      });

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Memory',
          content: 'Test content',
          memory_type: 'knowledge',
          tags: ['test'],
          status: 'active',
        }),
      );

      saveSpy.mockRestore();
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});

// ── update ──────────────────────────────────────────────────────────────────

describe('executeAction — update', () => {
  it('delegates to router.update with the partial updates', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const router = o.getMemoryRouter();
      expect(router).toBeDefined();

      const updateSpy = vi.spyOn(router!, 'update');
      updateSpy.mockResolvedValue({
        id: 'existing-1',
        title: 'New Title',
        content: 'Old content',
        memory_type: 'project',
        status: 'active',
        tags: ['new', 'tag'],
        source: 'local',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });

      const result = await o.executeAction({
        type: 'update',
        params: {
          id: 'existing-1',
          title: 'New Title',
          tags: ['new', 'tag'],
        },
      });

      expect(updateSpy).toHaveBeenCalledWith('existing-1', {
        title: 'New Title',
        tags: ['new', 'tag'],
      });
      // The updated record is wrapped in the response envelope.
      expect(result).toHaveProperty('data');
      expect(result.data.id).toBe('existing-1');
      expect(result.data.title).toBe('New Title');

      updateSpy.mockRestore();
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });

  it('returns error when update has no id', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const result = await o.executeAction({
        type: 'update',
        params: { title: 'no-id' },
      });
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Missing memory id for update action.');
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });

  it('returns error when update target does not exist', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const router = o.getMemoryRouter();
      vi.spyOn(router!, 'update').mockResolvedValue(null);

      const result = await o.executeAction({
        type: 'update',
        params: { id: 'nonexistent', title: 'ghost' },
      });
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Memory not found: nonexistent');

      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});

// ── search ──────────────────────────────────────────────────────────────────

describe('executeAction — search', () => {
  it('delegates to router.search and maps results', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const router = o.getMemoryRouter();
      expect(router).toBeDefined();

      const searchSpy = vi.spyOn(router!, 'search');
      searchSpy.mockResolvedValue([
        {
          id: 'hit-1',
          title: 'Search Result 1',
          content: 'Relevant content here',
          score: 0.95,
          source: 'local',
          memory_type: 'knowledge',
          tags: ['search'],
          created_at: '2025-01-01T00:00:00Z',
        },
      ]);

      const result = await o.executeAction({
        type: 'search',
        params: {
          query: 'test query',
          limit: 5,
          threshold: 0.8,
        },
      });

      expect(searchSpy).toHaveBeenCalledWith('test query', { limit: 5, status: 'active', type: undefined });
      expect(result).toHaveProperty('data');
      expect(result.data.results).toHaveLength(1);
      expect(result.data.results[0].id).toBe('hit-1');
      expect(result.data.results[0].title).toBe('Search Result 1');
      expect(result.data.results[0].similarity_score).toBe(0.95);

      searchSpy.mockRestore();
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});

// ── list ────────────────────────────────────────────────────────────────────

describe('executeAction — list', () => {
  it('delegates to router.list', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const router = o.getMemoryRouter();
      expect(router).toBeDefined();

      const listSpy = vi.spyOn(router!, 'list');
      listSpy.mockResolvedValue([
        {
          id: 'l-1',
          title: 'List Item 1',
          content: 'Content 1',
          memory_type: 'personal',
          status: 'active',
          tags: [],
          source: 'local',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ]);

      const result = await o.executeAction({
        type: 'list',
        params: { limit: 3 },
      });

      expect(listSpy).toHaveBeenCalledWith({ limit: 3 });
      // repl-engine.ts reads result.data.data for list.
      expect(result).toHaveProperty('data.data');
      expect(result.data.data).toHaveLength(1);
      expect(result.data.data[0].id).toBe('l-1');

      listSpy.mockRestore();
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});

// ── get ─────────────────────────────────────────────────────────────────────

describe('executeAction — get', () => {
  it('delegates to router.get', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const router = o.getMemoryRouter();
      expect(router).toBeDefined();

      const getSpy = vi.spyOn(router!, 'get');
      getSpy.mockResolvedValue({
        id: 'get-1',
        title: 'Get Me',
        content: 'Here I am',
        memory_type: 'reference',
        status: 'active',
        tags: ['test'],
        source: 'local',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });

      const result = await o.executeAction({
        type: 'get',
        params: { id: 'get-1' },
      });

      expect(getSpy).toHaveBeenCalledWith('get-1');
      // The record is wrapped in the response envelope.
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id', 'get-1');
      expect(result.data).toHaveProperty('title', 'Get Me');

      getSpy.mockRestore();
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});

// ── delete ──────────────────────────────────────────────────────────────────

describe('executeAction — delete', () => {
  it('delegates to router.delete', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const router = o.getMemoryRouter();
      expect(router).toBeDefined();

      const deleteSpy = vi.spyOn(router!, 'delete');
      deleteSpy.mockResolvedValue(undefined);

      const result = await o.executeAction({
        type: 'delete',
        params: { id: 'del-1' },
      });

      expect(deleteSpy).toHaveBeenCalledWith('del-1');
      // A truthy envelope so repl-engine.ts shows the success message.
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id', 'del-1');
      expect(result.data).toHaveProperty('deleted', true);

      deleteSpy.mockRestore();
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});

// ── optimize_prompt ─────────────────────────────────────────────────────────

describe('executeAction — optimize_prompt', () => {
  it('still delegates to the internal optimizePrompt method', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);

      // Stub the direct OpenAI call so the test doesn't hit api.openai.com.
      vi.spyOn(o as any, 'directOpenAIChat').mockResolvedValue({
        choices: [{ message: { content: '{"optimized_prompt":"x","improvements":[]}' } }],
      });

      const result = await o.executeAction({
        type: 'optimize_prompt',
        params: {
          original_prompt: 'Write a poem',
          context: 'about cats',
        },
      });

      expect(result).toHaveProperty('data');
      expect(result.data.optimized_prompt).toBe('x');

      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});

// ── default / unknown ───────────────────────────────────────────────────────

describe('executeAction — unknown action', () => {
  it('returns error for unknown action types', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const result = await o.executeAction({
        type: 'nonexistent_action',
        params: {},
      });
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Unknown action type: nonexistent_action');
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});

// ── null action ─────────────────────────────────────────────────────────────

describe('executeAction — null action', () => {
  it('returns null when action is null', async () => {
    process.env.LANONASIS_LOCAL_MEMORY = '1';
    const root = await freshDir();
    const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
    process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

    try {
      const o = buildOrchestrator(root);
      const result = await o.executeAction(null);
      expect(result).toBeNull();
      await o.closeMemory();
    } finally {
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
      delete process.env.LANONASIS_LOCAL_MEMORY;
    }
  });
});
