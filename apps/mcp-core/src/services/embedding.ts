import crypto from 'crypto';
import fetch, { Response } from 'node-fetch';
import OpenAI from 'openai';

import { config, isProviderConfigured } from '../config/environment';
import { metrics } from '../../../../src/utils/metrics';
import { logger, logPerformance } from '../../../../src/utils/logger';
import { InternalServerError } from '../../../../src/middleware/errorHandler';

export type EmbeddingProviderName = 'openai' | 'azure' | 'local';

export interface EmbeddingContext {
  organizationId?: string;
  userId?: string;
  memoryId?: string;
  operation?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  provider: EmbeddingProviderName;
  tokensUsed: number;
  costUSD: number;
}

class EmbeddingProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: EmbeddingProviderName,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EmbeddingProviderError';
  }
}

interface EmbeddingProvider {
  readonly name: EmbeddingProviderName;
  readonly defaultModel: string;
  isAvailable(): boolean;
  generateEmbedding(text: string, context?: EmbeddingContext): Promise<EmbeddingResponse>;
}

const sanitizeInput = (text: string): string => {
  const trimmed = text.trim();
  const maxLength = 8000;
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return trimmed.slice(0, maxLength);
};

const approximateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name: EmbeddingProviderName = 'openai';
  public readonly defaultModel: string;
  private readonly client: OpenAI | null;

  constructor(model: string, apiKey?: string) {
    this.defaultModel = model;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  isAvailable(): boolean {
    return Boolean(this.client);
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new EmbeddingProviderError('OpenAI client is not configured', this.name);
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.defaultModel,
        input: sanitizeInput(text)
      });

      const embedding = response.data?.[0]?.embedding;
      if (!embedding || embedding.length === 0) {
        throw new EmbeddingProviderError('OpenAI returned an empty embedding', this.name);
      }

      const tokensUsed = response.usage?.total_tokens ?? approximateTokens(text);
      const costUSD = (tokensUsed / 1000) * config.openai.costPer1kTokens;

      return {
        embedding,
        model: response.model ?? this.defaultModel,
        provider: this.name,
        tokensUsed,
        costUSD
      };
    } catch (error) {
      throw new EmbeddingProviderError('OpenAI embedding request failed', this.name, error);
    }
  }
}

class AzureOpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name: EmbeddingProviderName = 'azure';
  public readonly defaultModel: string;

  constructor(
    private readonly endpoint?: string,
    private readonly apiKey?: string,
    private readonly deployment?: string,
    private readonly apiVersion?: string,
    private readonly costPer1kTokens?: number
  ) {
    this.defaultModel = deployment ?? 'azure-embedding';
  }

  isAvailable(): boolean {
    return Boolean(this.endpoint && this.apiKey && this.deployment);
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!this.isAvailable() || !this.endpoint || !this.apiKey || !this.deployment) {
      throw new EmbeddingProviderError('Azure OpenAI is not properly configured', this.name);
    }

    const url = `${this.endpoint.replace(/\/+$/, '')}/openai/deployments/${this.deployment}/embeddings?api-version=${this.apiVersion}`;

    const payload = {
      input: sanitizeInput(text)
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new EmbeddingProviderError('Azure OpenAI network error', this.name, error);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => undefined);
      throw new EmbeddingProviderError(
        `Azure OpenAI returned HTTP ${response.status}`,
        this.name,
        errorBody
      );
    }

    const json = await response.json();
    const embedding = json?.data?.[0]?.embedding as number[] | undefined;

    if (!embedding || embedding.length === 0) {
      throw new EmbeddingProviderError('Azure OpenAI returned an empty embedding', this.name, json);
    }

    const tokensUsed = json?.usage?.total_tokens ?? approximateTokens(text);
    const costPer1k = this.costPer1kTokens ?? config.azure.costPer1kTokens;
    const costUSD = (tokensUsed / 1000) * costPer1k;

    return {
      embedding,
      model: this.defaultModel,
      provider: this.name,
      tokensUsed,
      costUSD
    };
  }
}

class LocalEmbeddingProvider implements EmbeddingProvider {
  public readonly name: EmbeddingProviderName = 'local';
  public readonly defaultModel = 'local-hash-embedding';

  constructor(private readonly dimension: number) {}

  isAvailable(): boolean {
    return true;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const normalized = sanitizeInput(text);
    const hash = crypto.createHash('sha256').update(normalized).digest();
    const embedding: number[] = Array.from({ length: this.dimension }, (_, index) => {
      const value = hash[index % hash.length];
      return (value / 255) * 2 - 1; // Normalize to [-1, 1]
    });

    const tokensUsed = approximateTokens(normalized);

    return {
      embedding,
      model: this.defaultModel,
      provider: this.name,
      tokensUsed,
      costUSD: 0
    };
  }
}

export class EmbeddingService {
  private readonly providers: EmbeddingProvider[];

  constructor(providers?: EmbeddingProvider[]) {
    if (providers?.length) {
      this.providers = providers;
      return;
    }

    const instantiatedProviders: EmbeddingProvider[] = [];

    for (const providerName of config.providerPriority) {
      if (!isProviderConfigured(providerName)) {
        continue;
      }

      if (providerName === 'openai') {
        instantiatedProviders.push(
          new OpenAIEmbeddingProvider(config.openai.model, config.openai.apiKey)
        );
      } else if (providerName === 'azure') {
        instantiatedProviders.push(
          new AzureOpenAIEmbeddingProvider(
            config.azure.endpoint,
            config.azure.apiKey,
            config.azure.deployment,
            config.azure.apiVersion,
            config.azure.costPer1kTokens
          )
        );
      } else if (providerName === 'local') {
        instantiatedProviders.push(
          new LocalEmbeddingProvider(config.embedding.localDimension)
        );
      }
    }

    // Always ensure we have at least one provider
    if (instantiatedProviders.length === 0) {
      instantiatedProviders.push(new LocalEmbeddingProvider(config.embedding.localDimension));
    }

    this.providers = instantiatedProviders;
  }

  private async executeWithRetry(
    provider: EmbeddingProvider,
    text: string,
    context?: EmbeddingContext
  ): Promise<EmbeddingResponse> {
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= config.embedding.maxRetries) {
      try {
        const response = await provider.generateEmbedding(text, context);
        return response;
      } catch (error) {
        lastError = error;
        attempt += 1;

        if (attempt > config.embedding.maxRetries) {
          throw error;
        }

        const backoff = config.embedding.retryDelayMs * Math.pow(2, attempt - 1);
        logger.warn('Embedding provider attempt failed', {
          provider: provider.name,
          attempt,
          maxRetries: config.embedding.maxRetries,
          backoff
        });

        await sleep(backoff);
      }
    }

    throw lastError ?? new EmbeddingProviderError('Unknown embedding failure', provider.name);
  }

  async generateEmbedding(text: string, context?: EmbeddingContext): Promise<EmbeddingResponse> {
    if (!text || !text.trim()) {
      throw new EmbeddingProviderError('Input text must not be empty', 'local');
    }

    const sanitized = sanitizeInput(text);
    const startTime = Date.now();
    let lastError: unknown = null;

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        continue;
      }

      try {
        const response = await this.executeWithRetry(provider, sanitized, context);

        metrics.incrementCounter('embedding_requests_total', {
          provider: provider.name,
          model: response.model,
          outcome: 'success'
        });

        if (response.tokensUsed > 0) {
          metrics.incrementCounter('embedding_tokens_total', {
            provider: provider.name,
            model: response.model
          }, response.tokensUsed);
        }

        if (response.costUSD > 0) {
          metrics.incrementCounter('embedding_cost_usd_total', {
            provider: provider.name,
            model: response.model
          }, response.costUSD);
        }

        logPerformance('embedding_generation', Date.now() - startTime, {
          provider: provider.name,
          model: response.model,
          organizationId: context?.organizationId,
          operation: context?.operation ?? 'unknown'
        });

        return response;
      } catch (error) {
        lastError = error;
        metrics.incrementCounter('embedding_requests_total', {
          provider: provider.name,
          model: provider.defaultModel,
          outcome: 'failure'
        });

        logger.warn('Embedding provider failed, attempting fallback', {
          provider: provider.name,
          error: error instanceof Error ? error.message : 'unknown'
        });
      }
    }

    logger.error('All embedding providers failed', {
      providers: this.providers.map(p => p.name),
      lastError: lastError instanceof Error ? lastError.message : lastError
    });

    throw new InternalServerError('Failed to generate text embedding');
  }
}
