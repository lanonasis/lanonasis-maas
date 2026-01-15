import * as vscode from 'vscode';
import type { MemoryEntry } from '../types/memory-aligned';

export interface CachedMemory extends MemoryEntry {
    _cachedAt?: number;
}

export interface CacheStatus {
    lastSyncAt: number | null;
    isRefreshing: boolean;
    count: number;
}

const CACHE_KEYS = {
    MEMORIES: 'lanonasis.memories.cache',
    LAST_SYNC: 'lanonasis.memories.lastSync',
} as const;

export class MemoryCache {
    private memories: CachedMemory[] = [];
    private lastSyncAt: number | null = null;
    private isRefreshing = false;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly output: vscode.OutputChannel,
    ) {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        try {
            const cached = this.context.globalState.get<CachedMemory[]>(CACHE_KEYS.MEMORIES, []);
            const lastSync = this.context.globalState.get<number | null>(CACHE_KEYS.LAST_SYNC, null);

            this.memories = cached;
            this.lastSyncAt = lastSync;

            this.output.appendLine(`[MemoryCache] Loaded ${this.memories.length} cached memories`);
        } catch (err) {
            this.output.appendLine(`[MemoryCache] Load error: ${err}`);
        }
    }

    private async saveToStorage(): Promise<void> {
        try {
            await this.context.globalState.update(CACHE_KEYS.MEMORIES, this.memories);
            await this.context.globalState.update(CACHE_KEYS.LAST_SYNC, this.lastSyncAt);
        } catch (err) {
            this.output.appendLine(`[MemoryCache] Save error: ${err}`);
        }
    }

    public getStatus(): CacheStatus {
        return {
            lastSyncAt: this.lastSyncAt,
            isRefreshing: this.isRefreshing,
            count: this.memories.length,
        };
    }

    public getMemories(): MemoryEntry[] {
        return [...this.memories];
    }

    public setRefreshing(refreshing: boolean): void {
        this.isRefreshing = refreshing;
    }

    public async clear(): Promise<void> {
        this.memories = [];
        this.lastSyncAt = null;
        await this.saveToStorage();
    }

    public async updateFromApi(memories: MemoryEntry[]): Promise<void> {
        this.memories = memories.map((memory) => ({
            ...memory,
            _cachedAt: Date.now(),
        }));
        this.lastSyncAt = Date.now();
        await this.saveToStorage();
    }

    public async upsert(memory: MemoryEntry): Promise<void> {
        const index = this.memories.findIndex((item) => item.id === memory.id);
        if (index >= 0) {
            this.memories[index] = { ...memory, _cachedAt: Date.now() };
        } else {
            this.memories.unshift({ ...memory, _cachedAt: Date.now() });
        }
        await this.saveToStorage();
    }

    public async remove(id: string): Promise<void> {
        this.memories = this.memories.filter((memory) => memory.id !== id);
        await this.saveToStorage();
    }

    public searchLocal(query: string): MemoryEntry[] {
        const q = query.toLowerCase();

        const findPatterns = [
            /find\s+(?:my\s+)?(.+)/i,
            /search\s+(?:for\s+)?(.+)/i,
            /show\s+(?:me\s+)?(.+)/i,
            /get\s+(?:my\s+)?(.+)/i,
            /recall\s+(.+)/i,
            /what\s+(?:was|were|is|are)\s+(?:my\s+)?(.+)/i,
            /where\s+(?:is|are|did)\s+(?:my\s+)?(.+)/i,
        ];

        let searchTerms = q;
        for (const pattern of findPatterns) {
            const match = q.match(pattern);
            if (match) {
                searchTerms = match[1] || match[2] || q;
                break;
            }
        }

        const stopWords = ['the', 'a', 'an', 'my', 'that', 'this', 'about', 'notes', 'note', 'memory', 'memories'];
        const keywords = searchTerms
            .split(/\s+/)
            .filter((word) => word.length > 2 && !stopWords.includes(word));

        if (keywords.length === 0) {
            return this.memories.slice(0, 10);
        }

        const scored = this.memories.map((memory) => {
            let score = 0;
            const titleLower = memory.title.toLowerCase();
            const contentLower = memory.content.toLowerCase();
            const tagsLower = memory.tags.map((tag) => tag.toLowerCase());

            for (const keyword of keywords) {
                if (titleLower.includes(keyword)) score += 3;
                if (contentLower.includes(keyword)) score += 1;
                if (tagsLower.some((tag) => tag.includes(keyword))) score += 2;
            }

            return { memory, score };
        });

        return scored
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map((item) => item.memory);
    }
}
