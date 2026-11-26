import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Regression tests for APIClient transport routing:
//   - Memory operations go to mcp.lanonasis.com by default.
//   - Non-memory direct-API calls honour forceApi and go to config.getApiUrl().
//   - API-key and auth endpoints always go to auth_base (#153).
//
// Restored after lanonasis-maas #154 deleted this file. Its former cases that
// pinned memory ops to the MCP host under --no-mcp (#139) and the CLI-side
// memory_type/type alias were dropped: api.lanonasis.com now serves the memory
// routes, and mcp-core resolves both type spellings server-side.

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

  it('routes non-memory endpoints to config.getApiUrl() when forceApi is set', async () => {
    const client = new APIClient();
    stubConfig(client, { forceApi: true, connectionTransport: 'api' });

    const updated = await runInterceptor({ url: '/api/v1/topics', method: 'get' });

    expect(updated.baseURL).toBe('https://api.example.com');
    expect(updated.url).toBe('/api/v1/topics');
  });

  // mcp.lanonasis.com serves no /api/v1/api-keys route, so anything sent there
  // returns 404. `lanonasis api-keys create` hit exactly that under token auth,
  // and only worked with --no-mcp.
  it('routes api-key management to auth_base, not the MCP server', async () => {
    const client = new APIClient();
    stubConfig(client, { authMethod: 'jwt' });

    const updated = await runInterceptor({ url: '/api/v1/api-keys', method: 'post' });

    expect(updated.baseURL).toBe('https://auth.example.com');
    expect(updated.baseURL).not.toContain('mcp.lanonasis.com');
  });

  it('routes api-key projects to auth_base', async () => {
    const client = new APIClient();
    stubConfig(client, { authMethod: 'jwt' });

    const updated = await runInterceptor({ url: '/api/v1/api-keys/projects', method: 'get' });

    expect(updated.baseURL).toBe('https://auth.example.com');
  });

  it('keeps api-key management on auth_base under forceApi too', async () => {
    const client = new APIClient();
    stubConfig(client, { forceApi: true, connectionTransport: 'api' });

    const updated = await runInterceptor({ url: '/api/v1/api-keys', method: 'get' });

    expect(updated.baseURL).toBe('https://auth.example.com');
  });

  it('routes auth endpoints to auth_base regardless of forceApi', async () => {
    const client = new APIClient();
    stubConfig(client, { forceApi: true, connectionTransport: 'api' });

    const updated = await runInterceptor({ url: '/v1/auth/me', method: 'get' });

    expect(updated.baseURL).toBe('https://auth.example.com');
  });

});
