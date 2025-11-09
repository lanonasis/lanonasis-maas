import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

type SupabaseMock = ReturnType<typeof createSupabaseMock>;

interface SupabaseHandlers {
  memoryInsertSingle?: jest.Mock;
  memorySelectSingle?: jest.Mock;
  memoryUpdateSingle?: jest.Mock;
  memoryDeleteEq?: jest.Mock;
  auditInsert?: jest.Mock;
  rpc?: jest.Mock;
}

const createSupabaseMock = (handlers: SupabaseHandlers = {}) => {
  const {
    memoryInsertSingle = jest.fn(),
    memorySelectSingle = jest.fn(),
    memoryUpdateSingle = jest.fn(),
    memoryDeleteEq = jest.fn(),
    auditInsert = jest.fn().mockResolvedValue({ error: null }),
    rpc = jest.fn()
  } = handlers;

  const memoryEntriesHandler = {
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: memoryInsertSingle
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: memorySelectSingle
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: memoryUpdateSingle
          }))
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: memoryDeleteEq
      }))
    }))
  };

  const usageAnalyticsHandler = {
    insert: auditInsert
  };

  return {
    from: jest.fn((table: string) => {
      if (table === 'memory_entries') {
        return memoryEntriesHandler;
      }

      if (table === 'usage_analytics') {
        return usageAnalyticsHandler;
      }

      return {};
    }),
    rpc
  };
};

let setupModule: typeof import('../setup');

beforeEach(async () => {
  jest.resetModules();
  setupModule = await import('../setup');
});

afterEach(() => {
  jest.resetModules();
});

describe('MemoryService', () => {
  it('creates memory with embedding and audit log', async () => {
    const insertedMemory = {
      id: 'mem-123',
      title: 'Test',
      content: 'test content',
      memory_type: 'context',
      tags: [],
      topic_id: null,
      user_id: 'user-1',
      organization_id: 'org-1',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      access_count: 0
    };

    const memoryInsertSingle = jest.fn().mockResolvedValue({
      data: insertedMemory,
      error: null
    });

    const supabaseMock = createSupabaseMock({
      memoryInsertSingle
    });

    jest.unstable_mockModule('../../src/utils/supabaseClient', () => ({
      getSupabaseClient: () => supabaseMock
    }));

    const embeddingMock = {
      generateEmbedding: jest.fn().mockResolvedValue({
        embedding: [0.1, 0.2],
        model: 'text-embedding-3-small',
        provider: 'openai',
        tokensUsed: 24,
        costUSD: 0.00048
      })
    };

    const { MemoryService } = await import('../../src/services/memory');
    const service = new MemoryService(embeddingMock as any);

    const result = await service.createMemory('mem-123', {
      title: 'Test',
      content: 'test content',
      memory_type: 'context',
      user_id: 'user-1',
      organization_id: 'org-1'
    });

    expect(result.id).toBe('mem-123');
    expect(embeddingMock.generateEmbedding).toHaveBeenCalledWith('test content', {
      memoryId: 'mem-123',
      operation: 'create',
      organizationId: 'org-1',
      userId: 'user-1'
    });
    expect(supabaseMock.from).toHaveBeenCalledWith('memory_entries');
    expect(setupModule.getOpenAIStub().embeddings.create).not.toHaveBeenCalled();
  });

  it('updates memory content and regenerates embedding', async () => {
    const existingMemory = {
      id: 'mem-123',
      title: 'Old',
      content: 'old content',
      memory_type: 'context',
      tags: [],
      topic_id: null,
      user_id: 'user-1',
      organization_id: 'org-1',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      access_count: 0
    };

    const memorySelectSingle = jest.fn()
      .mockResolvedValueOnce({ data: existingMemory, error: null });

    const updatedMemory = {
      ...existingMemory,
      content: 'new content'
    };

    const memoryUpdateSingle = jest.fn()
      .mockResolvedValueOnce({ data: updatedMemory, error: null });

    const supabaseMock = createSupabaseMock({
      memorySelectSingle,
      memoryUpdateSingle
    });

    jest.unstable_mockModule('../../src/utils/supabaseClient', () => ({
      getSupabaseClient: () => supabaseMock
    }));

    const embeddingMock = {
      generateEmbedding: jest.fn().mockResolvedValue({
        embedding: [0.01, 0.02],
        model: 'text-embedding-3-small',
        provider: 'openai',
        tokensUsed: 18,
        costUSD: 0.00036
      })
    };

    const { MemoryService } = await import('../../src/services/memory');
    const service = new MemoryService(embeddingMock as any);

    const result = await service.updateMemory('mem-123', {
      organization_id: 'org-1',
      user_id: 'user-1',
      content: 'new content'
    });

    expect(result.content).toBe('new content');
    expect(memorySelectSingle).toHaveBeenCalled();
    expect(memoryUpdateSingle).toHaveBeenCalled();
    expect(embeddingMock.generateEmbedding).toHaveBeenCalledWith('new content', {
      memoryId: 'mem-123',
      operation: 'update',
      organizationId: 'org-1',
      userId: 'user-1'
    });
  });

  it('executes semantic search using RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        { id: 'mem-1', relevance_score: 0.92 }
      ],
      error: null
    });

    const supabaseMock = createSupabaseMock({ rpc });

    jest.unstable_mockModule('../../src/utils/supabaseClient', () => ({
      getSupabaseClient: () => supabaseMock
    }));

    const embeddingMock = {
      generateEmbedding: jest.fn().mockResolvedValue({
        embedding: [0.5, 0.6],
        model: 'text-embedding-3-small',
        provider: 'openai',
        tokensUsed: 12,
        costUSD: 0.00024
      })
    };

    const { MemoryService } = await import('../../src/services/memory');
    const service = new MemoryService(embeddingMock as any);

    const results = await service.searchMemories('hello world', 'org-1', {
      user_id: 'user-1',
      limit: 5,
      threshold: 0.6
    });

    expect(results).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith('match_memories', expect.objectContaining({
      organization_id_param: 'org-1',
      match_count: 5,
      match_threshold: 0.6,
      user_id_param: 'user-1'
    }));
  });
});
