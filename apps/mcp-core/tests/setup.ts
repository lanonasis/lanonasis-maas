import { jest } from '@jest/globals';

// Basic Supabase client stub used across tests
const supabaseStub = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn()
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    eq: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    overlaps: jest.fn(() => ({
      order: jest.fn(() => ({
        range: jest.fn()
      }))
    })),
    order: jest.fn(() => ({
      range: jest.fn()
    })),
    range: jest.fn()
  })),
  rpc: jest.fn()
};

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: () => supabaseStub
}));

// Mock OpenAI SDK
const mockEmbeddingsCreate = jest.fn();
jest.unstable_mockModule('openai', () => ({
  __esModule: true,
  default: class MockOpenAI {
    embeddings = {
      create: mockEmbeddingsCreate
    };
  }
}));

// Provide default environment configuration for tests
process.env.SUPABASE_URL=https://<project-ref>.supabase.co
process.env.SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
process.env.OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
process.env.OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
process.env.EMBEDDING_PROVIDER_PRIORITY = process.env.EMBEDDING_PROVIDER_PRIORITY || 'openai,local';
process.env.EMBEDDING_MAX_RETRIES = process.env.EMBEDDING_MAX_RETRIES || '2';
process.env.EMBEDDING_RETRY_DELAY_MS = process.env.EMBEDDING_RETRY_DELAY_MS || '10';

// Export helpers for tests
export const getSupabaseStub = () => supabaseStub;
export const getOpenAIStub = () => ({
  embeddings: {
    create: mockEmbeddingsCreate
  }
});
