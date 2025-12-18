/**
 * @lanonasis/memory-client/react
 *
 * React hooks and components for Memory Client
 * Requires React 16.8+ (hooks support)
 */

// Provider
export { MemoryProvider, MemoryContext } from './provider';
export type { MemoryProviderProps } from './provider';

// Hooks
export {
  useMemoryClient,
  useMemories,
  useMemory,
  useCreateMemory,
  useSearchMemories
} from './hooks';

export type {
  UseMemoriesResult,
  UseMemoryResult,
  UseCreateMemoryResult,
  UseSearchMemoriesResult
} from './hooks';

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
  ApiError,
  PaginatedResponse
} from '../core/client';
