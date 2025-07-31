import { z } from 'zod';

/**
 * Memory types supported by the service
 */
declare const MEMORY_TYPES: readonly ["context", "project", "knowledge", "reference", "personal", "workflow"];
type MemoryType = typeof MEMORY_TYPES[number];
/**
 * Memory status values
 */
declare const MEMORY_STATUSES: readonly ["active", "archived", "draft", "deleted"];
type MemoryStatus = typeof MEMORY_STATUSES[number];
/**
 * Core memory entry interface
 */
interface MemoryEntry {
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
/**
 * Memory topic for organization
 */
interface MemoryTopic {
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
/**
 * Memory search result with similarity score
 */
interface MemorySearchResult extends MemoryEntry {
    similarity_score: number;
}
/**
 * User memory statistics
 */
interface UserMemoryStats {
    total_memories: number;
    memories_by_type: Record<MemoryType, number>;
    total_topics: number;
    most_accessed_memory?: string;
    recent_memories: string[];
}
/**
 * Validation schemas using Zod
 */
declare const createMemorySchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodDefault<z.ZodEnum<["context", "project", "knowledge", "reference", "personal", "workflow"]>>;
    topic_id: z.ZodOptional<z.ZodString>;
    project_ref: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    memory_type: "context" | "project" | "knowledge" | "reference" | "personal" | "workflow";
    tags: string[];
    summary?: string | undefined;
    topic_id?: string | undefined;
    project_ref?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title: string;
    content: string;
    summary?: string | undefined;
    memory_type?: "context" | "project" | "knowledge" | "reference" | "personal" | "workflow" | undefined;
    topic_id?: string | undefined;
    project_ref?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
declare const updateMemorySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodOptional<z.ZodEnum<["context", "project", "knowledge", "reference", "personal", "workflow"]>>;
    status: z.ZodOptional<z.ZodEnum<["active", "archived", "draft", "deleted"]>>;
    topic_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    project_ref: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    content?: string | undefined;
    summary?: string | undefined;
    memory_type?: "context" | "project" | "knowledge" | "reference" | "personal" | "workflow" | undefined;
    topic_id?: string | null | undefined;
    project_ref?: string | null | undefined;
    status?: "active" | "archived" | "draft" | "deleted" | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title?: string | undefined;
    content?: string | undefined;
    summary?: string | undefined;
    memory_type?: "context" | "project" | "knowledge" | "reference" | "personal" | "workflow" | undefined;
    topic_id?: string | null | undefined;
    project_ref?: string | null | undefined;
    status?: "active" | "archived" | "draft" | "deleted" | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
declare const searchMemorySchema: z.ZodObject<{
    query: z.ZodString;
    memory_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["context", "project", "knowledge", "reference", "personal", "workflow"]>, "many">>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    topic_id: z.ZodOptional<z.ZodString>;
    project_ref: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "archived", "draft", "deleted"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    threshold: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "archived" | "draft" | "deleted";
    query: string;
    limit: number;
    threshold: number;
    topic_id?: string | undefined;
    project_ref?: string | undefined;
    tags?: string[] | undefined;
    memory_types?: ("context" | "project" | "knowledge" | "reference" | "personal" | "workflow")[] | undefined;
}, {
    query: string;
    topic_id?: string | undefined;
    project_ref?: string | undefined;
    status?: "active" | "archived" | "draft" | "deleted" | undefined;
    tags?: string[] | undefined;
    memory_types?: ("context" | "project" | "knowledge" | "reference" | "personal" | "workflow")[] | undefined;
    limit?: number | undefined;
    threshold?: number | undefined;
}>;
declare const createTopicSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    parent_topic_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    parent_topic_id?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    parent_topic_id?: string | undefined;
}>;
/**
 * Inferred types from schemas
 */
type CreateMemoryRequest = z.infer<typeof createMemorySchema>;
type UpdateMemoryRequest = z.infer<typeof updateMemorySchema>;
type SearchMemoryRequest = z.infer<typeof searchMemorySchema>;
type CreateTopicRequest = z.infer<typeof createTopicSchema>;

/**
 * Configuration options for the Memory Client
 */
interface MemoryClientConfig {
    /** API endpoint URL */
    apiUrl: string;
    /** API key for authentication */
    apiKey?: string;
    /** Bearer token for authentication (alternative to API key) */
    authToken?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Enable gateway mode for enhanced performance */
    useGateway?: boolean;
    /** Custom headers to include with requests */
    headers?: Record<string, string>;
}
/**
 * Standard API response wrapper
 */
interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}
/**
 * Paginated response for list operations
 */
interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
/**
 * Memory Client class for interacting with the Memory as a Service API
 */
declare class MemoryClient {
    private config;
    private baseHeaders;
    constructor(config: MemoryClientConfig);
    /**
     * Make an HTTP request to the API
     */
    private request;
    /**
     * Test the API connection and authentication
     */
    healthCheck(): Promise<ApiResponse<{
        status: string;
        timestamp: string;
    }>>;
    /**
     * Create a new memory
     */
    createMemory(memory: CreateMemoryRequest): Promise<ApiResponse<MemoryEntry>>;
    /**
     * Get a memory by ID
     */
    getMemory(id: string): Promise<ApiResponse<MemoryEntry>>;
    /**
     * Update an existing memory
     */
    updateMemory(id: string, updates: UpdateMemoryRequest): Promise<ApiResponse<MemoryEntry>>;
    /**
     * Delete a memory
     */
    deleteMemory(id: string): Promise<ApiResponse<void>>;
    /**
     * List memories with optional filtering and pagination
     */
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
    /**
     * Search memories using semantic search
     */
    searchMemories(request: SearchMemoryRequest): Promise<ApiResponse<{
        results: MemorySearchResult[];
        total_results: number;
        search_time_ms: number;
    }>>;
    /**
     * Bulk delete multiple memories
     */
    bulkDeleteMemories(memoryIds: string[]): Promise<ApiResponse<{
        deleted_count: number;
        failed_ids: string[];
    }>>;
    /**
     * Create a new topic
     */
    createTopic(topic: CreateTopicRequest): Promise<ApiResponse<MemoryTopic>>;
    /**
     * Get all topics
     */
    getTopics(): Promise<ApiResponse<MemoryTopic[]>>;
    /**
     * Get a topic by ID
     */
    getTopic(id: string): Promise<ApiResponse<MemoryTopic>>;
    /**
     * Update a topic
     */
    updateTopic(id: string, updates: Partial<CreateTopicRequest>): Promise<ApiResponse<MemoryTopic>>;
    /**
     * Delete a topic
     */
    deleteTopic(id: string): Promise<ApiResponse<void>>;
    /**
     * Get user memory statistics
     */
    getMemoryStats(): Promise<ApiResponse<UserMemoryStats>>;
    /**
     * Update authentication token
     */
    setAuthToken(token: string): void;
    /**
     * Update API key
     */
    setApiKey(apiKey: string): void;
    /**
     * Clear authentication
     */
    clearAuth(): void;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<MemoryClientConfig>): void;
    /**
     * Get current configuration (excluding sensitive data)
     */
    getConfig(): Omit<MemoryClientConfig, 'apiKey' | 'authToken'>;
}
/**
 * Factory function to create a new Memory Client instance
 */
declare function createMemoryClient(config: MemoryClientConfig): MemoryClient;

/**
 * @lanonasis/memory-client
 *
 * Memory as a Service (MaaS) Client SDK for Lanonasis
 * Intelligent memory management with semantic search capabilities
 */

declare const VERSION = "1.0.0";
declare const CLIENT_NAME = "@lanonasis/memory-client";
declare const isBrowser: boolean;
declare const isNode: string | false;
declare const defaultConfigs: {
    readonly development: {
        readonly apiUrl: "http://localhost:3001";
        readonly timeout: 30000;
        readonly useGateway: false;
    };
    readonly production: {
        readonly apiUrl: "https://api.lanonasis.com";
        readonly timeout: 15000;
        readonly useGateway: true;
    };
    readonly gateway: {
        readonly apiUrl: "https://api.lanonasis.com";
        readonly timeout: 10000;
        readonly useGateway: true;
    };
};

export { CLIENT_NAME, MEMORY_STATUSES, MEMORY_TYPES, MemoryClient, VERSION, createMemoryClient, createMemorySchema, createTopicSchema, defaultConfigs, isBrowser, isNode, searchMemorySchema, updateMemorySchema };
export type { ApiResponse, CreateMemoryRequest, CreateTopicRequest, MemoryClientConfig, MemoryEntry, MemorySearchResult, MemoryStatus, MemoryTopic, MemoryType, PaginatedResponse, SearchMemoryRequest, UpdateMemoryRequest, UserMemoryStats };
