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
  UserMemoryStats
} from './types';

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
   * Make an HTTP request to the API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();

    // Call onRequest hook if provided
    if (this.config.onRequest) {
      try {
        this.config.onRequest(endpoint);
      } catch (error) {
        console.warn('onRequest hook error:', error);
      }
    }

    // Handle gateway vs direct API URL formatting
    const baseUrl = this.config.apiUrl.includes('/api')
      ? this.config.apiUrl.replace('/api', '')
      : this.config.apiUrl;

    const url = `${baseUrl}/api/v1${endpoint}`;

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
        const error: ApiError = {
          message: (data as Record<string, unknown>)?.error as string || `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          code: 'API_ERROR'
        };

        // Call onError hook if provided
        if (this.config.onError) {
          try {
            this.config.onError(error);
          } catch (hookError) {
            console.warn('onError hook error:', hookError);
          }
        }

        return { error: error.message };
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

      return { data };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: 'Request timeout',
          code: 'TIMEOUT_ERROR',
          statusCode: 408
        };

        if (this.config.onError) {
          try {
            this.config.onError(timeoutError);
          } catch (hookError) {
            console.warn('onError hook error:', hookError);
          }
        }

        return { error: 'Request timeout' };
      }

      const networkError: ApiError = {
        message: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR'
      };

      if (this.config.onError) {
        try {
          this.config.onError(networkError);
        } catch (hookError) {
          console.warn('onError hook error:', hookError);
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Test the API connection and authentication
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request('/health');
  }

  // Memory Operations

  /**
   * Create a new memory
   */
  async createMemory(memory: CreateMemoryRequest): Promise<ApiResponse<MemoryEntry>> {
    const enrichedMemory = this.enrichWithOrgContext(memory as Record<string, unknown>);
    return this.request<MemoryEntry>('/memory', {
      method: 'POST',
      body: JSON.stringify(enrichedMemory)
    });
  }

  /**
   * Get a memory by ID
   */
  async getMemory(id: string): Promise<ApiResponse<MemoryEntry>> {
    return this.request<MemoryEntry>(`/memory/${encodeURIComponent(id)}`);
  }

  /**
   * Update an existing memory
   */
  async updateMemory(id: string, updates: UpdateMemoryRequest): Promise<ApiResponse<MemoryEntry>> {
    return this.request<MemoryEntry>(`/memory/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/memory/${encodeURIComponent(id)}`, {
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
    const endpoint = queryString ? `/memory?${queryString}` : '/memory';

    return this.request<PaginatedResponse<MemoryEntry>>(endpoint);
  }

  /**
   * Search memories using semantic search
   */
  async searchMemories(request: SearchMemoryRequest): Promise<ApiResponse<{
    results: MemorySearchResult[];
    total_results: number;
    search_time_ms: number;
  }>> {
    const enrichedRequest = this.enrichWithOrgContext(request as Record<string, unknown>);
    return this.request('/memory/search', {
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
    return this.request('/memory/bulk/delete', {
      method: 'POST',
      body: JSON.stringify(enrichedRequest)
    });
  }

  // Topic Operations

  /**
   * Create a new topic
   */
  async createTopic(topic: CreateTopicRequest): Promise<ApiResponse<MemoryTopic>> {
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
    return this.request<UserMemoryStats>('/memory/stats');
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
