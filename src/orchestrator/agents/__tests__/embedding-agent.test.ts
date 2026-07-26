import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmbeddingAgent } from '../embedding-agent';

describe('EmbeddingAgent API key guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('does not send a single embedding request without an API key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const agent = new EmbeddingAgent();

    await expect(agent.process({
      input: 'embed this text',
      context: {},
    })).resolves.toEqual({
      success: false,
      error: 'OpenAI API key is not configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not send a batch request without an API key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const agent = new EmbeddingAgent();

    await expect(agent.process({
      input: 'batch vectors',
      context: {},
      parameters: {
        operation: 'batch_embed',
        texts: ['one', 'two'],
      },
    })).resolves.toEqual({
      success: false,
      error: 'OpenAI API key is not configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
