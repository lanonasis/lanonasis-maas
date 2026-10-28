/**
 * orchestrator.test.ts — verifies that fetchRelevantContext delegates to the
 * MemoryBackendRouter (local-first hybrid) instead of calling the MaaS client
 * directly.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NaturalLanguageOrchestrator } from '../../src/core/orchestrator.js';
import type { MemoryHit } from '../../src/local-memory/types.js';

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function freshDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'orchestrator-test-'));
  tempDirs.push(root);
  return root;
}

describe('fetchRelevantContext', () => {
  it('delegates search to the MemoryBackendRouter', async () => {
    const env = process.env.LANONASIS_LOCAL_MEMORY;
    process.env.LANONASIS_LOCAL_MEMORY = '1';

    try {
      const root = await freshDir();
      const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
      process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

      const orchestrator = new NaturalLanguageOrchestrator({
        apiUrl: 'http://localhost:3000',
        authToken: 'test-token',
        openaiApiKey: 'test-key'
      });

      const router = orchestrator.getMemoryRouter();
      expect(router).toBeDefined();

      const searchSpy = vi.spyOn(router!, 'search');
      searchSpy.mockResolvedValue([
        {
          id: 'hit-1',
          title: 'OAuth Best Practices',
          content: 'Use PKCE with magic link for OAuth integrations.',
          score: 0.85,
          source: 'local',
          memory_type: 'knowledge',
          tags: ['auth'],
        },
        {
          id: 'hit-2',
          title: 'Memory Architecture',
          content: 'Local-first hybrid: SQLite FTS5 + async MaaS.',
          score: 0.72,
          source: 'local',
          memory_type: 'reference',
          tags: ['architecture'],
        },
      ]);

      const result = await orchestrator.fetchRelevantContext('oauth best practices', 2);

      expect(searchSpy).toHaveBeenCalledTimes(1);
      expect(searchSpy).toHaveBeenCalledWith('oauth best practices', {
        limit: 2,
        status: 'active',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatch(/^📌 OAuth Best Practices: Use PKCE/);
      expect(result[1]).toMatch(/^📌 Memory Architecture: Local-first/);

      searchSpy.mockRestore();
      await orchestrator.closeMemory();
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
    } finally {
      process.env.LANONASIS_LOCAL_MEMORY = env ?? '';
    }
  });

  it('returns empty array when router search returns no hits', async () => {
    const env = process.env.LANONASIS_LOCAL_MEMORY;
    process.env.LANONASIS_LOCAL_MEMORY = '1';

    try {
      const root = await freshDir();
      const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
      process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

      const orchestrator = new NaturalLanguageOrchestrator({
        apiUrl: 'http://localhost:3000',
        authToken: 'test-token',
        openaiApiKey: 'test-key'
      });

      const router = orchestrator.getMemoryRouter();
      expect(router).toBeDefined();

      const searchSpy = vi.spyOn(router!, 'search');
      searchSpy.mockResolvedValue([]);

      const result = await orchestrator.fetchRelevantContext('nothing-here', 3);

      expect(searchSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);

      searchSpy.mockRestore();
      await orchestrator.closeMemory();
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
    } finally {
      process.env.LANONASIS_LOCAL_MEMORY = env ?? '';
    }
  });

  it('returns empty array when router is not available', async () => {
    const saved = process.env.LANONASIS_LOCAL_MEMORY;
    process.env.LANONASIS_LOCAL_MEMORY = '0';

    try {
      const orchestrator = new NaturalLanguageOrchestrator({
        apiUrl: 'http://localhost:3000',
        authToken: 'test-token',
        openaiApiKey: 'test-key'
      });

      const router = orchestrator.getMemoryRouter();
      expect(router).toBeUndefined();

      const result = await orchestrator.fetchRelevantContext('some query', 5);
      expect(result).toEqual([]);

      await orchestrator.closeMemory();
    } finally {
      process.env.LANONASIS_LOCAL_MEMORY = saved;
    }
  });
});

describe('initializeContext', () => {
  it('delegates memory search to the MemoryBackendRouter', async () => {
    const env = process.env.LANONASIS_LOCAL_MEMORY;
    process.env.LANONASIS_LOCAL_MEMORY = '1';

    try {
      const root = await freshDir();
      const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
      process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

      const orchestrator = new NaturalLanguageOrchestrator({
        apiUrl: 'http://localhost:3000',
        authToken: 'test-token',
        openaiApiKey: 'test-key'
      });

      const router = orchestrator.getMemoryRouter();
      expect(router).toBeDefined();

      const searchSpy = vi.spyOn(router!, 'search');
      searchSpy.mockResolvedValueOnce([
        {
          id: 'pref-1',
          title: 'Language preference',
          content: 'Prefers TypeScript over JavaScript.',
          score: 0.9,
          source: 'local',
          memory_type: 'personal',
          tags: ['preferences'],
        },
      ]);

      await orchestrator.initializeContext();

      expect(searchSpy).toHaveBeenCalledWith(
        'user preferences settings profile configuration style',
        { limit: 5, status: 'active' },
      );

      expect(orchestrator['cachedUserPreferences'].length).toBeGreaterThan(0);
      expect(orchestrator['cachedUserPreferences'][0]).toMatch(/^\[Language preference\]:/);

      searchSpy.mockRestore();
      await orchestrator.closeMemory();
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
    } finally {
      process.env.LANONASIS_LOCAL_MEMORY = env ?? '';
    }
  });

  it('resolves when router search returns no hits', async () => {
    const env = process.env.LANONASIS_LOCAL_MEMORY;
    process.env.LANONASIS_LOCAL_MEMORY = '1';

    try {
      const root = await freshDir();
      const savedDir = process.env.LANONASIS_LOCAL_MEMORY_DIR;
      process.env.LANONASIS_LOCAL_MEMORY_DIR = root;

      const orchestrator = new NaturalLanguageOrchestrator({
        apiUrl: 'http://localhost:3000',
        authToken: 'test-token',
        openaiApiKey: 'test-key'
      });

      const router = orchestrator.getMemoryRouter();
      expect(router).toBeDefined();

      const searchSpy = vi.spyOn(router!, 'search');
      // initializeContext calls the router once for preferences+profile lookup
      searchSpy.mockResolvedValueOnce([]);

      await expect(orchestrator.initializeContext()).resolves.toBeUndefined();
      expect(searchSpy).toHaveBeenCalledTimes(1);

      searchSpy.mockRestore();
      await orchestrator.closeMemory();
      if (savedDir !== undefined) {
        process.env.LANONASIS_LOCAL_MEMORY_DIR = savedDir;
      } else {
        delete process.env.LANONASIS_LOCAL_MEMORY_DIR;
      }
    } finally {
      process.env.LANONASIS_LOCAL_MEMORY = env ?? '';
    }
  });
});
