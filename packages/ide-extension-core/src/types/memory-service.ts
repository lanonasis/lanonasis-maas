/**
 * Memory Service Interfaces
 */

import {
  MemoryEntry,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  ListMemoriesRequest,
  MemorySearchResult,
  PaginatedResponse
} from './memory-aligned';

/**
 * Memory Service Mode
 */
export type MemoryServiceMode = 'cli' | 'gateway' | 'direct';

/**
 * Base Memory Service Interface
 */
export interface IMemoryService {
  /**
   * Create a new memory
   */
  createMemory(request: CreateMemoryRequest): Promise<MemoryEntry>;
  
  /**
   * Get a memory by ID
   */
  getMemory(id: string): Promise<MemoryEntry | null>;
  
  /**
   * Update a memory
   */
  updateMemory(id: string, request: UpdateMemoryRequest): Promise<MemoryEntry>;
  
  /**
   * Delete a memory
   */
  deleteMemory(id: string): Promise<void>;
  
  /**
   * List memories
   */
  listMemories(request?: ListMemoriesRequest): Promise<PaginatedResponse<MemoryEntry>>;
  
  /**
   * Search memories
   */
  searchMemories(request: SearchMemoryRequest): Promise<MemorySearchResult[]>;
}

/**
 * Enhanced Memory Service Interface
 * Extends base service with CLI integration and advanced features
 */
export interface IEnhancedMemoryService extends IMemoryService {
  /**
   * Get current service mode
   */
  getMode(): MemoryServiceMode;
  
  /**
   * Check if CLI is available
   */
  isCliAvailable(): Promise<boolean>;
  
  /**
   * Force mode switch
   */
  setMode(mode: MemoryServiceMode): void;
  
  /**
   * Detect and auto-configure best mode
   */
  detectAndConfigureMode(): Promise<void>;
  
  /**
   * Get service health status
   */
  getHealthStatus(): Promise<{
    mode: MemoryServiceMode;
    isHealthy: boolean;
    latencyMs?: number;
    error?: string;
  }>;
  
  /**
   * Bulk create memories
   */
  bulkCreateMemories(requests: CreateMemoryRequest[]): Promise<MemoryEntry[]>;
  
  /**
   * Bulk delete memories
   */
  bulkDeleteMemories(ids: string[]): Promise<void>;
  
  /**
   * Export memories
   */
  exportMemories(ids?: string[]): Promise<MemoryEntry[]>;
  
  /**
   * Import memories
   */
  importMemories(memories: CreateMemoryRequest[]): Promise<MemoryEntry[]>;
}

/**
 * Memory Operation Result
 */
export interface MemoryOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Memory Statistics
 */
export interface MemoryStatistics {
  total: number;
  byType: Record<string, number>;
  recentlyCreated: number;
  recentlyUpdated: number;
  totalSize: number;
}
