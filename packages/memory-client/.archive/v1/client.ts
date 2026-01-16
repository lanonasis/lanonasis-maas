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
export interface MemoryClientConfig {
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
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
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
 * Memory Client class for interacting with the Memory as a Service API
 */
export class MemoryClient {
  private config: Required<Omit<MemoryClientConfig, 'apiKey' | 'authToken' | 'headers'>> & 
    Pick<MemoryClientConfig, 'apiKey' | 'authToken' | 'headers'>;
  private baseHeaders: Record<string, string>;

  constructor(config: MemoryClientConfig) {
    this.config = {
      timeout: 30000,
      useGateway: true,
      ...config
    };

    this.baseHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': '@lanonasis/memory-client/1.0.0',
      ...config.headers
    };

    // Set authentication headers
    if (config.authToken) {
      this.baseHeaders['Authorization'] = `Bearer ${config.authToken}`;
    } else if (config.apiKey) {
      this.baseHeaders['X-API-Key'] = config.apiKey;
    }
  }

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
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
        return { 
          error: (data as Record<string, unknown>)?.error as string || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      return { data };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request timeout' };
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
    return this.request<MemoryEntry>('/memory', {
      method: 'POST',
      body: JSON.stringify(memory)
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
    return this.request('/memory/search', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Bulk delete multiple memories
   */
  async bulkDeleteMemories(memoryIds: string[]): Promise<ApiResponse<{
    deleted_count: number;
    failed_ids: string[];
  }>> {
    return this.request('/memory/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ memory_ids: memoryIds })
    });
  }

  // Topic Operations

  /**
   * Create a new topic
   */
  async createTopic(topic: CreateTopicRequest): Promise<ApiResponse<MemoryTopic>> {
    return this.request<MemoryTopic>('/topics', {
      method: 'POST',
      body: JSON.stringify(topic)
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
  updateConfig(updates: Partial<MemoryClientConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.headers) {
      this.baseHeaders = { ...this.baseHeaders, ...updates.headers };
    }
  }

  /**
   * Get current configuration (excluding sensitive data)
   */
  getConfig(): Omit<MemoryClientConfig, 'apiKey' | 'authToken'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey, authToken, ...safeConfig } = this.config;
    return safeConfig;
  }
}

/**
 * Factory function to create a new Memory Client instance
 */
export function createMemoryClient(config: MemoryClientConfig): MemoryClient {
  return new MemoryClient(config);
}