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
// Core Exports (Browser-Safe)
// ========================================
export { CoreMemoryClient, createMemoryClient } from './core/client';
export type {
  CoreMemoryClientConfig,
  ApiResponse,
  ApiError,
  PaginatedResponse
} from './core/client';

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
  MemoryStatus
} from './core/types';

export {
  MEMORY_TYPES,
  MEMORY_STATUSES,
  createMemorySchema,
  updateMemorySchema,
  searchMemorySchema,
  createTopicSchema
} from './core/types';

// ========================================
// Errors
// ========================================
export {
  MemoryClientError,
  ApiError as ApiErrorClass,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  RateLimitError,
  NotFoundError
} from './core/errors';

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
