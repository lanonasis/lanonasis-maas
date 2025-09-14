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
 * CLI Integration Module for Memory Client SDK
 *
 * Provides intelligent CLI detection and MCP channel utilization
 * when @LanOnasis/cli v1.5.2+ is available in the environment
 */

interface CLIInfo {
    available: boolean;
    version?: string;
    mcpAvailable?: boolean;
    authenticated?: boolean;
}
interface CLIExecutionOptions {
    timeout?: number;
    verbose?: boolean;
    outputFormat?: 'json' | 'table' | 'yaml';
}
interface CLICommand {
    command: string;
    args: string[];
    options?: CLIExecutionOptions;
}
interface MCPChannel {
    available: boolean;
    version?: string;
    capabilities?: string[];
}
interface CLICapabilities {
    cliAvailable: boolean;
    mcpSupport: boolean;
    authenticated: boolean;
    goldenContract: boolean;
    version?: string;
}
type RoutingStrategy = 'cli-first' | 'api-first' | 'cli-only' | 'api-only' | 'auto';
/**
 * CLI Detection and Integration Service
 */
declare class CLIIntegration {
    private cliInfo;
    private detectionPromise;
    /**
     * Detect if CLI is available and get its capabilities
     */
    detectCLI(): Promise<CLIInfo>;
    private performDetection;
    /**
     * Execute CLI command and return parsed JSON result
     */
    executeCLICommand<T = any>(command: string, options?: CLIExecutionOptions): Promise<ApiResponse<T>>;
    /**
     * Get preferred CLI command (onasis for Golden Contract, fallback to LanOnasis)
     */
    private getPreferredCLICommand;
    /**
     * Memory operations via CLI
     */
    createMemoryViaCLI(title: string, content: string, options?: {
        memoryType?: string;
        tags?: string[];
        topicId?: string;
    }): Promise<ApiResponse<any>>;
    listMemoriesViaCLI(options?: {
        limit?: number;
        memoryType?: string;
        tags?: string[];
        sortBy?: string;
    }): Promise<ApiResponse<any>>;
    searchMemoriesViaCLI(query: string, options?: {
        limit?: number;
        memoryTypes?: string[];
    }): Promise<ApiResponse<any>>;
    /**
     * Health check via CLI
     */
    healthCheckViaCLI(): Promise<ApiResponse<any>>;
    /**
     * MCP-specific operations
     */
    getMCPStatus(): Promise<ApiResponse<any>>;
    listMCPTools(): Promise<ApiResponse<any>>;
    /**
     * Authentication operations
     */
    getAuthStatus(): Promise<ApiResponse<any>>;
    /**
     * Check if specific CLI features are available
     */
    getCapabilities(): Promise<{
        cliAvailable: boolean;
        version?: string;
        mcpSupport: boolean;
        authenticated: boolean;
        goldenContract: boolean;
    }>;
    private isGoldenContractCompliant;
    /**
     * Force refresh CLI detection
     */
    refresh(): Promise<CLIInfo>;
    /**
     * Get cached CLI info without re-detection
     */
    getCachedInfo(): CLIInfo | null;
}

/**
 * Enhanced Memory Client with CLI Integration
 *
 * Intelligently routes requests through CLI v1.5.2+ when available,
 * with fallback to direct API for maximum compatibility and performance
 */

interface EnhancedMemoryClientConfig extends MemoryClientConfig {
    /** Prefer CLI when available (default: true) */
    preferCLI?: boolean;
    /** Enable MCP channels when available (default: true) */
    enableMCP?: boolean;
    /** CLI detection timeout in ms (default: 5000) */
    cliDetectionTimeout?: number;
    /** Fallback to direct API on CLI failure (default: true) */
    fallbackToAPI?: boolean;
    /** Minimum CLI version required for Golden Contract compliance (default: 1.5.2) */
    minCLIVersion?: string;
    /** Enable verbose logging for troubleshooting (default: false) */
    verbose?: boolean;
}
interface OperationResult<T> {
    data?: T;
    error?: string;
    source: 'cli' | 'api';
    mcpUsed?: boolean;
}
/**
 * Enhanced Memory Client with intelligent CLI/API routing
 */
declare class EnhancedMemoryClient {
    private directClient;
    private cliIntegration;
    private config;
    private capabilities;
    constructor(config: EnhancedMemoryClientConfig);
    /**
     * Initialize the client and detect capabilities
     */
    initialize(): Promise<void>;
    /**
     * Get current capabilities
     */
    getCapabilities(): Promise<Awaited<ReturnType<CLIIntegration['getCapabilities']>>>;
    /**
     * Determine if operation should use CLI
     */
    private shouldUseCLI;
    /**
     * Execute operation with intelligent routing
     */
    private executeOperation;
    /**
     * Health check with intelligent routing
     */
    healthCheck(): Promise<OperationResult<{
        status: string;
        timestamp: string;
    }>>;
    /**
     * Create memory with CLI/API routing
     */
    createMemory(memory: CreateMemoryRequest): Promise<OperationResult<MemoryEntry>>;
    /**
     * List memories with intelligent routing
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
    }): Promise<OperationResult<any>>;
    /**
     * Search memories with MCP enhancement when available
     */
    searchMemories(request: SearchMemoryRequest): Promise<OperationResult<{
        results: MemorySearchResult[];
        total_results: number;
        search_time_ms: number;
    }>>;
    /**
     * Get memory by ID (API only for now)
     */
    getMemory(id: string): Promise<OperationResult<MemoryEntry>>;
    /**
     * Update memory (API only for now)
     */
    updateMemory(id: string, updates: UpdateMemoryRequest): Promise<OperationResult<MemoryEntry>>;
    /**
     * Delete memory (API only for now)
     */
    deleteMemory(id: string): Promise<OperationResult<void>>;
    createTopic(topic: any): Promise<OperationResult<MemoryTopic>>;
    getTopics(): Promise<OperationResult<MemoryTopic[]>>;
    getTopic(id: string): Promise<OperationResult<MemoryTopic>>;
    updateTopic(id: string, updates: any): Promise<OperationResult<MemoryTopic>>;
    deleteTopic(id: string): Promise<OperationResult<void>>;
    /**
     * Get memory statistics
     */
    getMemoryStats(): Promise<OperationResult<UserMemoryStats>>;
    /**
     * Force CLI re-detection
     */
    refreshCLIDetection(): Promise<void>;
    /**
     * Get authentication status from CLI
     */
    getAuthStatus(): Promise<OperationResult<any>>;
    /**
     * Get MCP status when available
     */
    getMCPStatus(): Promise<OperationResult<any>>;
    /**
     * Update authentication for both CLI and API client
     */
    setAuthToken(token: string): void;
    setApiKey(apiKey: string): void;
    clearAuth(): void;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<EnhancedMemoryClientConfig>): void;
    /**
     * Get configuration summary
     */
    getConfigSummary(): {
        apiUrl: string;
        preferCLI: boolean;
        enableMCP: boolean;
        capabilities?: Awaited<ReturnType<CLIIntegration['getCapabilities']>>;
    };
}
/**
 * Factory function to create an enhanced memory client
 */
declare function createEnhancedMemoryClient(config: EnhancedMemoryClientConfig): Promise<EnhancedMemoryClient>;

/**
 * Configuration utilities for Memory Client SDK
 * Provides smart defaults and environment detection for CLI/MCP integration
 */

interface SmartConfigOptions {
    /** Prefer CLI integration when available (default: true in Node.js environments) */
    preferCLI?: boolean;
    /** Minimum CLI version required for Golden Contract compliance (default: 1.5.2) */
    minCLIVersion?: string;
    /** Enable MCP channel detection (default: true) */
    enableMCP?: boolean;
    /** API fallback configuration */
    apiConfig?: Partial<MemoryClientConfig>;
    /** Timeout for CLI detection in milliseconds (default: 3000) */
    cliDetectionTimeout?: number;
    /** Enable verbose logging for troubleshooting (default: false) */
    verbose?: boolean;
}
/**
 * Environment detection utilities
 */
declare const Environment: {
    isNode: string | false;
    isBrowser: boolean;
    isVSCode: boolean;
    isCursor: boolean;
    isWindsurf: boolean;
    readonly isIDE: boolean;
    readonly supportsCLI: boolean;
};
/**
 * Create smart configuration with environment-aware defaults
 */
declare function createSmartConfig(baseConfig: Partial<MemoryClientConfig>, options?: SmartConfigOptions): EnhancedMemoryClientConfig;
/**
 * Preset configurations for common scenarios
 */
declare const ConfigPresets: {
    /**
     * Development configuration with local API and CLI preference
     */
    development: (apiKey?: string) => EnhancedMemoryClientConfig;
    /**
     * Production configuration optimized for performance
     */
    production: (apiKey?: string) => EnhancedMemoryClientConfig;
    /**
     * IDE extension configuration with MCP prioritization
     */
    ideExtension: (apiKey?: string) => EnhancedMemoryClientConfig;
    /**
     * Browser-only configuration (no CLI support)
     */
    browserOnly: (apiKey?: string) => EnhancedMemoryClientConfig;
    /**
     * CLI-first configuration for server environments
     */
    serverCLI: (apiKey?: string) => EnhancedMemoryClientConfig;
};
/**
 * Migration helper for existing MemoryClient users
 */
declare function migrateToEnhanced(existingConfig: MemoryClientConfig, enhancementOptions?: SmartConfigOptions): EnhancedMemoryClientConfig;

/**
 * @LanOnasis/memory-client
 *
 * Memory as a Service (MaaS) Client SDK for LanOnasis
 * Intelligent memory management with semantic search capabilities
 */

declare const VERSION = "1.3.0";
declare const CLIENT_NAME = "@LanOnasis/memory-client";
declare const isBrowser: boolean;
declare const isNode: string | false;
declare const defaultConfigs: {
    readonly development: {
        readonly apiUrl: "http://localhost:3001";
        readonly timeout: 30000;
        readonly useGateway: false;
    };
    readonly production: {
        readonly apiUrl: "https://api.LanOnasis.com";
        readonly timeout: 15000;
        readonly useGateway: true;
    };
    readonly gateway: {
        readonly apiUrl: "https://api.LanOnasis.com";
        readonly timeout: 10000;
        readonly useGateway: true;
    };
};

export { CLIENT_NAME, CLIIntegration, ConfigPresets, EnhancedMemoryClient, Environment, MEMORY_STATUSES, MEMORY_TYPES, MemoryClient, VERSION, createEnhancedMemoryClient, createMemoryClient, createMemorySchema, createSmartConfig, createTopicSchema, defaultConfigs, isBrowser, isNode, migrateToEnhanced, searchMemorySchema, updateMemorySchema };
export type { ApiResponse, CLICapabilities, CLICommand, CLIInfo, CreateMemoryRequest, CreateTopicRequest, EnhancedMemoryClientConfig, MCPChannel, MemoryClientConfig, MemoryEntry, MemorySearchResult, MemoryStatus, MemoryTopic, MemoryType, OperationResult, PaginatedResponse, RoutingStrategy, SearchMemoryRequest, SmartConfigOptions, UpdateMemoryRequest, UserMemoryStats };
