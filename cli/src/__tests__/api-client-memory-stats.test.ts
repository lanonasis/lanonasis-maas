import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockAxiosInstance = {
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
  defaults: {},
  get: jest.fn(),
  post: jest.fn(),
};

jest.unstable_mockModule('axios', () => ({
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
  create: jest.fn(() => mockAxiosInstance),
}));

const { APIClient } = await import('../utils/api.js');

describe('APIClient memory stats normalization', () => {
  beforeEach(() => {
    mockAxiosInstance.interceptors.request.use.mockClear();
    mockAxiosInstance.interceptors.response.use.mockClear();
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
  });

  it('normalizes wrapped memory stats responses from Supabase functions', async () => {
    const client = new APIClient();

    mockAxiosInstance.get.mockResolvedValue({
      data: {
        data: {
          total_memories: 3,
          by_type: {
            context: 2,
            project: 1,
          },
          with_embeddings: 2,
          without_embeddings: 1,
          recent_activity: {
            created_last_24h: 1,
          },
        },
        organization_id: 'org_123',
        generated_at: '2026-03-26T12:00:00.000Z',
      },
    });

    const result = await client.getMemoryStats();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/memories/stats');
    expect(result).toEqual({
      total_memories: 3,
      memories_by_type: {
        context: 2,
        project: 1,
        knowledge: 0,
        reference: 0,
        personal: 0,
        workflow: 0,
      },
      total_size_bytes: 0,
      avg_access_count: 0,
      most_accessed_memory: undefined,
      recent_memories: [],
    });
  });

  it('preserves legacy flat memory stats responses with memory entries', async () => {
    const client = new APIClient();

    const recentMemory = {
      id: 'mem_123',
      title: 'Recent Memory',
      content: 'CLI regression coverage',
      memory_type: 'context',
      tags: ['cli'],
      user_id: 'user_123',
      organization_id: 'org_123',
      created_at: '2026-03-25T12:00:00.000Z',
      updated_at: '2026-03-26T12:00:00.000Z',
      access_count: 7,
    };

    mockAxiosInstance.get.mockResolvedValue({
      data: {
        total_memories: 1,
        memories_by_type: {
          context: 1,
          project: 0,
          knowledge: 0,
          reference: 0,
          personal: 0,
          workflow: 0,
        },
        total_size_bytes: 2048,
        avg_access_count: 7,
        most_accessed_memory: recentMemory,
        recent_memories: [recentMemory, 'legacy-string-entry'],
      },
    });

    const result = await client.getMemoryStats();

    expect(result.total_memories).toBe(1);
    expect(result.total_size_bytes).toBe(2048);
    expect(result.avg_access_count).toBe(7);
    expect(result.memories_by_type.context).toBe(1);
    expect(result.most_accessed_memory?.id).toBe('mem_123');
    expect(result.recent_memories).toEqual([recentMemory]);
  });
});
