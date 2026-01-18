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
} from '@lanonasis/memory-client';

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
      'X-Project-Scope': 'lanonasis-maas',  // Required by backend auth middleware
    };

    if (config.authToken) {
      this.baseHeaders['Authorization'] = `Bearer ${config.authToken}`;
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Normalize base URL - remove trailing slash and any /api suffix
    let baseUrl = this.config.apiUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (baseUrl.endsWith('/api') || baseUrl.endsWith('/api/v1')) {
      baseUrl = baseUrl.replace(/\/api(\/v1)?$/, '');
    }
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Build full URL
    const url = `${baseUrl}/api/v1${normalizedEndpoint}`;
    
    console.log('[MaaSClient] Request:', url);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
      
      const headers: Record<string, string> = { ...this.baseHeaders, ...(options.headers as Record<string, string> | undefined) };

      // Send raw API key - server handles hashing and comparison
      // Standard API auth: client sends raw key, server hashes and compares
      if (this.config.apiKey && !this.config.authToken) {
        headers['X-API-Key'] = this.config.apiKey;
        console.log('[MaaSClient] Using X-API-Key auth, key prefix:', this.config.apiKey.substring(0, 8) + '...');
      } else if (this.config.authToken) {
        console.log('[MaaSClient] Using Bearer auth');
      } else {
        console.log('[MaaSClient] WARNING: No authentication configured!');
      }

      const response = await fetch(url, {
        headers,
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data: Record<string, unknown>;
      
      if (contentType?.includes('application/json')) {
        data = await response.json() as Record<string, unknown>;
      } else {
        const text = await response.text();
        data = { error: `Unexpected response: ${text.substring(0, 100)}` };
      }

      if (!response.ok) {
        const errorMsg = (data?.error as string) || (data?.message as string) || `HTTP ${response.status}: ${response.statusText}`;
        console.error('[MaaSClient] Error:', errorMsg);
        return { error: errorMsg };
      }

      return { data: data as T };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('[MaaSClient] Request timeout:', url);
          return { error: 'Request timeout' };
        }
        console.error('[MaaSClient] Fetch error:', error.message);
        return { error: `Network error: ${error.message}` };
      }
      return { error: 'Unknown network error' };
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
      `/memory/list?${params.toString()}`
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
export const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;
export const isNode = typeof process !== 'undefined' && process.versions?.node;

// Default configurations for different environments
export const defaultConfigs = {
  development: {
    apiUrl: 'http://localhost:3001',
    timeout: 30000
  },
  production: {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 10000
  },
  gateway: {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 15000
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
