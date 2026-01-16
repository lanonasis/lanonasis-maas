import { CreateMemoryRequest, SearchMemoryRequest, MemoryEntry, MemorySearchResult, UserMemoryStats } from '../types/memory-aligned';
import type { TransportType } from './transports/ITransport';

export interface MemoryServiceCapabilities {
  // Legacy capabilities (for backward compatibility)
  cliAvailable: boolean;
  mcpSupport: boolean;
  authenticated: boolean;
  goldenContract: boolean;
  version?: string;

  // Transport capabilities
  activeTransport?: TransportType | 'http-only';
  availableTransports?: TransportType[];
  realTimeCapable?: boolean;
  connectionHealth?: 'healthy' | 'degraded' | 'disconnected';
}

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