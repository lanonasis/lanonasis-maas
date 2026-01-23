/**
 * Core Memory Client - Pure Browser-Safe Implementation
 *
 * NO Node.js dependencies, NO CLI code, NO child_process
 * Works in: Browser, React Native, Cloudflare Workers, Edge Functions, Deno, Bun
 *
 * Bundle size: ~15KB gzipped
 */

import type {
  MemoryEntry,
  MemoryTopic,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  CreateTopicRequest,
  MemorySearchResult,
  UserMemoryStats,
  // Intelligence types
  EnhancedSearchRequest,
  EnhancedSearchResponse,
  SearchAnalytics,
  AccessPatterns,
  ExtendedMemoryStats,
  AnalyticsDateRange,
  CreateMemoryWithPreprocessingRequest,
  UpdateMemoryWithPreprocessingRequest
} from './types';

import {
  createMemorySchema,
  updateMemorySchema,
  searchMemorySchema,
  createTopicSchema,
  enhancedSearchSchema,
  analyticsDateRangeSchema
} from './types';

import type { ApiErrorResponse } from './errors';
import {
  createErrorResponse,
  createErrorFromResponse,
  sleep,
  calculateRetryDelay,
  isRetryableError
} from './utils';

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
  /** Organization ID (optional - will be auto-resolved if not provided) */
  organizationId?: string;
  /** User ID (optional - used as fallback for organization ID) */
  userId?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers to include with requests */
  headers?: Record<string, string>;

  // Advanced options (all optional)
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

  // Hooks for custom behavior
  /** Called when an error occurs */
  onError?: (error: ApiErrorResponse) => void;
  /** Called before each request */
  onRequest?: (endpoint: string) => void;
  /** Called after each response */
  onResponse?: (endpoint: string, duration: number) => void;
}

/**
 * Standard API response wrapper with typed errors
 * Replaces string errors with structured ApiErrorResponse
 */
export interface ApiResponse<T> {
  data?: T;
  /** Structured error response for programmatic handling */
  error?: ApiErrorResponse;
  /** Optional success message */
  message?: string;
  /** Request metadata */
  meta?: {
    requestId?: string;
    duration?: number;
    retries?: number;
  };
}

/**
 * Helper to check if response has error
 */
export function hasError<T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: ApiErrorResponse } {
  return response.error !== undefined;
}

/**
 * Helper to check if response has data
 */
export function hasData<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.data !== undefined;
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
export class CoreMemoryClient {
  private config: Required<Omit<CoreMemoryClientConfig, 'apiKey' | 'authToken' | 'organizationId' | 'userId' | 'headers' | 'retry' | 'cache' | 'onError' | 'onRequest' | 'onResponse'>> &
    Pick<CoreMemoryClientConfig, 'apiKey' | 'authToken' | 'organizationId' | 'userId' | 'headers' | 'retry' | 'cache' | 'onError' | 'onRequest' | 'onResponse'>;
  private baseHeaders: Record<string, string>;

  constructor(config: CoreMemoryClientConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };

    this.baseHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': '@lanonasis/memory-client/2.0.0',
      'X-Project-Scope': 'lanonasis-maas',  // Required by backend auth middleware
      ...config.headers
    };

    // Set authentication headers
    if (config.authToken) {
      this.baseHeaders['Authorization'] = `Bearer ${config.authToken}`;
    } else if (config.apiKey) {
      this.baseHeaders['X-API-Key'] = config.apiKey;
    }

    // Add organization ID header if provided
    if (config.organizationId) {
      this.baseHeaders['X-Organization-ID'] = config.organizationId;
    }
  }

  /**
   * Enrich request body with organization context if configured
   * This ensures the API has the organization_id even if not in auth token
   */
  private enrichWithOrgContext<T extends Record<string, unknown>>(body: T): T {
    // If organizationId is configured, include it in the request body
    if (this.config.organizationId && !body.organization_id) {
      return {
        ...body,
        organization_id: this.config.organizationId
      };
    }
    // Fallback to userId if no organizationId configured
    if (!this.config.organizationId && this.config.userId && !body.organization_id) {
      return {
        ...body,
        organization_id: this.config.userId
      };
    }
    return body;
  }

  /**
   * Make an HTTP request to the API with retry support
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const maxRetries = this.config.retry?.maxRetries ?? 3;
    const baseDelay = this.config.retry?.retryDelay ?? 1000;
    const backoff = this.config.retry?.backoff ?? 'exponential';

    // Call onRequest hook if provided
    if (this.config.onRequest) {
      try {
        this.config.onRequest(endpoint);
      } catch (error) {
        console.warn('onRequest hook error:', error);
      }
    }

    // Handle gateway vs direct API URL formatting
    // Strip any trailing /api, /api/v1, or /api/v1/ suffixes to avoid double paths
    let baseUrl = this.config.apiUrl;
    baseUrl = baseUrl.replace(/\/api\/v1\/?$/, '');  // Remove /api/v1 or /api/v1/
    baseUrl = baseUrl.replace(/\/api\/?$/, '');       // Remove /api or /api/

    const url = `${baseUrl}/api/v1${endpoint}`;

    let lastError: ApiErrorResponse | undefined;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          headers: { ...this.baseHeaders, ...options.headers },
          signal: controller.signal,
          ...options,
        });

        clearTimeout(timeoutId);

        let data: T;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          data = await response.json() as T;
        } else {
          data = await response.text() as unknown as T;
        }

        if (!response.ok) {
          const error = createErrorFromResponse(response.status, response.statusText, data);

          // Only retry on retryable errors (5xx, 429, 408)
          if (isRetryableError(response.status) && attempt < maxRetries) {
            lastError = error;
            const delay = calculateRetryDelay(attempt, baseDelay, backoff);
            await sleep(delay);
            attempt++;
            continue;
          }

          // Call onError hook if provided
          if (this.config.onError) {
            try {
              this.config.onError(error);
            } catch (hookError) {
              console.warn('onError hook error:', hookError);
            }
          }

          return { error, meta: { duration: Date.now() - startTime, retries: attempt } };
        }

        // Call onResponse hook if provided
        if (this.config.onResponse) {
          try {
            const duration = Date.now() - startTime;
            this.config.onResponse(endpoint, duration);
          } catch (error) {
            console.warn('onResponse hook error:', error);
          }
        }

        return { data, meta: { duration: Date.now() - startTime, retries: attempt } };

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          const timeoutError = createErrorResponse('Request timeout', 'TIMEOUT_ERROR', 408);

          // Retry on timeout
          if (attempt < maxRetries) {
            lastError = timeoutError;
            const delay = calculateRetryDelay(attempt, baseDelay, backoff);
            await sleep(delay);
            attempt++;
            continue;
          }

          if (this.config.onError) {
            try {
              this.config.onError(timeoutError);
            } catch (hookError) {
              console.warn('onError hook error:', hookError);
            }
          }

          return { error: timeoutError, meta: { duration: Date.now() - startTime, retries: attempt } };
        }

        const networkError = createErrorResponse(
          error instanceof Error ? error.message : 'Network error',
          'NETWORK_ERROR'
        );

        // Retry on network errors
        if (attempt < maxRetries) {
          lastError = networkError;
          const delay = calculateRetryDelay(attempt, baseDelay, backoff);
          await sleep(delay);
          attempt++;
          continue;
        }

        if (this.config.onError) {
          try {
            this.config.onError(networkError);
          } catch (hookError) {
            console.warn('onError hook error:', hookError);
          }
        }

        return { error: networkError, meta: { duration: Date.now() - startTime, retries: attempt } };
      }
    }

    // Should never reach here, but handle it gracefully
    return {
      error: lastError ?? createErrorResponse('Max retries exceeded', 'API_ERROR'),
      meta: { duration: Date.now() - startTime, retries: attempt }
    };
  }

  /**
   * Validate input using Zod schema and return validation error if invalid
   */
  private validateInput<T>(
    schema: { safeParse: (data: unknown) => { success: boolean; error?: unknown; data?: T } },
    data: unknown
  ): ApiResponse<T> | null {
    const result = schema.safeParse(data);
    if (!result.success) {
      // Extract error details from Zod error
      const zodError = result.error as { issues?: Array<{ path: PropertyKey[]; message: string }> } | undefined;
      const details = zodError?.issues?.map(issue => ({
        field: issue.path.map(String).join('.'),
        message: issue.message
      })) ?? [];

      return {
        error: createErrorResponse(
          'Validation failed',
          'VALIDATION_ERROR',
          400,
          details
        )
      };
    }
    return null;
  }

  /**
   * Test the API connection and authentication
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request('/health');
  }

  // Memory Operations

  /**
   * Create a new memory with validation
   */
  async createMemory(memory: CreateMemoryRequest): Promise<ApiResponse<MemoryEntry>> {
    // Validate input before making request
    const validationError = this.validateInput(createMemorySchema, memory);
    if (validationError) {
      return { error: validationError.error };
    }

    const enrichedMemory = this.enrichWithOrgContext(memory as Record<string, unknown>);
    return this.request<MemoryEntry>('/memories', {
      method: 'POST',
      body: JSON.stringify(enrichedMemory)
    });
  }

  /**
   * Get a memory by ID
   */
  async getMemory(id: string): Promise<ApiResponse<MemoryEntry>> {
    return this.request<MemoryEntry>(`/memories/${encodeURIComponent(id)}`);
  }

  /**
   * Update an existing memory with validation
   */
  async updateMemory(id: string, updates: UpdateMemoryRequest): Promise<ApiResponse<MemoryEntry>> {
    // Validate input before making request
    const validationError = this.validateInput(updateMemorySchema, updates);
    if (validationError) {
      return { error: validationError.error };
    }

    return this.request<MemoryEntry>(`/memories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/memories/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  /**
   * List memories with optional filtering and pagination
   */
  async listMemories(options: {
    page?: number;
    limit?: number;
    memory_type?: string;
    topic_id?: string;
    project_ref?: string;
    status?: string;
    tags?: string[];
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<ApiResponse<PaginatedResponse<MemoryEntry>>> {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const queryString = params.toString();
    // Use /memory/list endpoint (not /memories - blocked by CDN/proxy layer)
    const endpoint = queryString ? `/memory/list?${queryString}` : '/memory/list';

    return this.request<PaginatedResponse<MemoryEntry>>(endpoint);
  }

  /**
   * Search memories using semantic search with validation
   */
  async searchMemories(request: SearchMemoryRequest): Promise<ApiResponse<{
    results: MemorySearchResult[];
    total_results: number;
    search_time_ms: number;
  }>> {
    // Validate input before making request
    const validationError = this.validateInput(searchMemorySchema, request);
    if (validationError) {
      // Return error response (data will be undefined, only error is set)
      return { error: validationError.error };
    }

    const enrichedRequest = this.enrichWithOrgContext(request as Record<string, unknown>);
    return this.request('/memories/search', {
      method: 'POST',
      body: JSON.stringify(enrichedRequest)
    });
  }

  /**
   * Bulk delete multiple memories
   */
  async bulkDeleteMemories(memoryIds: string[]): Promise<ApiResponse<{
    deleted_count: number;
    failed_ids: string[];
  }>> {
    const enrichedRequest = this.enrichWithOrgContext({ memory_ids: memoryIds });
    return this.request('/memories/bulk/delete', {
      method: 'POST',
      body: JSON.stringify(enrichedRequest)
    });
  }

  // Topic Operations

  /**
   * Create a new topic with validation
   */
  async createTopic(topic: CreateTopicRequest): Promise<ApiResponse<MemoryTopic>> {
    // Validate input before making request
    const validationError = this.validateInput(createTopicSchema, topic);
    if (validationError) {
      return { error: validationError.error };
    }

    const enrichedTopic = this.enrichWithOrgContext(topic as Record<string, unknown>);
    return this.request<MemoryTopic>('/topics', {
      method: 'POST',
      body: JSON.stringify(enrichedTopic)
    });
  }

  /**
   * Get all topics
   */
  async getTopics(): Promise<ApiResponse<MemoryTopic[]>> {
    return this.request<MemoryTopic[]>('/topics');
  }

  /**
   * Get a topic by ID
   */
  async getTopic(id: string): Promise<ApiResponse<MemoryTopic>> {
    return this.request<MemoryTopic>(`/topics/${encodeURIComponent(id)}`);
  }

  /**
   * Update a topic
   */
  async updateTopic(id: string, updates: Partial<CreateTopicRequest>): Promise<ApiResponse<MemoryTopic>> {
    return this.request<MemoryTopic>(`/topics/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete a topic
   */
  async deleteTopic(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/topics/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get user memory statistics
   */
  async getMemoryStats(): Promise<ApiResponse<UserMemoryStats>> {
    return this.request<UserMemoryStats>('/memories/stats');
  }

  // ========================================
  // Intelligence Features (v2.0)
  // ========================================

  /**
   * Create a memory with preprocessing options (chunking, intelligence extraction)
   *
   * @example
   * ```typescript
   * const result = await client.createMemoryWithPreprocessing({
   *   title: 'Auth System Docs',
   *   content: 'Long content...',
   *   memory_type: 'knowledge',
   *   preprocessing: {
   *     chunking: { strategy: 'semantic', maxChunkSize: 1000 },
   *     extractMetadata: true
   *   }
   * });
   * ```
   */
  async createMemoryWithPreprocessing(
    memory: CreateMemoryWithPreprocessingRequest
  ): Promise<ApiResponse<MemoryEntry>> {
    // Validate base memory fields
    const validationError = this.validateInput(createMemorySchema, memory);
    if (validationError) {
      return { error: validationError.error };
    }

    const enrichedMemory = this.enrichWithOrgContext(memory as unknown as Record<string, unknown>);
    return this.request<MemoryEntry>('/memories', {
      method: 'POST',
      body: JSON.stringify(enrichedMemory)
    });
  }

  /**
   * Update a memory with re-chunking and embedding regeneration
   *
   * @example
   * ```typescript
   * const result = await client.updateMemoryWithPreprocessing('mem_123', {
   *   content: 'Updated content...',
   *   rechunk: true,
   *   regenerate_embedding: true
   * });
   * ```
   */
  async updateMemoryWithPreprocessing(
    id: string,
    updates: UpdateMemoryWithPreprocessingRequest
  ): Promise<ApiResponse<MemoryEntry>> {
    const validationError = this.validateInput(updateMemorySchema, updates);
    if (validationError) {
      return { error: validationError.error };
    }

    return this.request<MemoryEntry>(`/memories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Enhanced semantic search with hybrid mode (vector + text)
   *
   * @example
   * ```typescript
   * const result = await client.enhancedSearch({
   *   query: 'authentication flow',
   *   search_mode: 'hybrid',
   *   filters: { tags: ['auth'], project_id: 'proj_123' },
   *   include_chunks: true
   * });
   * ```
   */
  async enhancedSearch(
    request: EnhancedSearchRequest
  ): Promise<ApiResponse<EnhancedSearchResponse>> {
    const validationError = this.validateInput(enhancedSearchSchema, request);
    if (validationError) {
      return { error: validationError.error };
    }

    const enrichedRequest = this.enrichWithOrgContext(request as unknown as Record<string, unknown>);
    return this.request<EnhancedSearchResponse>('/memory/search', {
      method: 'POST',
      body: JSON.stringify(enrichedRequest)
    });
  }

  // ========================================
  // Analytics Operations
  // ========================================

  /**
   * Get search analytics data
   *
   * @example
   * ```typescript
   * const analytics = await client.getSearchAnalytics({
   *   from: '2025-01-01',
   *   to: '2025-12-31',
   *   group_by: 'day'
   * });
   * ```
   */
  async getSearchAnalytics(
    options: AnalyticsDateRange = {}
  ): Promise<ApiResponse<SearchAnalytics>> {
    const validationError = this.validateInput(analyticsDateRangeSchema, options);
    if (validationError) {
      return { error: validationError.error };
    }

    const params = new URLSearchParams();
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);
    if (options.group_by) params.append('group_by', options.group_by);

    const queryString = params.toString();
    const endpoint = queryString ? `/analytics/search?${queryString}` : '/analytics/search';

    return this.request<SearchAnalytics>(endpoint);
  }

  /**
   * Get memory access patterns
   *
   * @example
   * ```typescript
   * const patterns = await client.getAccessPatterns({
   *   from: '2025-01-01',
   *   to: '2025-12-31'
   * });
   * console.log(patterns.data?.most_accessed);
   * ```
   */
  async getAccessPatterns(
    options: AnalyticsDateRange = {}
  ): Promise<ApiResponse<AccessPatterns>> {
    const params = new URLSearchParams();
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);

    const queryString = params.toString();
    const endpoint = queryString ? `/analytics/access?${queryString}` : '/analytics/access';

    return this.request<AccessPatterns>(endpoint);
  }

  /**
   * Get extended memory statistics with storage and activity metrics
   *
   * @example
   * ```typescript
   * const stats = await client.getExtendedStats();
   * console.log(`Total chunks: ${stats.data?.storage.total_chunks}`);
   * console.log(`Created today: ${stats.data?.activity.created_today}`);
   * ```
   */
  async getExtendedStats(): Promise<ApiResponse<ExtendedMemoryStats>> {
    return this.request<ExtendedMemoryStats>('/analytics/stats');
  }

  /**
   * Get topic with its memories
   *
   * @example
   * ```typescript
   * const topic = await client.getTopicWithMemories('topic_123');
   * console.log(topic.data?.memories);
   * ```
   */
  async getTopicWithMemories(
    topicId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<ApiResponse<{
    topic: MemoryTopic;
    memories: MemoryEntry[];
    total_memories: number;
    subtopics: Array<{ id: string; name: string; memory_count: number }>;
  }>> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', String(options.limit));
    if (options.offset) params.append('offset', String(options.offset));

    const queryString = params.toString();
    const endpoint = queryString
      ? `/topics/${encodeURIComponent(topicId)}/memories?${queryString}`
      : `/topics/${encodeURIComponent(topicId)}/memories`;

    return this.request(endpoint);
  }

  /**
   * Get topics in hierarchical structure
   *
   * @example
   * ```typescript
   * const topics = await client.getTopicsHierarchy();
   * // Returns nested topic tree with children
   * ```
   */
  async getTopicsHierarchy(): Promise<ApiResponse<Array<MemoryTopic & {
    children: MemoryTopic[];
    memory_count: number;
  }>>> {
    return this.request('/topics?include_hierarchy=true');
  }

  // Utility Methods

  /**
   * Update authentication token
   */
  setAuthToken(token: string): void {
    this.baseHeaders['Authorization'] = `Bearer ${token}`;
    delete this.baseHeaders['X-API-Key'];
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this.baseHeaders['X-API-Key'] = apiKey;
    delete this.baseHeaders['Authorization'];
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    delete this.baseHeaders['Authorization'];
    delete this.baseHeaders['X-API-Key'];
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CoreMemoryClientConfig>): void {
    this.config = { ...this.config, ...updates };

    if (updates.headers) {
      this.baseHeaders = { ...this.baseHeaders, ...updates.headers };
    }
  }

  /**
   * Get current configuration (excluding sensitive data)
   */
  getConfig(): Omit<CoreMemoryClientConfig, 'apiKey' | 'authToken'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey, authToken, ...safeConfig } = this.config;
    return safeConfig;
  }
}

/**
 * Factory function to create a new Core Memory Client instance
 */
export function createMemoryClient(config: CoreMemoryClientConfig): CoreMemoryClient {
  return new CoreMemoryClient(config);
}
