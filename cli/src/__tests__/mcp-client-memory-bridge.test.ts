import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAxios = jest.fn();

jest.unstable_mockModule('axios', () => ({
  default: mockAxios,
  get: jest.fn(),
  post: jest.fn(),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn(),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn(),
}));

jest.unstable_mockModule('eventsource', () => ({
  EventSource: jest.fn(),
}));

jest.unstable_mockModule('ws', () => ({
  default: jest.fn(),
}));

const { MCPClient } = await import('../utils/mcp-client.js');

describe('MCPClient remote memory bridge', () => {
  let client: any;

  beforeEach(() => {
    mockAxios.mockReset();
    mockAxios.mockResolvedValue({ data: { ok: true } });

    client = new MCPClient();
    client.config.getMCPRestUrl = jest.fn().mockReturnValue('https://mcp.example.com/api/v1');
    client.resolveAuthCredential = jest.fn().mockResolvedValue({
      value: 'token-123',
      source: 'token',
    });
    client.buildAuthHeaders = jest.fn().mockReturnValue({
      Authorization: 'Bearer token-123',
    });
  });

  it('maps the canonical id field into the remote memory get endpoint', async () => {
    await client.callRemoteTool('memory_get_memory', { id: '12345678' });

    expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      url: 'https://mcp.example.com/api/v1/memory/12345678',
      params: undefined,
    }));
  });

  it('removes both id aliases from remote update payloads', async () => {
    await client.callRemoteTool('memory_update_memory', {
      id: '12345678',
      memory_id: 'legacy-value-ignored',
      title: 'Updated title',
    });

    expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT',
      url: 'https://mcp.example.com/api/v1/memory/12345678',
      data: { title: 'Updated title' },
    }));
  });
});
