import { CreateMemoryRequest, SearchMemoryRequest, MemoryEntry, MemorySearchResult, UserMemoryStats } from '../types/memory-aligned';

export interface MemoryServiceCapabilities {
  cliAvailable: boolean;
  mcpSupport: boolean;
  authenticated: boolean;
  goldenContract: boolean;
  version?: string;
}

/**
 * Common interface for Memory Services
 */
export interface IMemoryService {
  isAuthenticated(): boolean;
  testConnection(apiKey?: string): Promise<void>;
  createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry>;
  searchMemories(query: string, options?: Partial<SearchMemoryRequest>): Promise<MemorySearchResult[]>;
  getMemory(id: string): Promise<MemoryEntry>;
  listMemories(limit?: number): Promise<MemoryEntry[]>;
  deleteMemory(id: string): Promise<void>;
  getMemoryStats(): Promise<UserMemoryStats>;
  refreshClient(): Promise<void>;
}

/**
 * Enhanced interface for CLI-enabled Memory Services
 */
export interface IEnhancedMemoryService extends IMemoryService {
  getCapabilities(): MemoryServiceCapabilities | null;
  showConnectionInfo(): Promise<void>;
  dispose(): void;
}