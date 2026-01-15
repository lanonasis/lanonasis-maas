import type { IMemoryService } from '../services/IMemoryService';
import type { MemoryEntry, MemorySearchResult, CreateMemoryRequest } from '../types/memory-aligned';
import type { MemoryCacheBridge } from './MemoryCacheBridge';

// Prototype-compatible memory interface
export interface PrototypeMemory {
  id: string;
  title: string;
  type: "conversation" | "knowledge" | "project" | "context" | "reference" | "personal" | "workflow";
  date: Date;
  tags: string[];
  content: string;
  iconType: 'terminal' | 'filecode' | 'hash' | 'calendar' | 'lightbulb' | 'briefcase' | 'user' | 'settings';
}

export class PrototypeUIBridge {
  constructor(
    private memoryService: IMemoryService,
    private cacheBridge?: MemoryCacheBridge,
  ) { }

  // Map memory types to icon types
  private getIconType(type: string): 'terminal' | 'filecode' | 'hash' | 'calendar' | 'lightbulb' | 'briefcase' | 'user' | 'settings' {
    const iconMap: Record<string, 'terminal' | 'filecode' | 'hash' | 'calendar' | 'lightbulb' | 'briefcase' | 'user' | 'settings'> = {
      conversation: 'user',
      knowledge: 'lightbulb',
      project: 'briefcase',
      context: 'terminal',
      reference: 'hash',
      personal: 'user',
      workflow: 'settings'
    };
    return iconMap[type] || 'terminal';
  }

  // Transform live extension memory to prototype format
  private transformToPrototypeFormat(memory: MemoryEntry): PrototypeMemory {
    return {
      id: memory.id,
      title: memory.title,
      type: memory.memory_type,
      date: new Date(memory.created_at),
      tags: memory.tags,
      content: memory.content,
      iconType: this.getIconType(memory.memory_type)
    };
  }

  // Transform search results to prototype format
  private transformSearchResults(results: MemorySearchResult[]): PrototypeMemory[] {
    return results.map(result => ({
      ...this.transformToPrototypeFormat(result),
      // Include similarity score for search results
      similarityScore: result.similarity_score
    } as PrototypeMemory & { similarityScore: number }));
  }

  // Search memories with prototype interface
  async searchMemories(query: string): Promise<PrototypeMemory[]> {
    try {
      const results = this.cacheBridge
        ? await this.cacheBridge.searchMemories(query)
        : await this.memoryService.searchMemories(query);
      return this.transformSearchResults(results);
    } catch (error) {
      console.error('[PrototypeUIBridge] Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Create memory with prototype interface
  async createMemory(memoryData: CreateMemoryRequest): Promise<PrototypeMemory> {
    try {
      const result = await this.memoryService.createMemory(memoryData);
      if (this.cacheBridge) {
        await this.cacheBridge.upsert(result);
      }
      return this.transformToPrototypeFormat(result);
    } catch (error) {
      console.error('[PrototypeUIBridge] Create memory failed:', error);
      throw new Error(`Create memory failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get all memories
  async getAllMemories(): Promise<PrototypeMemory[]> {
    try {
      const memories = this.cacheBridge
        ? await this.cacheBridge.getMemories({ limit: 50 })
        : await this.memoryService.listMemories(50);
      return memories.map((memory: MemoryEntry) => this.transformToPrototypeFormat(memory));
    } catch (error) {
      console.error('[PrototypeUIBridge] Get memories failed:', error);
      throw new Error(`Get memories failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get memory by ID
  async getMemoryById(id: string): Promise<PrototypeMemory | null> {
    try {
      if (this.cacheBridge) {
        const cached = (await this.cacheBridge.getMemories()).find((item) => item.id === id);
        if (cached) {
          return this.transformToPrototypeFormat(cached);
        }
      }

      const memory = await this.memoryService.getMemory(id);
      if (memory && this.cacheBridge) {
        await this.cacheBridge.upsert(memory);
      }
      return memory ? this.transformToPrototypeFormat(memory) : null;
    } catch (error) {
      console.error('[PrototypeUIBridge] Get memory by ID failed:', error);
      throw new Error(`Get memory failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Update memory (placeholder - not implemented in base service)
  async updateMemory(_id: string, _updates: Partial<CreateMemoryRequest>): Promise<PrototypeMemory> {
    throw new Error('Update memory not yet implemented in enhanced UI');
  }

  // Delete memory (placeholder - not implemented in base service)
  async deleteMemory(_id: string): Promise<void> {
    throw new Error('Delete memory not yet implemented in enhanced UI');
  }

  // Check authentication status
  async isAuthenticated(): Promise<boolean> {
    try {
      return await this.memoryService.isAuthenticated();
    } catch (error) {
      console.error('[PrototypeUIBridge] Auth check failed:', error);
      return false;
    }
  }
}