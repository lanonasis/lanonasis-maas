/**
 * Centralized API client for MaaS Dashboard
 * Handles all communication with Onasis-CORE Gateway
 * Replaces direct Supabase usage with Core API calls
 */

const API_BASE_URL = import.meta.env.VITE_CORE_API_BASE_URL || 'https://api.lanonasis.com';
const MAAS_API_PREFIX = '/api/v1/maas';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface Memory {
  id: string;
  title: string;
  content: string;
  type: 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow' | 'note' | 'document';
  tags: string[];
  metadata: Record<string, any>;
  is_private: boolean;
  is_archived: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  plan: 'free' | 'pro' | 'enterprise';
  max_memories: number;
  max_storage_mb: number;
  current_memories_count: number;
  current_storage_mb: number;
  status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  permissions: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

class ApiClient {
  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-project-scope': 'maas'
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${MAAS_API_PREFIX}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: this.getAuthHeaders(),
      ...options
    };

    // Merge headers properly
    if (options.headers) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        ...options.headers
      };
    }

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Memory Management Methods

  async getMemories(params: {
    page?: number;
    limit?: number;
    type?: string;
    tags?: string[];
    search?: string;
  } = {}): Promise<ApiResponse<Memory[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.type) searchParams.set('type', params.type);
    if (params.tags?.length) searchParams.set('tags', params.tags.join(','));
    if (params.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/memories${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<Memory[]>(endpoint);
  }

  async createMemory(memory: {
    title: string;
    content: string;
    type?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<Memory>> {
    return this.makeRequest<Memory>('/memories', {
      method: 'POST',
      body: JSON.stringify(memory)
    });
  }

  async getMemory(id: string): Promise<ApiResponse<Memory>> {
    return this.makeRequest<Memory>(`/memories/${id}`);
  }

  async updateMemory(id: string, updates: {
    title?: string;
    content?: string;
    type?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<Memory>> {
    return this.makeRequest<Memory>(`/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteMemory(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/memories/${id}`, {
      method: 'DELETE'
    });
  }

  async searchMemories(query: {
    query: string;
    limit?: number;
    similarity_threshold?: number;
  }): Promise<ApiResponse<Memory[]>> {
    return this.makeRequest<Memory[]>('/memories/search', {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }

  // Organization Management Methods

  async getOrganizations(): Promise<ApiResponse<Organization[]>> {
    return this.makeRequest<Organization[]>('/organizations');
  }

  // API Key Management Methods

  async getApiKeys(): Promise<ApiResponse<ApiKey[]>> {
    return this.makeRequest<ApiKey[]>('/api-keys');
  }

  async createApiKey(keyData: {
    name: string;
    permissions?: string[];
    expires_at?: string;
  }): Promise<ApiResponse<ApiKey & { secret: string }>> {
    return this.makeRequest<ApiKey & { secret: string }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(keyData)
    });
  }

  async deleteApiKey(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/api-keys/${id}`, {
      method: 'DELETE'
    });
  }

  // Health and Status

  async healthCheck(): Promise<ApiResponse<{
    status: string;
    service: string;
    version: string;
    timestamp: string;
    capabilities: string[];
  }>> {
    return this.makeRequest<any>('/health');
  }

  // Utility Methods

  async uploadFile(file: File, metadata?: Record<string, any>): Promise<ApiResponse<{
    id: string;
    filename: string;
    size: number;
    url: string;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.makeRequest<any>('/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'x-project-scope': 'maas'
        // Don't set Content-Type for FormData, let browser set it
      }
    });
  }

  // Analytics and Usage

  async getUsageStats(params: {
    start_date?: string;
    end_date?: string;
    metric_type?: string;
  } = {}): Promise<ApiResponse<{
    total_memories: number;
    memories_created: number;
    searches_performed: number;
    api_calls: number;
    storage_used_mb: number;
  }>> {
    const searchParams = new URLSearchParams();
    
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);
    if (params.metric_type) searchParams.set('metric_type', params.metric_type);

    const queryString = searchParams.toString();
    const endpoint = `/analytics/usage${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<any>(endpoint);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { Memory, Organization, ApiKey, ApiResponse };