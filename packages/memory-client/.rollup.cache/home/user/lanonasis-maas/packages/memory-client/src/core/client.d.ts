/**
 * Core Memory Client - Pure Browser-Safe Implementation
 *
 * NO Node.js dependencies, NO CLI code, NO child_process
 * Works in: Browser, React Native, Cloudflare Workers, Edge Functions, Deno, Bun
 *
 * Bundle size: ~15KB gzipped
 */
import type { MemoryEntry, MemoryTopic, CreateMemoryRequest, UpdateMemoryRequest, SearchMemoryRequest, CreateTopicRequest, MemorySearchResult, UserMemoryStats } from './types';
/**
 * Configuration options for the Memory Client
 */
export interface CoreMemoryClientConfig {
    /** API endpoint URL */
    apiUrl: string;
    /** API key for authentication */
    apiKey?: string;
    /** Bearer token for authentication (alternative to API key) */
    authToken?: string;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Custom headers to include with requests */
    headers?: Record<string, string>;
    /** Retry configuration */
    retry?: {
        maxRetries?: number;
        retryDelay?: number;
        backoff?: 'linear' | 'exponential';
    };
    /** Cache configuration (browser only) */
    cache?: {
        enabled?: boolean;
        ttl?: number;
    };
    /** Called when an error occurs */
    onError?: (error: ApiError) => void;
    /** Called before each request */
    onRequest?: (endpoint: string) => void;
    /** Called after each response */
    onResponse?: (endpoint: string, duration: number) => void;
}
/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}
/**
 * API error with details
 */
export interface ApiError {
    message: string;
    code?: string;
    statusCode?: number;
    details?: unknown;
}
/**
 * Paginated response for list operations
 */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
/**
 * Core Memory Client class for interacting with the Memory as a Service API
 *
 * This is a pure browser-safe client with zero Node.js dependencies.
 * It uses only standard web APIs (fetch, AbortController, etc.)
 */
export declare class CoreMemoryClient {
    private config;
    private baseHeaders;
    constructor(config: CoreMemoryClientConfig);
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
    updateConfig(updates: Partial<CoreMemoryClientConfig>): void;
    /**
     * Get current configuration (excluding sensitive data)
     */
    getConfig(): Omit<CoreMemoryClientConfig, 'apiKey' | 'authToken'>;
}
/**
 * Factory function to create a new Core Memory Client instance
 */
export declare function createMemoryClient(config: CoreMemoryClientConfig): CoreMemoryClient;
