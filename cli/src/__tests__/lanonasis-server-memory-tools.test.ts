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

const MockServer = jest.fn().mockImplementation(() => ({
  setRequestHandler: jest.fn(),
}));

jest.unstable_mockModule('axios', () => ({
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
  create: jest.fn(() => mockAxiosInstance),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: MockServer,
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

const { LanonasisMCPServer } = await import('../mcp/server/lanonasis-server.js');

describe('LanonasisMCPServer memory tool argument handling', () => {
  let server: any;
  let apiClient: {
    getMemory: ReturnType<typeof jest.fn>;
    updateMemory: ReturnType<typeof jest.fn>;
    deleteMemory: ReturnType<typeof jest.fn>;
  };

  beforeEach(() => {
    apiClient = {
      getMemory: jest.fn().mockResolvedValue({ id: '12345678' }),
      updateMemory: jest.fn().mockResolvedValue({ id: '12345678', title: 'Updated' }),
      deleteMemory: jest.fn().mockResolvedValue(undefined),
    };

    server = new LanonasisMCPServer();
    server.apiClient = apiClient;
  });

  it('accepts the canonical id field for memory_get', async () => {
    await server.handleToolCall('memory_get', { id: '12345678' });

    expect(apiClient.getMemory).toHaveBeenCalledWith('12345678');
  });

  it('keeps supporting the legacy memory_id field for memory_get', async () => {
    await server.handleToolCall('memory_get', { memory_id: '12345678' });

    expect(apiClient.getMemory).toHaveBeenCalledWith('12345678');
  });

  it('strips both id aliases from update payloads before forwarding', async () => {
    await server.handleToolCall('memory_update', {
      id: '12345678',
      memory_id: 'legacy-value-ignored',
      title: 'Updated title',
      tags: ['prefix'],
    });

    expect(apiClient.updateMemory).toHaveBeenCalledWith('12345678', {
      title: 'Updated title',
      tags: ['prefix'],
    });
  });

  it('accepts the canonical id field for memory_delete', async () => {
    await server.handleToolCall('memory_delete', { id: '12345678' });

    expect(apiClient.deleteMemory).toHaveBeenCalledWith('12345678');
  });
});
