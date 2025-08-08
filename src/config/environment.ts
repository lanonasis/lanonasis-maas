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
  
  // API Key Configuration
  API_KEY_ENCRYPTION_KEY: z.string().length(32, 'API_KEY_ENCRYPTION_KEY must be exactly 32 characters'),
  API_KEY_PREFIX_DEVELOPMENT: z.string().default('sk_test_'),
  API_KEY_PREFIX_PRODUCTION: z.string().default('sk_live_'),
  API_KEY_DEFAULT_EXPIRY_DAYS: z.string().transform(Number).default('365'),
  
  // MCP (Model Context Protocol) Configuration
  MCP_ENABLED: z.string().transform(val => val === 'true').default('true'),
  MCP_ACCESS_REQUEST_EXPIRY_HOURS: z.string().transform(Number).default('24'),
  MCP_SESSION_TIMEOUT_HOURS: z.string().transform(Number).default('8'),
  MCP_MAX_TOOLS_PER_KEY: z.string().transform(Number).default('10'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  
  // Redis (REQUIRED for API key caching)
  REDIS_URL: z.string().url('Redis URL is required for API key caching'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_KEY_PREFIX: z.string().default('maas:'),
  REDIS_API_KEY_TTL: z.string().transform(Number).default('300'),
  REDIS_SESSION_TTL: z.string().transform(Number).default('28800'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // API
  API_VERSION: z.string().default('v1'),
  API_PREFIX: z.string().default('/api'),
  
  // Security & Monitoring
  SECURITY_ALERT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  SECURITY_ALERT_THRESHOLD_CRITICAL: z.string().transform(Number).default('5'),
  SECURITY_ALERT_THRESHOLD_HIGH: z.string().transform(Number).default('10'),
  ANOMALY_DETECTION_ENABLED: z.string().transform(val => val === 'true').default('true'),
  ANOMALY_DETECTION_SENSITIVITY: z.string().transform(Number).default('0.85'),
  
  // Auto-suspension thresholds
  AUTO_SUSPEND_FAILED_AUTH_ATTEMPTS: z.string().transform(Number).default('10'),
  AUTO_SUSPEND_RATE_LIMIT_VIOLATIONS: z.string().transform(Number).default('50'),
  AUTO_SUSPEND_ANOMALY_SCORE: z.string().transform(Number).default('0.95'),
  
  // Enterprise Features (optional)
  HSM_ENABLED: z.string().transform(val => val === 'true').default('false'),
  HSM_MODULE_PATH: z.string().optional(),
  HSM_SLOT_ID: z.string().transform(Number).optional(),
  HSM_PIN: z.string().optional(),
  HSM_KEY_LABEL: z.string().optional(),
  
  // Proxy Token Configuration
  PROXY_TOKEN_ENABLED: z.string().transform(val => val === 'true').default('true'),
  PROXY_TOKEN_EXPIRY_HOURS: z.string().transform(Number).default('1'),
  PROXY_TOKEN_MAX_USES: z.string().transform(Number).default('100'),
  
  // Backup & Recovery
  BACKUP_ENABLED: z.string().transform(val => val === 'true').default('true'),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).default('30'),
  BACKUP_ENCRYPTION_ENABLED: z.string().transform(val => val === 'true').default('true'),
  BACKUP_S3_BUCKET: z.string().optional(),
  BACKUP_S3_PREFIX: z.string().optional(),
  
  // Key Rotation
  KEY_ROTATION_REMINDER_DAYS: z.string().transform(Number).default('30'),
  KEY_ROTATION_ENFORCE_DAYS: z.string().transform(Number).default('90'),
  
  // Analytics & Telemetry
  ANALYTICS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  TELEMETRY_ENDPOINT: z.string().url().optional(),
  USAGE_TRACKING: z.string().transform(val => val === 'true').default('true'),
  ANALYTICS_BATCH_SIZE: z.string().transform(Number).default('100'),
  ANALYTICS_FLUSH_INTERVAL_MS: z.string().transform(Number).default('60000'),
  
  // Metrics Retention
  METRICS_RETENTION_DAYS: z.string().transform(Number).default('90'),
  METRICS_AGGREGATION_ENABLED: z.string().transform(val => val === 'true').default('true'),
  METRICS_AGGREGATION_INTERVALS: z.string().default('hour,day,week,month'),
  
  // Monitoring
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090'),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3001'),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('true'),
  
  // Optional Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // Optional AWS Configuration
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional()
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

// Additional validation for conditional requirements
const validateConditionalRequirements = (config: z.infer<typeof envSchema>) => {
  // HSM validation
  if (config.HSM_ENABLED && (!config.HSM_MODULE_PATH || !config.HSM_PIN)) {
    throw new Error('HSM_MODULE_PATH and HSM_PIN are required when HSM_ENABLED is true');
  }
  
  // Backup S3 validation
  if (config.BACKUP_ENABLED && config.BACKUP_S3_BUCKET && !config.AWS_ACCESS_KEY_ID) {
    throw new Error('AWS credentials are required when using S3 for backups');
  }
  
  // Email configuration validation
  if (config.SMTP_HOST && (!config.SMTP_USER || !config.SMTP_PASS || !config.FROM_EMAIL)) {
    throw new Error('Complete SMTP configuration required when SMTP_HOST is provided');
  }
  
  // API key prefix validation for production
  if (config.NODE_ENV === 'production' && config.API_KEY_PREFIX_PRODUCTION.includes('test')) {
    throw new Error('Production API key prefix should not contain "test"');
  }
  
  return config;
};

export const config = validateConditionalRequirements(validateEnv());

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Helper function to get current API key prefix
export const getCurrentApiKeyPrefix = () => {
  return isProduction ? config.API_KEY_PREFIX_PRODUCTION : config.API_KEY_PREFIX_DEVELOPMENT;
};

// Helper function to parse aggregation intervals
export const getAggregationIntervals = (): string[] => {
  return config.METRICS_AGGREGATION_INTERVALS.split(',').map(i => i.trim());
};

// Helper function to parse CORS origins
export const getCorsOrigins = (): string[] => {
  return config.CORS_ORIGIN.split(',').map(origin => origin.trim());
};

// Export type for use in other modules
export type AppConfig = z.infer<typeof envSchema>;