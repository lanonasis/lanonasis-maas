import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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
  put: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
};

jest.unstable_mockModule('axios', () => ({
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
  create: jest.fn(() => mockAxiosInstance),
}));

const { APIClient } = await import('../utils/api.js');

const FULL_ID = '12345678-1234-4234-9234-1234567890ab';
const MEMORY_ENTRY = {
  id: FULL_ID,
  title: 'Prefix Test Memory',
  content: 'Regression coverage for prefix lookups',
  memory_type: 'context',
  tags: ['prefix'],
  user_id: 'user_123',
  organization_id: 'org_123',
  created_at: '2026-04-04T00:00:00.000Z',
  updated_at: '2026-04-04T00:00:00.000Z',
  access_count: 1,
};

describe('APIClient memory prefix handling', () => {
  beforeEach(() => {
    mockAxiosInstance.interceptors.request.use.mockClear();
    mockAxiosInstance.interceptors.response.use.mockClear();
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.delete.mockReset();
    mockAxiosInstance.request.mockReset();
  });

  it('resolves an unambiguous prefix before fetching a memory', async () => {
    const client = new APIClient();

    mockAxiosInstance.get
      .mockResolvedValueOnce({
        data: {
          memories: [MEMORY_ENTRY],
          pagination: {
            total: 1,
            limit: 100,
            offset: 0,
            has_more: false,
            page: 1,
            pages: 1,
          },
        },
      })
      .mockResolvedValueOnce({
        data: MEMORY_ENTRY,
      });

    const memory = await client.getMemory('12345678');

    expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(1, '/api/v1/memories', {
      params: { page: 1, limit: 100 },
    });
    expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(
      2,
      `/api/v1/memories/${encodeURIComponent(FULL_ID)}`
    );
    expect(memory.id).toBe(FULL_ID);
  });

  it('rejects ambiguous memory prefixes', async () => {
    const client = new APIClient();

    mockAxiosInstance.get.mockResolvedValue({
      data: {
        memories: [
          MEMORY_ENTRY,
          {
            ...MEMORY_ENTRY,
            id: '12345678-9999-4234-9234-1234567890ab',
          },
        ],
        pagination: {
          total: 2,
          limit: 100,
          offset: 0,
          has_more: false,
          page: 1,
          pages: 1,
        },
      },
    });

    await expect(client.getMemory('12345678')).rejects.toThrow('Memory ID prefix is ambiguous');
  });

  it('falls back to the legacy query-style get endpoint after current gateway drift', async () => {
    const client = new APIClient();

    mockAxiosInstance.get
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            message: 'Memory ID is required',
          },
        },
        config: {
          url: `/api/v1/memories/${FULL_ID}`,
        },
      })
      .mockResolvedValueOnce({
        data: MEMORY_ENTRY,
      });

    const memory = await client.getMemory(FULL_ID);

    expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(
      1,
      `/api/v1/memories/${encodeURIComponent(FULL_ID)}`
    );
    expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(2, '/api/v1/memory/get', {
      params: { id: FULL_ID },
    });
    expect(memory.id).toBe(FULL_ID);
  });

  it('falls back to the legacy query-style delete endpoint after current gateway drift', async () => {
    const client = new APIClient();

    mockAxiosInstance.delete
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            message: 'Memory ID is required',
          },
        },
        config: {
          url: `/api/v1/memories/${FULL_ID}`,
        },
      })
      .mockResolvedValueOnce({ data: null });

    await client.deleteMemory(FULL_ID);

    expect(mockAxiosInstance.delete).toHaveBeenNthCalledWith(
      1,
      `/api/v1/memories/${encodeURIComponent(FULL_ID)}`
    );
    expect(mockAxiosInstance.delete).toHaveBeenNthCalledWith(2, '/api/v1/memory/delete', {
      params: { id: FULL_ID },
    });
  });
});
