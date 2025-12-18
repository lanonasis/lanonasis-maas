/**
 * @lanonasis/memory-client/core
 *
 * Pure browser-safe Memory Client
 * NO Node.js dependencies, NO CLI code, NO child_process
 * Works in: Browser, React Native, Cloudflare Workers, Edge Functions, Deno, Bun
 *
 * Bundle size: ~15KB gzipped
 */

// Client
export {
  CoreMemoryClient,
  createMemoryClient
} from './client';

export type {
  CoreMemoryClientConfig,
  ApiResponse,
  ApiError,
  PaginatedResponse
} from './client';

// Types
export type {
  MemoryEntry,
  MemoryTopic,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  CreateTopicRequest,
  MemorySearchResult,
  UserMemoryStats,
  MemoryType,
  MemoryStatus
} from './types';

export {
  MEMORY_TYPES,
  MEMORY_STATUSES,
  createMemorySchema,
  updateMemorySchema,
  searchMemorySchema,
  createTopicSchema
} from './types';

// Errors
export {
  MemoryClientError,
  ApiError as ApiErrorClass,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  RateLimitError,
  NotFoundError
} from './errors';

// Constants
export const VERSION = '2.0.0';
export const CLIENT_NAME = '@lanonasis/memory-client';

// Environment detection (browser-safe)
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof globalThis !== 'undefined' && 'process' in globalThis && globalThis.process?.versions?.node;

// Default configurations for different environments
export const defaultConfigs = {
  development: {
    apiUrl: 'http://localhost:3001',
    timeout: 30000,
  },
  production: {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 15000,
  },
  edge: {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 5000, // Lower timeout for edge environments
  }
} as const;
