import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import chalk from 'chalk';
import { randomUUID } from 'crypto';
import { CLIConfig } from './config.js';
import { ensureApiKeyHash } from '@lanonasis/security-sdk/hash-utils';

// Type definitions for API responses and requests
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    organization_id: string;
    role: 'admin' | 'user' | 'viewer';
    plan: 'free' | 'pro' | 'enterprise';
    created_at: string;
    updated_at: string;
  };
  token: string;
  expires_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  organization_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type MemoryType = 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  memory_type: MemoryType;
  tags: string[];
  topic_id?: string | null;
  user_id: string;
  organization_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  access_count: number;
}

export interface CreateMemoryRequest {
  title: string;
  content: string;
  memory_type?: MemoryType;
  tags?: string[];
  topic_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryRequest {
  title?: string;
  content?: string;
  memory_type?: MemoryType;
  tags?: string[];
  topic_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface GetMemoriesParams {
  limit?: number;
  offset?: number;
  memory_type?: MemoryType;
  tags?: string[] | string;
  topic_id?: string;
  sort_by?: 'created_at' | 'updated_at' | 'last_accessed' | 'access_count';
  sort_order?: 'asc' | 'desc';
}

export interface SearchMemoryRequest {
  query: string;
  memory_types?: MemoryType[];
  tags?: string[];
  topic_id?: string;
  limit?: number;
  threshold?: number;
}

export interface MemorySearchResult extends MemoryEntry {
  relevance_score: number;
}

export interface MemoryStats {
  total_memories: number;
  memories_by_type: Record<MemoryType, number>;
  total_size_bytes: number;
  avg_access_count: number;
  most_accessed_memory?: MemoryEntry;
  recent_memories: MemoryEntry[];
}

export interface BulkDeleteRequest {
  memory_ids: string[];
}

export interface BulkDeleteResponse {
  deleted_count: number;
  failed_deletes?: string[];
}

export interface MemoryTopic {
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

export interface CreateTopicRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_topic_id?: string;
}

export interface UpdateTopicRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_topic_id?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  dependencies: Record<string, { status: string; latency_ms?: number; }>;
}

export interface PaginatedResponse<T> {
  data?: T[];
  memories?: T[];
  results?: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    page?: number;
    pages?: number;
  };
  total_results?: number;
  search_time_ms?: number;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  status_code: number;
  details?: Record<string, unknown>;
}

export class APIClient {
  private client: AxiosInstance;
  private config: CLIConfig;

  constructor() {
    this.config = new CLIConfig();
    this.client = axios.create({
      proxy: false // Bypass proxy to avoid redirect loops in containerized environments
    });
    
    // Setup request interceptor to add auth token and headers
    this.client.interceptors.request.use(async (config) => {
      await this.config.init();
      
      // Service Discovery
      await this.config.discoverServices();
      
      // Use appropriate base URL based on endpoint
      const isAuthEndpoint = config.url?.includes('/auth/') || config.url?.includes('/login') || config.url?.includes('/register') || config.url?.includes('/oauth/');
      const discoveredServices = this.config.get<any>('discoveredServices');
      config.baseURL = isAuthEndpoint ?
        (discoveredServices?.auth_base || 'https://auth.lanonasis.com') :
        this.config.getApiUrl();
      
      // Add project scope header for auth endpoints
      if (isAuthEndpoint) {
        config.headers['X-Project-Scope'] = 'lanonasis-maas';
      }

      // Enhanced Authentication Support
      const token = this.config.getToken();
      const vendorKey = await this.config.getVendorKeyAsync();
      
      if (vendorKey) {
        // Vendor key authentication (validated server-side)
        // Send raw key - server handles hashing for comparison
        config.headers['X-API-Key'] = vendorKey;
        config.headers['X-Auth-Method'] = 'vendor_key';
      } else if (token) {
        // JWT token authentication
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Auth-Method'] = 'jwt';
      }
      
      // Add request ID for correlation
      const requestId = randomUUID();
      config.headers['X-Request-ID'] = requestId;
      
      // Add project scope for Golden Contract compliance
      config.headers['X-Project-Scope'] = 'lanonasis-maas';
      
      if (process.env.CLI_VERBOSE === 'true') {
        console.log(chalk.dim(`→ ${config.method?.toUpperCase()} ${config.url} [${requestId}]`));
      }
      
      return config;
    });

    // Setup response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        if (process.env.CLI_VERBOSE === 'true') {
          console.log(chalk.dim(`← ${response.status} ${response.statusText}`));
        }
        return response;
      },
      (error) => {
        if (error.response) {
          const { status, data } = error.response as { status: number; data: ApiErrorResponse; statusText: string; };
          
          if (status === 401) {
            console.error(chalk.red('✖ Authentication failed'));
            console.log(chalk.yellow('Please run:'), chalk.white('memory login'));
            process.exit(1);
          }
          
          if (status === 403) {
            console.error(chalk.red('✖ Permission denied'));
            if (data.message) {
              console.error(chalk.gray(data.message));
            }
            process.exit(1);
          }
          
          if (status === 429) {
            console.error(chalk.red('✖ Rate limit exceeded'));
            console.error(chalk.gray('Please wait a moment before trying again'));
            process.exit(1);
          }
          
          if (process.env.CLI_VERBOSE === 'true') {
            console.error(chalk.dim(`← ${status} ${error.response.statusText}`));
            console.error(chalk.dim(JSON.stringify(data, null, 2)));
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Authentication - aligned with Supabase auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post('/v1/auth/login', {
      email,
      password
    });
    return response.data;
  }

  async register(email: string, password: string, organizationName?: string): Promise<AuthResponse> {
    const response = await this.client.post('/v1/auth/signup', {
      email,
      password,
      name: organizationName
    });
    return response.data;
  }

  // Memory operations - aligned with existing schema
  // All memory endpoints use /api/v1/memory path
  async createMemory(data: CreateMemoryRequest): Promise<MemoryEntry> {
    const response = await this.client.post('/api/v1/memory', data);
    return response.data;
  }

  async getMemories(params: GetMemoriesParams = {}): Promise<PaginatedResponse<MemoryEntry>> {
    const response = await this.client.get('/api/v1/memory', { params });
    return response.data;
  }

  async getMemory(id: string): Promise<MemoryEntry> {
    const response = await this.client.get(`/api/v1/memory/${id}`);
    return response.data;
  }

  async updateMemory(id: string, data: UpdateMemoryRequest): Promise<MemoryEntry> {
    const response = await this.client.put(`/api/v1/memory/${id}`, data);
    return response.data;
  }

  async deleteMemory(id: string): Promise<void> {
    await this.client.delete(`/api/v1/memory/${id}`);
  }

  async searchMemories(query: string, options: Omit<SearchMemoryRequest, 'query'> = {}): Promise<PaginatedResponse<MemorySearchResult>> {
    const response = await this.client.post('/api/v1/memory/search', {
      query,
      ...options
    });
    return response.data;
  }

  async getMemoryStats(): Promise<MemoryStats> {
    const response = await this.client.get('/api/v1/memory/stats');
    return response.data;
  }

  async bulkDeleteMemories(memoryIds: string[]): Promise<BulkDeleteResponse> {
    const response = await this.client.post('/api/v1/memory/bulk/delete', {
      memory_ids: memoryIds
    });
    return response.data;
  }

  // Topic operations - working with existing memory_topics table
  async createTopic(data: CreateTopicRequest): Promise<MemoryTopic> {
    const response = await this.client.post('/api/v1/topics', data);
    return response.data;
  }

  async getTopics(): Promise<MemoryTopic[]> {
    const response = await this.client.get('/api/v1/topics');
    return response.data;
  }

  async getTopic(id: string): Promise<MemoryTopic> {
    const response = await this.client.get(`/api/v1/topics/${id}`);
    return response.data;
  }

  async updateTopic(id: string, data: UpdateTopicRequest): Promise<MemoryTopic> {
    const response = await this.client.put(`/api/v1/topics/${id}`, data);
    return response.data;
  }

  async deleteTopic(id: string): Promise<void> {
    await this.client.delete(`/api/v1/topics/${id}`);
  }

  // Health check
  async getHealth(): Promise<HealthStatus> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Generic request method
  async request<T = Record<string, unknown>>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request(config);
    return response.data;
  }
}

export const apiClient = new APIClient();
