import { AxiosRequestConfig } from 'axios';
export interface AuthResponse {
    user: {
        id: string;
        email: string;
        organization_id: string;
        role: 'admin' | 'user' | 'viewer';
        plan: 'free' | 'pro' | 'enterprise';
        created_at: string;
        updated_at: string;
    };
    token: string;
    expires_at: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    organization_name?: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export type MemoryType = 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';
export interface MemoryEntry {
    id: string;
    title: string;
    content: string;
    memory_type: MemoryType;
    tags: string[];
    topic_id?: string | null;
    user_id: string;
    organization_id: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    last_accessed?: string;
    access_count: number;
}
export interface CreateMemoryRequest {
    title: string;
    content: string;
    memory_type?: MemoryType;
    tags?: string[];
    topic_id?: string;
    metadata?: Record<string, unknown>;
}
export interface UpdateMemoryRequest {
    title?: string;
    content?: string;
    memory_type?: MemoryType;
    tags?: string[];
    topic_id?: string | null;
    metadata?: Record<string, unknown>;
}
export interface GetMemoriesParams {
    limit?: number;
    offset?: number;
    memory_type?: MemoryType;
    tags?: string[];
    topic_id?: string;
    sort_by?: 'created_at' | 'updated_at' | 'last_accessed' | 'access_count';
    sort_order?: 'asc' | 'desc';
}
export interface SearchMemoryRequest {
    query: string;
    memory_types?: MemoryType[];
    tags?: string[];
    topic_id?: string;
    limit?: number;
    threshold?: number;
}
export interface MemorySearchResult extends MemoryEntry {
    relevance_score: number;
}
export interface MemoryStats {
    total_memories: number;
    memories_by_type: Record<MemoryType, number>;
    total_size_bytes: number;
    avg_access_count: number;
    most_accessed_memory?: MemoryEntry;
    recent_memories: MemoryEntry[];
}
export interface BulkDeleteRequest {
    memory_ids: string[];
}
export interface BulkDeleteResponse {
    deleted_count: number;
    failed_deletes?: string[];
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
export interface CreateTopicRequest {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parent_topic_id?: string;
}
export interface UpdateTopicRequest {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    parent_topic_id?: string;
}
export interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    version: string;
    timestamp: string;
    dependencies: Record<string, {
        status: string;
        latency_ms?: number;
    }>;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        has_more: boolean;
    };
}
export interface ApiErrorResponse {
    error: string;
    message: string;
    status_code: number;
    details?: Record<string, unknown>;
}
export declare class APIClient {
    private client;
    private config;
    constructor();
    login(email: string, password: string): Promise<AuthResponse>;
    register(email: string, password: string, organizationName?: string): Promise<AuthResponse>;
    createMemory(data: CreateMemoryRequest): Promise<MemoryEntry>;
    getMemories(params?: GetMemoriesParams): Promise<PaginatedResponse<MemoryEntry>>;
    getMemory(id: string): Promise<MemoryEntry>;
    updateMemory(id: string, data: UpdateMemoryRequest): Promise<MemoryEntry>;
    deleteMemory(id: string): Promise<void>;
    searchMemories(query: string, options?: Omit<SearchMemoryRequest, 'query'>): Promise<PaginatedResponse<MemorySearchResult>>;
    getMemoryStats(): Promise<MemoryStats>;
    bulkDeleteMemories(memoryIds: string[]): Promise<BulkDeleteResponse>;
    createTopic(data: CreateTopicRequest): Promise<MemoryTopic>;
    getTopics(): Promise<MemoryTopic[]>;
    getTopic(id: string): Promise<MemoryTopic>;
    updateTopic(id: string, data: UpdateTopicRequest): Promise<MemoryTopic>;
    deleteTopic(id: string): Promise<void>;
    getHealth(): Promise<HealthStatus>;
    request<T = Record<string, unknown>>(config: AxiosRequestConfig): Promise<T>;
}
export declare const apiClient: APIClient;
