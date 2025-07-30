/**
 * Memory as a Service (MaaS) Client SDK
 * Aligned with sd-ghost-protocol schema
 */
import { MemoryEntry, MemoryTopic, CreateMemoryRequest, UpdateMemoryRequest, SearchMemoryRequest, CreateTopicRequest, MemorySearchResult, UserMemoryStats } from '../types/memory-aligned';
export interface MaaSClientConfig {
    apiUrl: string;
    apiKey?: string;
    authToken?: string;
    timeout?: number;
}
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
export declare class MaaSClient {
    private config;
    private baseHeaders;
    constructor(config: MaaSClientConfig);
    private request;
    createMemory(memory: CreateMemoryRequest): Promise<ApiResponse<MemoryEntry>>;
    getMemory(id: string): Promise<ApiResponse<MemoryEntry>>;
    updateMemory(id: string, updates: UpdateMemoryRequest): Promise<ApiResponse<MemoryEntry>>;
    deleteMemory(id: string): Promise<ApiResponse<void>>;
    listMemories(options?: {
        page?: number;
        limit?: number;
        memory_type?: string;
        topic_id?: string;
        project_ref?: string;
        status?: string;
        tags?: string[];
        sort?: string;
        order?: 'asc' | 'desc';
    }): Promise<ApiResponse<PaginatedResponse<MemoryEntry>>>;
    searchMemories(request: SearchMemoryRequest): Promise<ApiResponse<{
        results: MemorySearchResult[];
        total_results: number;
        search_time_ms: number;
    }>>;
    bulkDeleteMemories(memoryIds: string[]): Promise<ApiResponse<{
        deleted_count: number;
        failed_ids: string[];
    }>>;
    createTopic(topic: CreateTopicRequest): Promise<ApiResponse<MemoryTopic>>;
    getTopics(): Promise<ApiResponse<MemoryTopic[]>>;
    getTopic(id: string): Promise<ApiResponse<MemoryTopic>>;
    updateTopic(id: string, updates: Partial<CreateTopicRequest>): Promise<ApiResponse<MemoryTopic>>;
    deleteTopic(id: string): Promise<ApiResponse<void>>;
    getMemoryStats(): Promise<ApiResponse<UserMemoryStats>>;
    getHealth(): Promise<ApiResponse<{
        status: string;
        timestamp: string;
    }>>;
    setAuthToken(token: string): void;
    setApiKey(apiKey: string): void;
    clearAuth(): void;
}
export declare function createMaaSClient(config: MaaSClientConfig): MaaSClient;
export declare function useMaaSClient(config: MaaSClientConfig): MaaSClient;
export declare const isBrowser: boolean;
export declare const isNode: string | false;
export declare const defaultConfigs: {
    development: {
        apiUrl: string;
        timeout: number;
    };
    production: {
        apiUrl: string;
        timeout: number;
    };
};
export type { MemoryEntry, MemoryTopic, CreateMemoryRequest, UpdateMemoryRequest, SearchMemoryRequest, CreateTopicRequest, MemorySearchResult, UserMemoryStats };
//# sourceMappingURL=memory-client-sdk.d.ts.map