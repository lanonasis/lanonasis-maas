import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),
  
  // Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  
  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // API
  API_VERSION: z.string().default('v1'),
  API_PREFIX: z.string().default('/api'),
  
  // Monitoring
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090')
});

const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
};

export const config = validateEnv();

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';