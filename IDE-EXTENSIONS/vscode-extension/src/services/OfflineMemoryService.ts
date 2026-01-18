import type { CreateMemoryRequest, MemoryEntry, MemorySearchResult, SearchMemoryRequest, UserMemoryStats, MemoryType } from '@lanonasis/memory-client';
import type { IMemoryService, IEnhancedMemoryService, MemoryServiceCapabilities } from './IMemoryService';
import { isEnhancedMemoryService } from './IMemoryService';
import { MemoryCache } from './MemoryCache';
import { OfflineQueueService } from './OfflineQueueService';
import { OfflineService } from './OfflineService';
import { isAuthError, isNetworkError } from '../utils/extensionErrors';

export class OfflineMemoryService implements IEnhancedMemoryService {
  constructor(
    private readonly base: IMemoryService,
    private readonly offline: OfflineService,
    private readonly queue: OfflineQueueService,
    private readonly cache: MemoryCache
  ) { }

  public isAuthenticated(): boolean {
    return this.base.isAuthenticated();
  }

  public async testConnection(apiKey?: string): Promise<void> {
    return this.base.testConnection(apiKey);
  }

  public async createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry> {
    if (!this.offline.isOnline()) {
      const tempId = this.queue.enqueueCreate(memory);
      return this.buildOfflineEntry(memory, tempId);
    }

    try {
      return await this.withAuthRetry(() => this.base.createMemory(memory));
    } catch (error) {
      if (isNetworkError(error)) {
        const tempId = this.queue.enqueueCreate(memory);
        return this.buildOfflineEntry(memory, tempId);
      }
      throw error;
    }
  }

  public async updateMemory(id: string, memory: Partial<CreateMemoryRequest>): Promise<MemoryEntry> {
    if (!this.offline.isOnline()) {
      this.queue.enqueueUpdate(id, memory);
      return this.buildOfflineUpdate(id, memory);
    }

    try {
      return await this.withAuthRetry(() => this.base.updateMemory(id, memory));
    } catch (error) {
      if (isNetworkError(error)) {
        this.queue.enqueueUpdate(id, memory);
        return this.buildOfflineUpdate(id, memory);
      }
      throw error;
    }
  }

  public async searchMemories(
    query: string,
    options: Partial<SearchMemoryRequest> = {}
  ): Promise<MemorySearchResult[]> {
    return this.base.searchMemories(query, options);
  }

  public async getMemory(id: string): Promise<MemoryEntry> {
    return this.base.getMemory(id);
  }

  public async listMemories(limit: number = 50): Promise<MemoryEntry[]> {
    return this.base.listMemories(limit);
  }

  public async deleteMemory(id: string): Promise<void> {
    if (!this.offline.isOnline()) {
      this.queue.enqueueDelete(id);
      return;
    }

    try {
      await this.withAuthRetry(() => this.base.deleteMemory(id));
    } catch (error) {
      if (isNetworkError(error)) {
        this.queue.enqueueDelete(id);
        return;
      }
      throw error;
    }
  }

  public async getMemoryStats(): Promise<UserMemoryStats> {
    return this.base.getMemoryStats();
  }

  public async refreshClient(): Promise<void> {
    return this.base.refreshClient();
  }

  public getCapabilities(): MemoryServiceCapabilities | null {
    return isEnhancedMemoryService(this.base) ? this.base.getCapabilities() : null;
  }

  public async showConnectionInfo(): Promise<void> {
    if (isEnhancedMemoryService(this.base)) {
      await this.base.showConnectionInfo();
    }
  }

  public dispose(): void {
    if (isEnhancedMemoryService(this.base)) {
      this.base.dispose();
    }
    this.offline.dispose();
    this.queue.dispose();
  }

  private buildOfflineEntry(request: CreateMemoryRequest, tempId: string): MemoryEntry {
    const timestamp = new Date().toISOString();
    const memoryType = (request.memory_type || 'context') as MemoryType;

    return {
      id: tempId,
      title: request.title,
      content: request.content,
      summary: request.summary,
      memory_type: memoryType,
      status: 'draft',
      access_count: 0,
      user_id: 'offline',
      tags: request.tags ?? [],
      metadata: { ...request.metadata, offline_pending: true },
      created_at: timestamp,
      updated_at: timestamp
    };
  }

  private buildOfflineUpdate(id: string, updates: Partial<CreateMemoryRequest>): MemoryEntry {
    const existing = this.cache.getMemory(id);
    const timestamp = new Date().toISOString();
    const memoryType = (updates.memory_type || existing?.memory_type || 'context') as MemoryType;

    return {
      id,
      title: updates.title ?? existing?.title ?? 'Untitled Memory',
      content: updates.content ?? existing?.content ?? '',
      summary: updates.summary ?? existing?.summary,
      memory_type: memoryType,
      status: existing?.status ?? 'draft',
      access_count: existing?.access_count ?? 0,
      user_id: existing?.user_id ?? 'offline',
      tags: updates.tags ?? existing?.tags ?? [],
      metadata: {
        ...(existing?.metadata ?? {}),
        ...(updates.metadata ?? {}),
        offline_pending: true
      },
      created_at: existing?.created_at ?? timestamp,
      updated_at: timestamp
    };
  }

  private async withAuthRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isAuthError(error)) {
        await this.base.refreshClient();
        return operation();
      }
      throw error;
    }
  }
}
