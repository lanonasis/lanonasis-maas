import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Regression test for the transport-mode split:
//   - Memory operations ALWAYS go to mcp.lanonasis.com (the memory service),
//     even when --no-mcp / forceApi / LANONASIS_FORCE_API is set.
//   - Non-memory direct-API calls honor forceApi and go to config.getApiUrl().
//   - api.lanonasis.com (the vendor AI proxy) must NEVER receive memory ops.
//   - create/update/list send BOTH `memory_type` and `type` so the deployed
//     gateway (which persists via `type`) and the MaaS schema (which reads
//     `memory_type`) both apply the filter/type.
//
// See https://github.com/lanonasis/lanonasis-maas bug: "--no-mcp routes memory
// ops to api.lanonasis.com -> 500; --type not persisting on create/update".

const requestHandlers: Array<(config: any) => any> = [];

const mockAxiosInstance = {
  interceptors: {
    request: {
      use: jest.fn((fulfilled) => {
        requestHandlers.push(fulfilled);
      })
    },
    response: {
      use: jest.fn()
    }
  },
  defaults: {},
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

jest.unstable_mockModule('axios', () => ({
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
  create: jest.fn(() => mockAxiosInstance),
}));

const { APIClient } = await import('../utils/api.js');

function stubConfig(client: APIClient, overrides: Record<string, unknown> = {}) {
  const config = (client as any).config;
  config.init = jest.fn().mockResolvedValue(undefined);
  config.refreshTokenIfNeeded = jest.fn().mockResolvedValue(undefined);
  config.discoverServices = jest.fn().mockResolvedValue(undefined);
  config.get = jest.fn((key: string) => {
    const defaults: Record<string, unknown> = {
      discoveredServices: { auth_base: 'https://auth.example.com' },
      authMethod: 'jwt',
      forceApi: false,
      connectionTransport: 'auto',
    };
    return overrides[key] !== undefined ? overrides[key] : defaults[key];
  });
  config.getApiUrl = jest.fn().mockReturnValue('https://api.example.com');
  config.getToken = jest.fn().mockReturnValue('jwt-token-abc');
  config.getVendorKeyAsync = jest.fn().mockResolvedValue(undefined);
  return config;
}

async function runInterceptor(config: any) {
  const handler = requestHandlers[0];
  return handler({
    headers: {},
    url: config.url,
    method: config.method || 'get',
    params: config.params,
  });
}

describe('APIClient transport-mode split (memory vs direct API)', () => {
  beforeEach(() => {
    requestHandlers.length = 0;
    mockAxiosInstance.interceptors.request.use.mockClear();
    mockAxiosInstance.interceptors.response.use.mockClear();
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.delete.mockReset();
    delete process.env.LANONASIS_FORCE_API;
    delete process.env.CLI_FORCE_API;
    delete process.env.ONASIS_FORCE_API;
  });

  it('routes memory endpoints to mcp.lanonasis.com by default (JWT)', async () => {
    const client = new APIClient();
    stubConfig(client, { authMethod: 'jwt' });

    const updated = await runInterceptor({ url: '/api/v1/memories', method: 'get' });

    expect(updated.baseURL).toBe('https://mcp.lanonasis.com/api/v1');
    expect(updated.url).toBe('/memory');
  });

  it('keeps memory endpoints on mcp.lanonasis.com even when forceApi config is set (--no-mcp path)', async () => {
    const client = new APIClient();
    stubConfig(client, { forceApi: true, connectionTransport: 'api' });

    const updated = await runInterceptor({ url: '/api/v1/memories', method: 'get' });

    // Regression: memory ops must NEVER be routed to api.lanonasis.com (vendor proxy -> 500).
    expect(updated.baseURL).toBe('https://mcp.lanonasis.com/api/v1');
    expect(updated.url).toBe('/memory');
    expect(updated.baseURL).not.toContain('api.lanonasis.com');
  });

  it('keeps memory endpoints on mcp.lanonasis.com when LANONASIS_FORCE_API env is set', async () => {
    process.env.LANONASIS_FORCE_API = 'true';
    const client = new APIClient();
    stubConfig(client, { forceApi: false, connectionTransport: 'auto' });

    const updated = await runInterceptor({ url: '/api/v1/memories', method: 'get' });

    expect(updated.baseURL).toBe('https://mcp.lanonasis.com/api/v1');
    expect(updated.baseURL).not.toContain('api.lanonasis.com');
  });

  it('keeps a single-memory GET on mcp.lanonasis.com under forceApi (memory get --no-mcp)', async () => {
    const client = new APIClient();
    stubConfig(client, { forceApi: true, connectionTransport: 'api' });

    const updated = await runInterceptor({ url: '/api/v1/memories/mem_123', method: 'get' });

    expect(updated.baseURL).toBe('https://mcp.lanonasis.com/api/v1');
    expect(updated.url).toBe('/memory/mem_123');
    expect(updated.baseURL).not.toContain('api.lanonasis.com');
  });

  it('keeps memory search on mcp.lanonasis.com under forceApi', async () => {
    const client = new APIClient();
    stubConfig(client, { forceApi: true, connectionTransport: 'api' });

    const updated = await runInterceptor({ url: '/api/v1/memories/search', method: 'post' });

    expect(updated.baseURL).toBe('https://mcp.lanonasis.com/api/v1');
    expect(updated.url).toBe('/memory/search');
    expect(updated.baseURL).not.toContain('api.lanonasis.com');
  });

  it('routes non-memory endpoints to config.getApiUrl() when forceApi is set', async () => {
    const client = new APIClient();
    stubConfig(client, { forceApi: true, connectionTransport: 'api' });

    const updated = await runInterceptor({ url: '/api/v1/topics', method: 'get' });

    expect(updated.baseURL).toBe('https://api.example.com');
    expect(updated.url).toBe('/api/v1/topics');
  });

  it('routes auth endpoints to auth_base regardless of forceApi', async () => {
    const client = new APIClient();
    stubConfig(client, { forceApi: true, connectionTransport: 'api' });

    const updated = await runInterceptor({ url: '/v1/auth/me', method: 'get' });

    expect(updated.baseURL).toBe('https://auth.example.com');
  });

  it('createMemory sends BOTH memory_type and type so the type persists on the deployed gateway', async () => {
    const client = new APIClient();
    stubConfig(client, { authMethod: 'jwt' });
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        id: 'mem_1',
        title: 'T',
        content: 'C',
        memory_type: 'project',
        tags: [],
        user_id: 'u1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        access_count: 0,
      }
    });

    const created = await client.createMemory({ title: 'T', content: 'C', memory_type: 'project' });

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/memories',
      expect.objectContaining({ memory_type: 'project', type: 'project' })
    );
    expect(created.memory_type).toBe('project');
  });

  it('updateMemory sends BOTH memory_type and type', async () => {
    const client = new APIClient();
    stubConfig(client, { authMethod: 'jwt' });
    mockAxiosInstance.put.mockResolvedValue({
      data: {
        id: 'mem_1',
        title: 'T',
        content: 'C',
        memory_type: 'project',
        tags: [],
        user_id: 'u1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        access_count: 0,
      }
    });

    await client.updateMemory('8f14e45f-ceea-4a4b-9a2c-1f0b9c2d3e4a', { memory_type: 'project' });

    expect(mockAxiosInstance.put).toHaveBeenCalledWith(
      '/api/v1/memories/8f14e45f-ceea-4a4b-9a2c-1f0b9c2d3e4a',
      expect.objectContaining({ memory_type: 'project', type: 'project' })
    );
  });

  it('getMemories sends BOTH memory_type and type query params so the type filter applies', async () => {
    const client = new APIClient();
    stubConfig(client, { authMethod: 'jwt' });
    mockAxiosInstance.get.mockResolvedValue({
      data: { data: [], memories: [], pagination: { total: 0, limit: 20, offset: 0 } }
    });

    await client.getMemories({ page: 1, limit: 20, memory_type: 'project' });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/api/v1/memories',
      expect.objectContaining({
        params: expect.objectContaining({ memory_type: 'project', type: 'project' })
      })
    );
  });

  it('withTypeAlias leaves payloads without memory_type untouched', async () => {
    const client = new APIClient();
    stubConfig(client, { authMethod: 'jwt' });
    mockAxiosInstance.get.mockResolvedValue({
      data: { data: [], memories: [], pagination: { total: 0, limit: 20, offset: 0 } }
    });

    await client.getMemories({ page: 1, limit: 20 });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/api/v1/memories',
      expect.objectContaining({
        params: { page: 1, limit: 20 }
      })
    );
  });
});
