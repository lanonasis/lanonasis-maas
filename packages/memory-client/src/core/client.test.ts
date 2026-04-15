import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryClient } from './client';
import { USER_AGENT, VERSION } from './constants';

function createJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

describe('CoreMemoryClient route compatibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the exported user agent constant', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createJsonResponse(200, { status: 'ok', timestamp: '2026-04-09T00:00:00.000Z' }));

    const client = createMemoryClient({
      apiUrl: 'https://api.lanonasis.com',
      apiKey: 'lano_test_key'
    });

    await client.healthCheck();

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;

    expect(USER_AGENT).toBe(`@lanonasis/memory-client/${VERSION}`);
    expect(headers['User-Agent']).toBe(USER_AGENT);
  });

  it('falls back from plural list route to singular compatibility route', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(createJsonResponse(404, {
        error: 'Memory proxy route not found',
        code: 'NOT_FOUND',
        path: '/api/v1/memories/list'
      }))
      .mockResolvedValueOnce(createJsonResponse(200, {
        data: [
          {
            id: 'mem_123',
            title: 'Test memory',
            content: 'Saved content'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      }));

    const client = createMemoryClient({
      apiUrl: 'https://api.lanonasis.com',
      apiKey: 'lano_test_key',
      retry: { maxRetries: 0 }
    });

    const result = await client.listMemories({
      limit: 10,
      sort: 'updated_at',
      order: 'desc'
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.lanonasis.com/api/v1/memories/list?limit=10&sort=updated_at&order=desc');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.lanonasis.com/api/v1/memory/list?limit=10&sort=updated_at&order=desc');
    expect(result.error).toBeUndefined();
    expect(result.data?.data).toHaveLength(1);
  });

  it('falls back from plural search route to singular compatibility route', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(createJsonResponse(404, {
        error: 'Memory proxy route not found',
        code: 'NOT_FOUND',
        path: '/api/v1/memories/search'
      }))
      .mockResolvedValueOnce(createJsonResponse(200, {
        results: [
          {
            id: 'mem_456',
            title: 'Result',
            content: 'Matched content',
            similarity: 0.92
          }
        ],
        total_results: 1,
        search_time_ms: 12
      }));

    const client = createMemoryClient({
      apiUrl: 'https://api.lanonasis.com',
      apiKey: 'lano_test_key',
      retry: { maxRetries: 0 }
    });

    const result = await client.searchMemories({
      query: 'matched content',
      limit: 5,
      threshold: 0.55
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.lanonasis.com/api/v1/memories/search');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.lanonasis.com/api/v1/memory/search');
    expect(result.error).toBeUndefined();
    expect(result.data?.results).toHaveLength(1);
  });
});
