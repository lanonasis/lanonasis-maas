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
} from '../types/memory-aligned';

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

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || `HTTP ${response.status}` };
      }

      return { data };
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
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;

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