/**
 * @lanonasis/memory-client
 *
 * Universal Memory as a Service (MaaS) Client SDK for Lanonasis
 * Intelligent memory management with semantic search capabilities
 *
 * v2.0.0 - Universal SDK Redesign
 * "Drop In and Sleep" Architecture - Works everywhere with zero configuration
 *
 * @example Browser/Web App
 * ```ts
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * const client = createMemoryClient({ apiKey: 'your-key' });
 * ```
 *
 * @example Node.js
 * ```ts
 * import { createNodeMemoryClient } from '@lanonasis/memory-client/node';
 * const client = await createNodeMemoryClient({ apiKey: process.env.KEY });
 * ```
 *
 * @example React
 * ```tsx
 * import { MemoryProvider, useMemories } from '@lanonasis/memory-client/react';
 * ```
 *
 * @example Vue
 * ```ts
 * import { createMemoryPlugin, useMemories } from '@lanonasis/memory-client/vue';
 * ```
 */

// ========================================
// Internal Imports (for use in this file)
// ========================================
import {
  CoreMemoryClient as _CoreMemoryClient,
  createMemoryClient as _createMemoryClient,
  type CoreMemoryClientConfig as _CoreMemoryClientConfig
} from './core/client';

// ========================================
// Core Exports (Browser-Safe)
// ========================================
export { CoreMemoryClient, createMemoryClient, hasError, hasData } from './core/client';
export type {
  CoreMemoryClientConfig,
  ApiResponse,
  PaginatedResponse
} from './core/client';

// ========================================
// Utilities
// ========================================
export {
  safeJsonParse,
  createErrorResponse,
  httpStatusToErrorCode,
  calculateRetryDelay,
  isRetryableError
} from './core/utils';
export type { SafeJsonResult } from './core/utils';

// ========================================
// Types (Shared)
// ========================================
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
} from './core/types';

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
} from './core/types';

// ========================================
// Errors
// ========================================
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
} from './core/errors';
export type { ApiErrorResponse, ErrorCode } from './core/errors';

// ========================================
// Constants
// ========================================
export const VERSION = '2.0.0';
export const CLIENT_NAME = '@lanonasis/memory-client';

// ========================================
// Environment Detection
// ========================================
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof globalThis !== 'undefined' && 'process' in globalThis && globalThis.process?.versions?.node;
export const isEdge = !isBrowser && !isNode;

/**
 * Detected runtime environment
 */
export type RuntimeEnvironment = 'browser' | 'node' | 'edge';

/**
 * Get the current runtime environment
 */
export function getEnvironment(): RuntimeEnvironment {
  if (isBrowser) return 'browser';
  if (isNode) return 'node';
  return 'edge';
}

// ========================================
// Auto-Detecting Client Factory
// ========================================

/**
 * Configuration for the auto-detecting client factory
 */
export interface AutoClientConfig {
  /** API endpoint URL (required) */
  apiUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Bearer token for authentication */
  authToken?: string;
  /** Organization ID */
  organizationId?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Retry configuration */
  retry?: {
    maxRetries?: number;
    retryDelay?: number;
    backoff?: 'linear' | 'exponential';
  };
  /** Node.js specific: prefer CLI when available */
  preferCLI?: boolean;
  /** Node.js specific: enable MCP channels */
  enableMCP?: boolean;
}

/**
 * Auto-detecting client factory - "Drop In and Sleep" architecture
 *
 * Automatically detects the runtime environment and returns the appropriate client:
 * - Browser/Edge: Returns CoreMemoryClient (lightweight, browser-safe)
 * - Node.js: Returns EnhancedMemoryClient (with CLI/MCP support)
 *
 * @example
 * ```typescript
 * import { createClient } from '@lanonasis/memory-client';
 *
 * // Works in any environment!
 * const client = await createClient({
 *   apiUrl: 'https://api.lanonasis.com',
 *   apiKey: 'your-key'
 * });
 *
 * const memories = await client.listMemories();
 * ```
 */
export async function createClient(config: AutoClientConfig): Promise<_CoreMemoryClient> {
  const environment = getEnvironment();

  if (environment === 'node') {
    try {
      // Dynamic import for Node.js client to avoid bundling in browser
      const { createNodeMemoryClient } = await import('./node/index');
      return await createNodeMemoryClient({
        ...config,
        preferCLI: config.preferCLI ?? true,
        enableMCP: config.enableMCP ?? true
      }) as unknown as _CoreMemoryClient;
    } catch {
      // Fallback to core client if Node module fails to load
      console.warn('Failed to load Node.js client, falling back to core client');
    }
  }

  // Browser, Edge, or fallback
  const clientConfig: _CoreMemoryClientConfig = {
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    authToken: config.authToken,
    organizationId: config.organizationId,
    timeout: config.timeout ?? (environment === 'edge' ? 5000 : 30000),
    headers: config.headers,
    retry: config.retry
  };

  return _createMemoryClient(clientConfig);
}

// ========================================
// Default Configurations
// ========================================
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
    timeout: 5000,
  }
} as const;

// ========================================
// Migration Guide & Deprecation Warnings
// ========================================

/**
 * **MIGRATION GUIDE: v1.x → v2.0**
 *
 * The main import still works but is larger. For optimal bundle size:
 *
 * **Browser/Web Apps:**
 * ```ts
 * // Old (v1.x) - still works but larger bundle
 * import { createMemoryClient } from '@lanonasis/memory-client';
 *
 * // New (v2.0) - optimized, smaller bundle
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * ```
 *
 * **Node.js with CLI Support:**
 * ```ts
 * // Old (v1.x)
 * import { createEnhancedMemoryClient } from '@lanonasis/memory-client';
 *
 * // New (v2.0)
 * import { createNodeMemoryClient } from '@lanonasis/memory-client/node';
 * ```
 *
 * **React:**
 * ```ts
 * // New in v2.0
 * import { MemoryProvider, useMemories } from '@lanonasis/memory-client/react';
 * ```
 *
 * **Vue:**
 * ```ts
 * // New in v2.0
 * import { createMemoryPlugin, useMemories } from '@lanonasis/memory-client/vue';
 * ```
 *
 * **Configuration Presets:**
 * ```ts
 * // New in v2.0
 * import { browserPreset, nodePreset } from '@lanonasis/memory-client/presets';
 * ```
 */

// ========================================
// Backward Compatibility
// ========================================

// For backward compatibility, export old names as aliases
export {
  CoreMemoryClient as MemoryClient,
  type CoreMemoryClientConfig as MemoryClientConfig
} from './core/client';

// Note: Enhanced client requires Node.js, so we don't export it from main entry
// Users should import from '@lanonasis/memory-client/node' instead

// ========================================
// Usage Instructions
// ========================================

/**
 * # @lanonasis/memory-client v2.0
 *
 * ## Quick Start
 *
 * ### Browser / Web App
 * ```bash
 * npm install @lanonasis/memory-client
 * ```
 * ```typescript
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 *
 * const client = createMemoryClient({
 *   apiUrl: 'https://api.lanonasis.com',
 *   apiKey: 'your-key-here'
 * });
 *
 * const memories = await client.listMemories();
 * ```
 *
 * ### Node.js with CLI Support
 * ```typescript
 * import { createNodeMemoryClient } from '@lanonasis/memory-client/node';
 *
 * const client = await createNodeMemoryClient({
 *   apiKey: process.env.LANONASIS_KEY,
 *   preferCLI: true // Automatically uses CLI if available
 * });
 *
 * const result = await client.listMemories();
 * console.log(`Using: ${result.source}`); // 'cli' or 'api'
 * ```
 *
 * ### React
 * ```tsx
 * import { MemoryProvider, useMemories } from '@lanonasis/memory-client/react';
 *
 * function App() {
 *   return (
 *     <MemoryProvider apiKey="your-key">
 *       <MemoryList />
 *     </MemoryProvider>
 *   );
 * }
 *
 * function MemoryList() {
 *   const { memories, loading } = useMemories();
 *   if (loading) return <div>Loading...</div>;
 *   return <div>{memories.map(m => <div key={m.id}>{m.title}</div>)}</div>;
 * }
 * ```
 *
 * ### Vue 3
 * ```typescript
 * import { createMemoryPlugin, useMemories } from '@lanonasis/memory-client/vue';
 *
 * const app = createApp(App);
 * app.use(createMemoryPlugin({ apiKey: 'your-key' }));
 * ```
 *
 * ### Edge Functions (Cloudflare Workers, Vercel Edge)
 * ```typescript
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * import { edgePreset } from '@lanonasis/memory-client/presets';
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const client = createMemoryClient(edgePreset({
 *       apiKey: env.LANONASIS_KEY
 *     }));
 *     const memories = await client.searchMemories({ query: 'test' });
 *     return Response.json(memories.data);
 *   }
 * };
 * ```
 *
 * ## Bundle Sizes
 *
 * - **Core** (browser): ~15KB gzipped
 * - **Node** (with CLI): ~35KB gzipped
 * - **React**: ~18KB gzipped (+ React)
 * - **Vue**: ~17KB gzipped (+ Vue)
 * - **Presets**: ~2KB gzipped
 *
 * ## Documentation
 *
 * - Full docs: https://docs.lanonasis.com/sdk
 * - API reference: https://docs.lanonasis.com/api
 * - Examples: https://github.com/lanonasis/examples
 */
