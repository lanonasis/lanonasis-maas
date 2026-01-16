/**
 * @lanonasis/memory-client/vue
 *
 * Vue 3 composables and plugin for Memory Client
 * Requires Vue 3.0+
 */

// Plugin
export {
  createMemoryPlugin,
  useMemoryClient,
  MEMORY_CLIENT_KEY
} from './plugin';

export type {
  MemoryPluginOptions
} from './plugin';

// Composables
export {
  useMemories,
  useMemory,
  useCreateMemory,
  useSearchMemories
} from './composables';

// Re-export core types for convenience
export type {
  MemoryEntry,
  MemoryTopic,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  MemorySearchResult,
  UserMemoryStats,
  MemoryType,
  MemoryStatus
} from '../core/types';

export type {
  CoreMemoryClient,
  CoreMemoryClientConfig,
  ApiResponse,
  PaginatedResponse
} from '../core/client';

export type { ApiErrorResponse, ErrorCode } from '../core/errors';
