import { z } from 'zod';

const DEFAULT_PROVIDER_PRIORITY = ['openai', 'azure', 'local'] as const;
const DEFAULT_OPENAI_COST_PER_1K = 0.00002; // USD
const DEFAULT_AZURE_COST_PER_1K = 0.00002; // Align with OpenAI small embedding model

const rawConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  EMBEDDING_PROVIDER_PRIORITY: z.string().optional(),
  EMBEDDING_MAX_RETRIES: z.coerce.number().min(0).max(10).default(3),
  EMBEDDING_RETRY_DELAY_MS: z.coerce.number().min(0).max(10_000).default(250),
  EMBEDDING_LOCAL_DIMENSION: z.coerce.number().min(32).max(4096).default(1536),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_EMBEDDING_COST_PER_1K_TOKENS: z.coerce.number().optional(),

  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_KEY: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-02-01'),
  AZURE_OPENAI_COST_PER_1K_TOKENS: z.coerce.number().optional()
});

const parseProviderPriority = (raw?: string): string[] => {
  if (!raw || !raw.trim()) {
    return [...DEFAULT_PROVIDER_PRIORITY];
  }

  return raw
    .split(',')
    .map(provider => provider.trim().toLowerCase())
    .filter(Boolean);
};

const rawConfig = rawConfigSchema.parse(process.env);

const providerPriority = parseProviderPriority(rawConfig.EMBEDDING_PROVIDER_PRIORITY);

export const config = {
  supabaseUrl: rawConfig.SUPABASE_URL,
  supabaseServiceKey: rawConfig.SUPABASE_SERVICE_KEY,
  providerPriority,
  embedding: {
    maxRetries: rawConfig.EMBEDDING_MAX_RETRIES,
    retryDelayMs: rawConfig.EMBEDDING_RETRY_DELAY_MS,
    localDimension: rawConfig.EMBEDDING_LOCAL_DIMENSION
  },
  openai: {
    apiKey: rawConfig.OPENAI_API_KEY,
    model: rawConfig.OPENAI_EMBEDDING_MODEL,
    costPer1kTokens: rawConfig.OPENAI_EMBEDDING_COST_PER_1K_TOKENS ?? DEFAULT_OPENAI_COST_PER_1K
  },
  azure: {
    endpoint: rawConfig.AZURE_OPENAI_ENDPOINT,
    apiKey: rawConfig.AZURE_OPENAI_KEY,
    deployment: rawConfig.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: rawConfig.AZURE_OPENAI_API_VERSION,
    costPer1kTokens: rawConfig.AZURE_OPENAI_COST_PER_1K_TOKENS ?? DEFAULT_AZURE_COST_PER_1K
  }
} as const;

export type AppConfig = typeof config;

export const isProviderConfigured = (provider: string): boolean => {
  switch (provider) {
    case 'openai':
      return Boolean(config.openai.apiKey);
    case 'azure':
      return Boolean(
        config.azure.endpoint &&
        config.azure.apiKey &&
        config.azure.deployment
      );
    case 'local':
      return true;
    default:
      return false;
  }
};
