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
  defaults: {}
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
    config.get = jest.fn().mockReturnValue({ auth_base: 'https://auth.example.com' });
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
  });
});
