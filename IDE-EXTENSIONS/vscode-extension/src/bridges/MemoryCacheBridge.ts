import type { OutputChannel } from 'vscode';
import type { IMemoryService } from '../services/IMemoryService';
import { MemoryCache } from '../services/MemoryCache';
import type { MemoryEntry, MemorySearchResult } from '@lanonasis/memory-client';

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
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (this.isAuthError(errorMessage)) {
                this.output.appendLine('[MemoryCacheBridge] Auth error detected. Refreshing client and retrying...');
                try {
                    await this.memoryService.refreshClient();
                    const memories = await this.memoryService.listMemories(limit);
                    await this.cache.updateFromApi(memories);
                    return memories;
                } catch (retryError) {
                    this.output.appendLine(`[MemoryCacheBridge] Retry after auth refresh failed: ${retryError}`);
                }
            }
            this.output.appendLine(`[MemoryCacheBridge] Refresh failed, using cache: ${error}`);
            return fallback.length > 0 ? fallback : this.cache.getMemories();
        } finally {
            this.cache.setRefreshing(false);
        }
    }

    private isAuthError(message: string): boolean {
        const normalized = message.toLowerCase();
        return normalized.includes('authentication required')
            || normalized.includes('unauthorized')
            || normalized.includes('401')
            || normalized.includes('auth token')
            || normalized.includes('bearer');
    }

    private stripSearchScores(results: MemorySearchResult[]): MemoryEntry[] {
        return results.map(({ similarity_score: _similarityScore, ...rest }) => rest);
    }
}
