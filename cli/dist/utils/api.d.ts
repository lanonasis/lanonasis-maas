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
export type WriteIntent = 'new' | 'continue' | 'auto';
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
    continuity_key?: string;
    idempotency_key?: string;
    write_intent?: WriteIntent;
}
export interface UpdateMemoryRequest {
    title?: string;
    content?: string;
    memory_type?: MemoryType;
    tags?: string[];
    topic_id?: string | null;
    metadata?: Record<string, unknown>;
    continuity_key?: string;
    idempotency_key?: string;
    write_intent?: WriteIntent;
}
export interface GetMemoriesParams {
    page?: number;
    limit?: number;
    offset?: number;
    memory_type?: MemoryType;
    tags?: string[] | string;
    topic_id?: string;
    user_id?: string;
    sort?: 'created_at' | 'updated_at' | 'last_accessed' | 'access_count' | 'title';
    order?: 'asc' | 'desc';
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
    similarity_score: number;
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
    data?: T[];
    memories?: T[];
    results?: T[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        has_more: boolean;
        page?: number;
        pages?: number;
    };
    total_results?: number;
    search_time_ms?: number;
}
export interface ApiErrorResponse {
    error: string;
    message: string;
    status_code: number;
    details?: Record<string, unknown>;
}
export interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    role: string;
    provider: string | null;
    project_scope: string | null;
    platform: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    metadata?: {
        locale: string | null;
        timezone: string | null;
    };
}
export declare class APIClient {
    private client;
    private config;
    /** When true, throw on 401/403 instead of printing+exiting (for callers that handle errors) */
    noExit: boolean;
    private normalizeMemoryEntry;
    private shouldUseLegacyMemoryRpcFallback;
    private shouldRetryViaApiGateway;
    private normalizeMcpPathToApi;
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
    /**
     * Fetch the current user's profile from the auth gateway (GET /v1/auth/me).
     * Works for all auth methods: OAuth Bearer token, vendor key (X-API-Key), and JWT.
     * The /auth/ prefix causes the request interceptor to route this to auth_base.
     */
    getUserProfile(): Promise<UserProfile>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    request<T = Record<string, unknown>>(config: AxiosRequestConfig): Promise<T>;
}
export declare const apiClient: APIClient;
