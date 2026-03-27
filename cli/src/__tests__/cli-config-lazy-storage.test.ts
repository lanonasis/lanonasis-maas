import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
};

jest.unstable_mockModule('axios', () => ({
  default: mockAxios,
}));

const oauthClientMock = await import('./mocks/oauth-client.js');
const { CLIConfig } = await import('../utils/config.js');

describe('CLIConfig lazy ApiKeyStorage initialization', () => {
  beforeEach(() => {
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();
    oauthClientMock.__resetMockApiKeyStorage();
  });

  it('does not construct ApiKeyStorage during CLIConfig creation', () => {
    new CLIConfig();

    expect(oauthClientMock.__getMockApiKeyStorageConstructorCount()).toBe(0);
  });

  it('constructs ApiKeyStorage only when vendor-key storage is accessed', async () => {
    const config = new CLIConfig();

    expect(oauthClientMock.__getMockApiKeyStorageConstructorCount()).toBe(0);

    await config.getVendorKeyAsync();

    expect(oauthClientMock.__getMockApiKeyStorageConstructorCount()).toBe(1);
  });
});
