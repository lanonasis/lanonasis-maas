export type MemoryType = 'conversation' | 'knowledge' | 'project' | 'context' | 'reference';
export type MemoryStatus = 'active' | 'archived' | 'draft' | 'deleted';
export interface MemoryEntry {
    id: string;
    title: string;
    content: string;
    summary?: string;
    memory_type: MemoryType;
    status: MemoryStatus;
    relevance_score?: number;
    access_count: number;
    last_accessed?: string;
    user_id: string;
    topic_id?: string;
    project_ref?: string;
    tags: string[];
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface MemorySearchResult extends MemoryEntry {
    similarity_score: number;
}
export interface MemoryTopic {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    user_id: string;
    parent_topic_id?: string;
    is_system: boolean;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface CreateMemoryRequest {
    title: string;
    content: string;
    summary?: string;
    memory_type?: MemoryType;
    topic_id?: string;
    project_ref?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface UpdateMemoryRequest {
    title?: string;
    content?: string;
    summary?: string;
    memory_type?: MemoryType;
    status?: MemoryStatus;
    topic_id?: string;
    project_ref?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface SearchFilters {
    memory_types?: MemoryType[];
    tags?: string[];
    topic_id?: string;
    project_ref?: string;
    status?: MemoryStatus;
    limit?: number;
    threshold?: number;
}
export interface UserMemoryStats {
    total_memories: number;
    memories_by_type: Record<MemoryType, number>;
    total_topics: number;
    most_accessed_memory?: string | undefined;
    recent_memories: string[];
}
export declare class AlignedMemoryService {
    private supabase;
    private openai;
    constructor();
    /**
     * Create vector embedding for text using OpenAI
     */
    private createEmbedding;
    /**
     * Create a new memory entry in the existing memory_entries table
     */
    createMemory(data: CreateMemoryRequest & {
        user_id: string;
    }): Promise<MemoryEntry>;
    /**
     * Get memory by ID from memory_entries table
     */
    getMemoryById(id: string, userId: string): Promise<MemoryEntry | null>;
    /**
     * Search memories using the aligned vector search function
     */
    searchMemories(query: string, userId: string, filters?: SearchFilters): Promise<MemorySearchResult[]>;
    /**
     * Update memory entry
     */
    updateMemory(id: string, userId: string, data: UpdateMemoryRequest): Promise<MemoryEntry>;
    /**
     * Delete memory entry (soft delete by setting status to deleted)
     */
    deleteMemory(id: string, userId: string): Promise<void>;
    /**
     * List memories with pagination and filtering
     */
    listMemories(userId: string, options?: {
        page?: number;
        limit?: number;
        memory_type?: MemoryType;
        topic_id?: string;
        project_ref?: string;
        status?: MemoryStatus;
        tags?: string[];
        sort?: string;
        order?: 'asc' | 'desc';
    }): Promise<{
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
     * Get user memory statistics
     */
    getUserMemoryStats(userId: string): Promise<UserMemoryStats>;
    /**
     * Topic management methods
     */
    createTopic(data: {
        name: string;
        description?: string;
        color?: string;
        icon?: string;
        parent_topic_id?: string;
        user_id: string;
    }): Promise<MemoryTopic>;
    getTopics(userId: string): Promise<MemoryTopic[]>;
    getTopicById(id: string, userId: string): Promise<MemoryTopic | null>;
    /**
     * Bulk operations
     */
    bulkDeleteMemories(memoryIds: string[], userId: string): Promise<{
        deleted_count: number;
        failed_ids: string[];
    }>;
}
//# sourceMappingURL=memoryService-aligned.d.ts.map