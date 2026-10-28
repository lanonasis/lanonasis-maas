import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Regression (2026-10-28): with --no-mcp (direct api.lanonasis.com),
// `memory update` printed "updated successfully" and changed nothing, and
// `memory delete` silently kept the row. nginx routes every method on
// /api/v1/memories/{id} to memory-get, which answers PUT/DELETE with the
// unchanged memory. Only /api/v1/memory/update and /api/v1/memory/delete reach
// the write functions, so the direct-API transport must use those.

const requestHandlers: Array<(config: any) => any> = [];
const responseErrorHandlers: Array<(error: any) => any> = [];
const mockAxiosInstance = {
  interceptors: {
    request: { use: jest.fn((fulfilled) => { requestHandlers.push(fulfilled as any); }) },
    response: { use: jest.fn((_fulfilled, rejected) => { responseErrorHandlers.push(rejected as any); }) },
  },
  defaults: {},
  get: jest.fn(),
  post: jest.fn(),
  request: jest.fn(async (config: any) => config),
};
jest.unstable_mockModule('axios', () => ({
  default: { create: jest.fn(() => mockAxiosInstance) },
  create: jest.fn(() => mockAxiosInstance),
}));

const { APIClient } = await import('../utils/api.js');
const ID = '49f43d34-5a4a-48a5-a97c-83aee9528a61';

function directApiClient(forceApi: boolean) {
  requestHandlers.length = 0;
  responseErrorHandlers.length = 0;
  const client = new APIClient();
  const config = (client as any).config;
  config.init = jest.fn(async () => undefined);
  config.refreshTokenIfNeeded = jest.fn(async () => undefined);
  config.discoverServices = jest.fn(async () => undefined);
  config.get = jest.fn((key: string) => {
    if (key === 'authMethod') return 'jwt';
    if (key === 'forceApi') return forceApi;
    return undefined;
  });
  config.getApiUrl = jest.fn(() => 'https://api.example.com');
  config.getToken = jest.fn(() => 'jwt-token');
  config.getVendorKeyAsync = jest.fn(async () => undefined);
  config.hasVendorKey = jest.fn(() => true);
  return requestHandlers[0];
}

describe('memory id routes on the direct API transport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends update to /api/v1/memory/update with the id in the body', async () => {
    const handler = directApiClient(true);
    const out = await handler({ headers: {}, url: `/api/v1/memories/${ID}`, method: 'put', data: { content: 'new' } });
    expect(out.baseURL).toBe('https://api.example.com');
    expect(out.method).toBe('post');
    expect(out.url).toBe('/api/v1/memory/update');
    expect(out.data).toEqual({ id: ID, content: 'new' });
  });

  it('keeps a serialized update payload when rewriting the route', async () => {
    const handler = directApiClient(true);
    const out = await handler({
      headers: {},
      url: `/api/v1/memories/${ID}`,
      method: 'patch',
      data: JSON.stringify({ content: 'serialized' }),
    });
    expect(out.data).toEqual({ id: ID, content: 'serialized' });
  });

  it('restores the original write route before the Supabase fallback', async () => {
    const handler = directApiClient(true);
    const written = await handler({ headers: {}, url: `/api/v1/memories/${ID}`, method: 'put', data: { content: 'new' } });
    expect(written.__originalMemoryWriteMethod).toBe('put');

    const retried = await responseErrorHandlers[0]({
      response: { status: 401, data: { message: 'Authentication required' } },
      config: written,
    });

    expect(retried.url).toBe(`/api/v1/memories/${ID}`);
    expect(retried.method).toBe('put');
    expect(retried.__useSupabaseMemoryFunctions).toBe(true);
  });

  it('sends delete to /api/v1/memory/delete?id=', async () => {
    const handler = directApiClient(true);
    const out = await handler({ headers: {}, url: `/api/v1/memories/${ID}`, method: 'delete' });
    expect(out.method).toBe('delete');
    expect(out.url).toBe('/api/v1/memory/delete');
    expect(out.params).toEqual({ id: ID });
  });

  it('leaves get, and the MCP transport, unchanged', async () => {
    const direct = directApiClient(true);
    const get = await direct({ headers: {}, url: `/api/v1/memories/${ID}`, method: 'get' });
    expect(get.url).toBe(`/api/v1/memories/${ID}`);
    const mcp = directApiClient(false);
    const put = await mcp({ headers: {}, url: `/api/v1/memories/${ID}`, method: 'put', data: { content: 'new' } });
    expect(put.baseURL).toBe('https://mcp.lanonasis.com/api/v1');
    expect(put.url).toBe(`/memory/${ID}`);
    expect(put.method).toBe('put');
  });
});
