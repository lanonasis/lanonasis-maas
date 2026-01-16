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
  createMemoryClient,
  hasError,
  hasData
} from './client';

export type {
  CoreMemoryClientConfig,
  ApiResponse,
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
  MemoryStatus,
  // Intelligence types (v2.0)
  ChunkingStrategy,
  ContentType,
  ContentChunk,
  MemoryIntelligence,
  IntelligentMetadata,
  PreprocessingOptions,
  CreateMemoryWithPreprocessingRequest,
  UpdateMemoryWithPreprocessingRequest,
  // Enhanced search types
  SearchMode,
  MatchingChunk,
  SearchFilters,
  EnhancedSearchRequest,
  EnhancedMemorySearchResult,
  EnhancedSearchResponse,
  // Analytics types
  SearchAnalyticsDataPoint,
  PopularQuery,
  SearchAnalytics,
  MostAccessedMemory,
  HourlyAccess,
  AccessPatterns,
  ProjectMemoryCount,
  TagCount,
  ExtendedMemoryStats,
  AnalyticsDateRange
} from './types';

export {
  MEMORY_TYPES,
  MEMORY_STATUSES,
  createMemorySchema,
  updateMemorySchema,
  searchMemorySchema,
  createTopicSchema,
  // Intelligence constants & schemas (v2.0)
  CHUNKING_STRATEGIES,
  CONTENT_TYPES,
  SEARCH_MODES,
  preprocessingOptionsSchema,
  enhancedSearchSchema,
  analyticsDateRangeSchema
} from './types';

// Errors
export {
  MemoryClientError,
  ApiError,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  RateLimitError,
  NotFoundError,
  NetworkError,
  ServerError,
  createErrorFromStatus,
  isApiErrorResponse,
  ERROR_CODES
} from './errors';
export type { ApiErrorResponse, ErrorCode } from './errors';

// Utilities
export {
  safeJsonParse,
  createErrorResponse,
  httpStatusToErrorCode,
  calculateRetryDelay,
  isRetryableError
} from './utils';
export type { SafeJsonResult } from './utils';

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
