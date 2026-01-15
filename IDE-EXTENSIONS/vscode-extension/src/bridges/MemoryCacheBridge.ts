import type { OutputChannel } from 'vscode';
import type { IMemoryService } from '../services/IMemoryService';
import { MemoryCache } from '../services/MemoryCache';
import type { MemoryEntry, MemorySearchResult } from '../types/memory-aligned';

interface CacheFetchOptions {
    force?: boolean;
    limit?: number;
}

export class MemoryCacheBridge {
    constructor(
        private readonly cache: MemoryCache,
        private readonly memoryService: IMemoryService,
        private readonly output: OutputChannel,
    ) { }

    public getStatus() {
        return this.cache.getStatus();
    }

    public async getMemories(options: CacheFetchOptions = {}): Promise<MemoryEntry[]> {
        const { force = false, limit = 50 } = options;
        const cached = this.cache.getMemories();

        if (!force && cached.length > 0) {
            return cached;
        }

        return this.refreshFromService(limit, cached);
    }

    public async searchMemories(query: string): Promise<MemorySearchResult[]> {
        try {
            const results = await this.memoryService.searchMemories(query);
            await this.cache.updateFromApi(this.stripSearchScores(results));
            return results;
        } catch (error) {
            const fallback = this.cache.searchLocal(query).map((memory) => ({
                ...memory,
                similarity_score: 0.1,
            }));
            this.output.appendLine(`[MemoryCacheBridge] Search failed, using local cache: ${error}`);
            return fallback as MemorySearchResult[];
        }
    }

    public async upsert(memory: MemoryEntry): Promise<void> {
        await this.cache.upsert(memory);
    }

    public async remove(id: string): Promise<void> {
        await this.cache.remove(id);
    }

    public async refreshFromService(limit: number = 50, fallback: MemoryEntry[] = []): Promise<MemoryEntry[]> {
        this.cache.setRefreshing(true);
        try {
            const memories = await this.memoryService.listMemories(limit);
            await this.cache.updateFromApi(memories);
            return memories;
        } catch (error) {
            this.output.appendLine(`[MemoryCacheBridge] Refresh failed, using cache: ${error}`);
            return fallback.length > 0 ? fallback : this.cache.getMemories();
        } finally {
            this.cache.setRefreshing(false);
        }
    }

    private stripSearchScores(results: MemorySearchResult[]): MemoryEntry[] {
        return results.map(({ similarity_score, ...rest }) => rest);
    }
}
