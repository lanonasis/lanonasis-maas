/**
 * Memory as a Service (MaaS) Client SDK
 * Aligned with sd-ghost-protocol schema
 */

import { 
  MemoryEntry, 
  MemoryTopic, 
  CreateMemoryRequest, 
  UpdateMemoryRequest, 
  SearchMemoryRequest,
  CreateTopicRequest,
  MemorySearchResult,
  UserMemoryStats 
} from './types.js';

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

export class MaaSClient {
  private config: MaaSClientConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: MaaSClientConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };

    this.baseHeaders = {
      'Content-Type': 'application/json',
    };

    if (config.authToken) {
      this.baseHeaders['Authorization'] = `Bearer ${config.authToken}`;
    } else if (config.apiKey) {
      this.baseHeaders['X-API-Key'] = config.apiKey;
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.apiUrl}/api/v1${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: { ...this.baseHeaders, ...options.headers },
        ...options,
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return { error: data?.error || `HTTP ${response.status}` };
      }

      return { data: data as T };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  // Memory Operations
  async createMemory(memory: CreateMemoryRequest): Promise<ApiResponse<MemoryEntry>> {
    return this.request<MemoryEntry>('/memory', {
      method: 'POST',
      body: JSON.stringify(memory)
    });
  }

  /**
   * Create memory with intelligent preprocessing
   * Applies content cleaning, chunking, and metadata extraction
   */
  async createMemoryWithPreprocessing(
    memory: CreateMemoryRequest & {
      enablePreprocessing?: boolean;
      chunkingStrategy?: 'fixed-size' | 'semantic' | 'paragraph' | 'sentence' | 'code-block';
      maxChunkSize?: number;
      chunkOverlap?: number;
    }
  ): Promise<ApiResponse<MemoryEntry & { preprocessing?: { applied: boolean; chunkCount: number } }>> {
    return this.request('/memory', {
      method: 'POST',
      body: JSON.stringify({
        ...memory,
        enablePreprocessing: true,
        chunkingStrategy: memory.chunkingStrategy || 'semantic',
        maxChunkSize: memory.maxChunkSize || 1000,
        chunkOverlap: memory.chunkOverlap || 200
      })
    });
  }

  async getMemory(id: string): Promise<ApiResponse<MemoryEntry>> {
    return this.request<MemoryEntry>(`/memory/${id}`);
  }

  async updateMemory(id: string, updates: UpdateMemoryRequest): Promise<ApiResponse<MemoryEntry>> {
    return this.request<MemoryEntry>(`/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteMemory(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/memory/${id}`, {
      method: 'DELETE'
    });
  }

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
      if (value !== undefined) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });

    return this.request<PaginatedResponse<MemoryEntry>>(
      `/memory?${params.toString()}`
    );
  }

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
   * Build intelligent context from memories
   * Assembles relevant memories into optimized context for AI interactions
   */
  async buildContext(options: {
    query: string;
    memoryIds?: string[];
    strategy?: 'relevance' | 'temporal' | 'conversational' | 'diverse' | 'hierarchical' | 'hybrid';
    maxTokens?: number;
    modelConfig?: string;
    minRelevanceScore?: number;
    deduplicate?: boolean;
    useCache?: boolean;
    cacheExpiry?: number;
  }): Promise<ApiResponse<{
    context: string;
    memories: any[];
    totalTokens: number;
    strategy: string;
    quality: {
      relevanceScore: number;
      coherenceScore: number;
      diversityScore: number;
      coverageScore: number;
      temporalConsistency: number;
      deduplicationRatio: number;
    };
    metadata: {
      buildTimeMs: number;
      memoriesConsidered: number;
      memoriesIncluded: number;
      memoriesExcluded: number;
      averageRelevance: number;
      tokenUtilization: number;
      strategyUsed: string;
      deduplicationApplied: boolean;
    };
    cached: boolean;
  }>> {
    return this.request('/memory/build-context', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  /**
   * Search memories and build context in one call
   * Convenience method combining search and context building
   */
  async searchWithContext(
    query: string,
    options?: {
      strategy?: 'relevance' | 'temporal' | 'conversational' | 'diverse' | 'hierarchical' | 'hybrid';
      maxTokens?: number;
      modelConfig?: string;
      minRelevanceScore?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<{
    context: string;
    memories: any[];
    searchResults: MemorySearchResult[];
    totalTokens: number;
    quality: any;
  }>> {
    // First search for relevant memories
    const searchResponse = await this.searchMemories({
      query,
      limit: options?.limit || 20,
      status: 'active',
      threshold: options?.minRelevanceScore || 0.7,
      similarity_threshold: options?.minRelevanceScore
    });

    if (searchResponse.error || !searchResponse.data) {
      return {
        error: searchResponse.error || 'Search failed'
      };
    }

    // Extract memory IDs from search results
    const memoryIds = searchResponse.data.results
      .map(r => r.memory_id ?? r.id)
      .filter((id): id is string => Boolean(id));

    if (memoryIds.length === 0) {
      return {
        data: {
          context: '',
          memories: [],
          searchResults: [],
          totalTokens: 0,
          quality: null
        }
      };
    }

    // Build context from search results
    const contextResponse = await this.buildContext({
      query,
      memoryIds,
      strategy: options?.strategy || 'relevance',
      maxTokens: options?.maxTokens || 4000,
      modelConfig: options?.modelConfig || 'gpt-4',
      minRelevanceScore: options?.minRelevanceScore || 0.7,
      deduplicate: true,
      useCache: true
    });

    if (contextResponse.error || !contextResponse.data) {
      return {
        error: contextResponse.error || 'Context building failed'
      };
    }

    return {
      data: {
        context: contextResponse.data.context,
        memories: contextResponse.data.memories,
        searchResults: searchResponse.data.results,
        totalTokens: contextResponse.data.totalTokens,
        quality: contextResponse.data.quality
      }
    };
  }

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
  async createTopic(topic: CreateTopicRequest): Promise<ApiResponse<MemoryTopic>> {
    return this.request<MemoryTopic>('/topics', {
      method: 'POST',
      body: JSON.stringify(topic)
    });
  }

  async getTopics(): Promise<ApiResponse<MemoryTopic[]>> {
    return this.request<MemoryTopic[]>('/topics');
  }

  async getTopic(id: string): Promise<ApiResponse<MemoryTopic>> {
    return this.request<MemoryTopic>(`/topics/${id}`);
  }

  async updateTopic(id: string, updates: Partial<CreateTopicRequest>): Promise<ApiResponse<MemoryTopic>> {
    return this.request<MemoryTopic>(`/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteTopic(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/topics/${id}`, {
      method: 'DELETE'
    });
  }

  // Statistics
  async getMemoryStats(): Promise<ApiResponse<UserMemoryStats>> {
    return this.request<UserMemoryStats>('/memory/stats');
  }

  // Health Check
  async getHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request('/health');
  }

  // =============================================================================
  // API Key Management
  // =============================================================================

  /**
   * Create a new project for organizing API keys
   */
  async createProject(projectData: {
    name: string;
    description?: string;
    organizationId: string;
    teamMembers?: string[];
    settings?: Record<string, any>;
  }): Promise<ApiResponse<any>> {
    return this.request('/api-keys/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  /**
   * Get all projects for an organization
   */
  async getProjects(organizationId?: string): Promise<ApiResponse<any[]>> {
    const params = organizationId ? `?organizationId=${organizationId}` : '';
    return this.request(`/api-keys/projects${params}`);
  }

  /**
   * Create a new API key
   */
  async createApiKey(keyData: {
    name: string;
    keyType?: string;
    environment?: 'development' | 'staging' | 'production';
    accessLevel?: 'public' | 'authenticated' | 'team' | 'admin' | 'enterprise';
    projectId: string;
    tags?: string[];
    expiresAt?: string;
    rotationFrequency?: number;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<{
    id: string;
    name: string;
    key: string; // The actual key value (only returned on creation)
    [key: string]: any;
  }>> {
    return this.request('/api-keys', {
      method: 'POST',
      body: JSON.stringify(keyData)
    });
  }

  /**
   * List all API keys
   */
  async listApiKeys(filters?: {
    organizationId?: string;
    projectId?: string;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters?.organizationId) {
      params.append('organizationId', filters.organizationId);
    }
    if (filters?.projectId) {
      params.append('projectId', filters.projectId);
    }
    
    const queryString = params.toString();
    return this.request(`/api-keys${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKey(keyId: string): Promise<ApiResponse<any>> {
    return this.request(`/api-keys/${keyId}`);
  }

  /**
   * Update an API key
   */
  async updateApiKey(keyId: string, updates: {
    name?: string;
    keyType?: string;
    environment?: string;
    accessLevel?: string;
    tags?: string[];
    expiresAt?: string;
    rotationFrequency?: number;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<any>> {
    return this.request(`/api-keys/${keyId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Rotate an API key (generate new value)
   */
  async rotateApiKey(keyId: string): Promise<ApiResponse<{
    id: string;
    key: string; // The new key value
    [key: string]: any;
  }>> {
    return this.request(`/api-keys/${keyId}/rotate`, {
      method: 'POST'
    });
  }

  /**
   * Delete (revoke) an API key
   */
  async deleteApiKey(keyId: string): Promise<ApiResponse<void>> {
    return this.request(`/api-keys/${keyId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get usage analytics for an API key
   */
  async getApiKeyUsage(keyId: string, days: number = 30): Promise<ApiResponse<any[]>> {
    return this.request(`/api-keys/${keyId}/usage?days=${days}`);
  }

  /**
   * Get security events for the organization
   */
  async getSecurityEvents(severity?: 'low' | 'medium' | 'high' | 'critical'): Promise<ApiResponse<any[]>> {
    const params = severity ? `?severity=${severity}` : '';
    return this.request(`/api-keys/security/events${params}`);
  }

  /**
   * Register an MCP tool
   */
  async registerMCPTool(toolData: {
    toolId: string;
    toolName: string;
    organizationId: string;
    permissions: {
      keys: string[];
      environments: ('development' | 'staging' | 'production')[];
      maxConcurrentSessions?: number;
      maxSessionDuration?: number;
    };
    webhookUrl?: string;
    autoApprove?: boolean;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<ApiResponse<any>> {
    return this.request('/api-keys/mcp/tools', {
      method: 'POST',
      body: JSON.stringify(toolData)
    });
  }

  /**
   * Get all MCP tools for an organization
   */
  async getMCPTools(): Promise<ApiResponse<any[]>> {
    return this.request('/api-keys/mcp/tools');
  }

  /**
   * Create an MCP access request
   */
  async createMCPAccessRequest(requestData: {
    toolId: string;
    organizationId: string;
    keyNames: string[];
    environment: 'development' | 'staging' | 'production';
    justification: string;
    estimatedDuration: number;
    context?: Record<string, any>;
  }): Promise<ApiResponse<{ requestId: string }>> {
    return this.request('/api-keys/mcp/access-requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  /**
   * Create an MCP session from an approved request
   */
  async createMCPSession(requestId: string): Promise<ApiResponse<any>> {
    return this.request('/api-keys/mcp/sessions', {
      method: 'POST',
      body: JSON.stringify({ requestId })
    });
  }

  /**
   * Get a proxy token for accessing a key in an MCP session
   */
  async getProxyToken(sessionId: string, keyName: string): Promise<ApiResponse<{
    proxyToken: string;
    expiresAt: string;
  }>> {
    return this.request('/api-keys/mcp/proxy-token', {
      method: 'POST',
      body: JSON.stringify({ sessionId, keyName })
    });
  }

  // Utility Methods
  setAuthToken(token: string): void {
    this.baseHeaders['Authorization'] = `Bearer ${token}`;
    delete this.baseHeaders['X-API-Key'];
  }

  setApiKey(apiKey: string): void {
    this.baseHeaders['X-API-Key'] = apiKey;
    delete this.baseHeaders['Authorization'];
  }

  clearAuth(): void {
    delete this.baseHeaders['Authorization'];
    delete this.baseHeaders['X-API-Key'];
  }
}

// Factory function for easy initialization
export function createMaaSClient(config: MaaSClientConfig): MaaSClient {
  return new MaaSClient(config);
}

// React Hook for MaaS Client (if using React)
export function useMaaSClient(config: MaaSClientConfig): MaaSClient {
  // In a real React app, you'd use useMemo here
  return new MaaSClient(config);
}

// Browser/Node.js detection  
export const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;
export const isNode = typeof globalThis !== 'undefined' && 'process' in globalThis && globalThis.process?.versions?.node;

// Default configurations for different environments
export const defaultConfigs = {
  development: {
    apiUrl: 'http://localhost:3000',
    timeout: 30000
  },
  production: {
    apiUrl: 'https://api.yourdomain.com',
    timeout: 10000
  }
};

// Type exports for consumers
export type {
  MemoryEntry,
  MemoryTopic,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  CreateTopicRequest,
  MemorySearchResult,
  UserMemoryStats
};

// Alias for compatibility
export const MemoryClient = MaaSClient;

export default MaaSClient;