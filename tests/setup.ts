import { config } from 'dotenv';
import { afterAll, beforeAll, vi } from 'vitest';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-supabase-service-key';
process.env.SUPABASE_KEY = 'test-supabase-key';
process.env.JWT_SECRET = 'test-jwt-secret-0123456789abcdef';
process.env.API_KEY_ENCRYPTION_KEY = '12345678901234567890123456789012';
process.env.OPENAI_API_KEY = 'test-openai-api-key';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = vi.fn();
  console.info = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Mock OpenAI API
vi.mock('openai', () => {
  return {
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{
            embedding: new Array(1536).fill(0).map(() => Math.random())
          }]
        })
      }
    }))
  };
});

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn().mockResolvedValue({ data: [], error: null })
      })),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  };
});

// Mock Redis client
vi.mock('redis', () => {
  return {
    createClient: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1)
    }))
  };
});

vi.mock('@lanonasis/security-sdk/hash-utils', () => {
  return {
    ensureApiKeyHash: vi.fn((value: string) => `mock-hash-${value}`)
  };
}, { virtual: true });
