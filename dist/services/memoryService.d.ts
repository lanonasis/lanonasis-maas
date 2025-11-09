import { MemoryEntry, MemorySearchResult, CreateMemoryRequest, UpdateMemoryRequest, MemoryStats, MemoryType } from '../types/memory';
interface SearchFilters {
    memory_types?: MemoryType[];
    tags?: string[];
    topic_id?: string | null;
    user_id?: string;
    limit?: number;
    threshold?: number;
}
interface ListOptions {
    page: number;
    limit: number;
    sort: string;
    order: string;
}
export interface ListMemoryFilters extends Record<string, unknown> {
    organization_id?: string;
    user_id?: string;
    memory_type?: MemoryType;
    tags?: string[];
    topic_id?: string | null;
}
export declare class MemoryService {
    private supabase;
    private openai;
    constructor();
    /**
     * Create vector embedding for text
     */
    private createEmbedding;
    /**
     * Create a new memory entry
     */
    createMemory(id: string, data: CreateMemoryRequest & {
        user_id: string;
        group_id: string;
    }): Promise<MemoryEntry>;
    /**
     * Get memory by ID
     */
    getMemoryById(id: string, organizationId: string): Promise<MemoryEntry | null>;
    /**
     * Update memory entry
     */
    updateMemory(id: string, data: UpdateMemoryRequest): Promise<MemoryEntry>;
    /**
     * Delete memory entry
     */
    deleteMemory(id: string): Promise<void>;
    /**
     * Search memories using vector similarity
     */
    searchMemories(query: string, organizationId: string, filters?: SearchFilters): Promise<MemorySearchResult[]>;
    /**
     * List memories with pagination and filtering
     */
    listMemories(filters: ListMemoryFilters, options: ListOptions): Promise<{
        memories: MemoryEntry[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    /**
     * Update access tracking
     */
    updateAccessTracking(id: string): Promise<void>;
    /**
     * Get memory count for organization
     */
    getMemoryCount(organizationId: string): Promise<number>;
    /**
     * Get memory statistics
     */
    getMemoryStats(organizationId: string): Promise<MemoryStats>;
    /**
     * Bulk delete memories
     */
    bulkDeleteMemories(memoryIds: string[], organizationId: string): Promise<{
        deleted_count: number;
        failed_ids: string[];
    }>;
    /**
     * Log analytics event
     */
    private logAnalytics;
}
export {};
//# sourceMappingURL=memoryService.d.ts.map