import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

let setupModule: typeof import('../setup');

beforeEach(async () => {
  jest.resetModules();
  setupModule = await import('../setup');
  setupModule.getOpenAIStub().embeddings.create.mockReset();
});

afterEach(() => {
  jest.resetModules();
});

describe('EmbeddingService', () => {
  it('uses OpenAI provider when configured', async () => {
    const openaiStub = setupModule.getOpenAIStub();
    openaiStub.embeddings.create.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
      model: 'text-embedding-3-small',
      usage: { total_tokens: 16 }
    });

    const { EmbeddingService } = await import('../../src/services/embedding');

    const service = new EmbeddingService();
    const result = await service.generateEmbedding('hello embeddings');

    expect(result.provider).toBe('openai');
    expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(result.tokensUsed).toBe(16);
    expect(openaiStub.embeddings.create).toHaveBeenCalledTimes(1);
  });

  it('falls back to local provider when OpenAI fails', async () => {
    const originalPriority = process.env.EMBEDDING_PROVIDER_PRIORITY;
    process.env.EMBEDDING_PROVIDER_PRIORITY = 'openai,local';

    jest.resetModules();
    setupModule = await import('../setup');
    const fallbackOpenAI = setupModule.getOpenAIStub();
    fallbackOpenAI.embeddings.create.mockRejectedValue(new Error('rate limit'));

    const { EmbeddingService } = await import('../../src/services/embedding');

    const service = new EmbeddingService();
    const result = await service.generateEmbedding('local fallback');

    expect(result.provider).toBe('local');
    expect(result.embedding.length).toBeGreaterThan(0);

    process.env.EMBEDDING_PROVIDER_PRIORITY = originalPriority;
  });

  it('rejects empty input text', async () => {
    const { EmbeddingService } = await import('../../src/services/embedding');
    const service = new EmbeddingService();

    await expect(service.generateEmbedding('   ')).rejects.toThrow('Input text must not be empty');
  });
});
