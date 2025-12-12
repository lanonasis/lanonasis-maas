import { CreateMemoryRequest, SearchMemoryRequest, MemoryEntry, MemorySearchResult } from '../types/memory-aligned';

/**
 * Common interface for Memory Services
 */
export interface IMemoryService {
  isAuthenticated(): boolean;
  testConnection(apiKey?: string): Promise<void>;
  createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry>;
  updateMemory(id: string, memory: Partial<CreateMemoryRequest>): Promise<MemoryEntry>;
  searchMemories(query: string, options?: Partial<SearchMemoryRequest>): Promise<MemorySearchResult[]>;
  getMemory(id: string): Promise<MemoryEntry>;
  listMemories(limit?: number): Promise<MemoryEntry[]>;
  deleteMemory(id: string): Promise<void>;
  getMemoryStats(): Promise<any>;
  refreshClient(): void | Promise<void>;
}

/**
 * Enhanced interface for CLI-enabled Memory Services
 */
export interface IEnhancedMemoryService extends IMemoryService {
  getCapabilities(): any;
  showConnectionInfo(): Promise<void>;
  dispose(): void;
}