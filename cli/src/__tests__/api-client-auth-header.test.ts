import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Capture the request interceptor the API client registers so we can invoke it manually
const requestHandlers: Array<(config: any) => any> = [];

// Minimal axios mock with interceptor support
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
  post: jest.fn()
};

jest.unstable_mockModule('axios', () => ({
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
  create: jest.fn(() => mockAxiosInstance),
}));

const { APIClient } = await import('../utils/api.js');

describe('APIClient authentication headers', () => {
  beforeEach(() => {
    requestHandlers.length = 0;
    mockAxiosInstance.interceptors.request.use.mockClear();
    mockAxiosInstance.interceptors.response.use.mockClear();
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
  });

  it('prefers vendor key from secure storage when configuring requests', async () => {
    const client = new APIClient();
    const config = (client as any).config;

    // Stub config methods to avoid filesystem/network calls
    config.init = jest.fn().mockResolvedValue(undefined);
    config.discoverServices = jest.fn().mockResolvedValue(undefined);
    config.get = jest.fn().mockReturnValue({ auth_base: 'https://auth.example.com' });
    config.getApiUrl = jest.fn().mockReturnValue('https://api.example.com');
    config.getToken = jest.fn().mockReturnValue(undefined);
    config.getVendorKeyAsync = jest.fn().mockResolvedValue('vk_test_123');

    // Execute the registered interceptor
    const handler = requestHandlers[0];
    const updated = await handler({
      headers: {},
      url: '/memories',
      method: 'get'
    });

    expect(updated.baseURL).toBe('https://api.example.com');
    expect(updated.headers['X-API-Key']).toBe('vk_test_123');
    expect(updated.headers['X-Auth-Method']).toBe('vendor_key');
    expect(updated.headers['X-Project-Scope']).toBe('lanonasis-maas');
    expect(config.getVendorKeyAsync).toHaveBeenCalled();
  });

  it('falls back to JWT bearer auth when no vendor key is available', async () => {
    const client = new APIClient();
    const config = (client as any).config;

    config.init = jest.fn().mockResolvedValue(undefined);
    config.discoverServices = jest.fn().mockResolvedValue(undefined);
    config.get = jest.fn((key: string) => {
      if (key === 'discoveredServices') return { auth_base: 'https://auth.example.com' };
      if (key === 'authMethod') return 'jwt';
      if (key === 'forceApi') return false;
      if (key === 'connectionTransport') return 'auto';
      return undefined;
    });
    config.getApiUrl = jest.fn().mockReturnValue('https://api.example.com');
    config.getToken = jest.fn().mockReturnValue('jwt-token-abc');
    config.getVendorKeyAsync = jest.fn().mockResolvedValue(undefined);

    const handler = requestHandlers[0];
    const updated = await handler({
      headers: {},
      url: '/memories',
      method: 'get'
    });

    expect(updated.headers.Authorization).toBe('Bearer jwt-token-abc');
    expect(updated.headers['X-Auth-Method']).toBe('jwt');
    expect(updated.baseURL).toBe('https://mcp.lanonasis.com/api/v1');
  });

  it('forces direct API routing when forceApi is enabled in config', async () => {
    const client = new APIClient();
    const config = (client as any).config;

    config.init = jest.fn().mockResolvedValue(undefined);
    config.discoverServices = jest.fn().mockResolvedValue(undefined);
    config.get = jest.fn((key: string) => {
      if (key === 'discoveredServices') return { auth_base: 'https://auth.example.com' };
      if (key === 'authMethod') return 'oauth';
      if (key === 'forceApi') return true;
      if (key === 'connectionTransport') return 'api';
      return undefined;
    });
    config.getApiUrl = jest.fn().mockReturnValue('https://api.example.com');
    config.getToken = jest.fn().mockReturnValue('oauth-token-xyz');
    config.getVendorKeyAsync = jest.fn().mockResolvedValue(undefined);

    const handler = requestHandlers[0];
    const updated = await handler({
      headers: {},
      url: '/api/v1/memories/search',
      method: 'post'
    });

    expect(updated.baseURL).toBe('https://api.example.com');
    expect(updated.url).toBe('/api/v1/memories/search');
    expect(updated.headers.Authorization).toBe('Bearer oauth-token-xyz');
    expect(updated.headers['X-Auth-Method']).toBe('jwt');
  });

  it('prefers OAuth/JWT token headers over vendor key when both exist', async () => {
    const client = new APIClient();
    const config = (client as any).config;

    config.init = jest.fn().mockResolvedValue(undefined);
    config.discoverServices = jest.fn().mockResolvedValue(undefined);
    config.get = jest.fn((key: string) => {
      if (key === 'discoveredServices') return { auth_base: 'https://auth.example.com' };
      if (key === 'authMethod') return 'oauth';
      if (key === 'forceApi') return true;
      if (key === 'connectionTransport') return 'api';
      return undefined;
    });
    config.getApiUrl = jest.fn().mockReturnValue('https://api.example.com');
    config.getToken = jest.fn().mockReturnValue('oauth-token-xyz');
    config.getVendorKeyAsync = jest.fn().mockResolvedValue('vk_test_123');

    const handler = requestHandlers[0];
    const updated = await handler({
      headers: {},
      url: '/api/v1/memories/search',
      method: 'post'
    });

    expect(updated.baseURL).toBe('https://api.example.com');
    // Even in forced direct-API mode, bearer auth should take precedence when configured.
    expect(updated.headers.Authorization).toBe('Bearer oauth-token-xyz');
    expect(updated.headers['X-Auth-Method']).toBe('jwt');
    expect(updated.headers['X-API-Key']).toBeUndefined();
  });

  it('falls back to search endpoint when GET /memories is not allowed', async () => {
    const client = new APIClient();
    const config = (client as any).config;

    // Stub config methods to avoid touching ~/.maas or triggering network requests in the interceptor.
    config.init = jest.fn().mockResolvedValue(undefined);
    config.refreshTokenIfNeeded = jest.fn().mockResolvedValue(undefined);
    config.discoverServices = jest.fn().mockResolvedValue(undefined);
    config.get = jest.fn((key: string) => {
      // Keep routing deterministic for this test
      if (key === 'authMethod') return 'vendor_key';
      if (key === 'forceApi') return true;
      if (key === 'connectionTransport') return 'api';
      if (key === 'discoveredServices') return { auth_base: 'https://auth.example.com' };
      return undefined;
    });
    config.getApiUrl = jest.fn().mockReturnValue('https://api.example.com');
    config.getToken = jest.fn().mockReturnValue(undefined);
    config.getVendorKeyAsync = jest.fn().mockResolvedValue('vk_test_123');

    mockAxiosInstance.get.mockRejectedValue({
      response: { status: 405, data: { error: 'Method not allowed' } }
    });
    mockAxiosInstance.post.mockImplementation((url: string) => {
      if (url === '/api/v1/memory/list' || url === '/api/v1/memories/list') {
        return Promise.reject({
          response: { status: 405, data: { error: 'Method not allowed' } }
        });
      }

      if (url === '/api/v1/memories/search') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'm1',
                title: 'Test',
                content: 'Body',
                memory_type: 'context',
                tags: [],
                user_id: 'u1',
                organization_id: 'o1',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
                access_count: 0,
                similarity_score: 1
              }
            ],
            total: 1
          }
        });
      }

      return Promise.reject(new Error(`Unexpected POST call: ${url}`));
    });

    const result = await client.getMemories({ page: 1, limit: 1 });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/memories', { params: { page: 1, limit: 1 } });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/memories/search',
      expect.objectContaining({ query: '*', limit: 1, threshold: 0 })
    );
    expect(result.pagination.total).toBe(1);
    expect(result.memories?.length).toBe(1);
  });
});
