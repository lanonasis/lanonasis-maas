import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import chalk from 'chalk';
import { CLIConfig } from './config.js';

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
  tags?: string[];
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
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
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
    this.client = axios.create();
    
    // Setup request interceptor to add auth token
    this.client.interceptors.request.use(async (config) => {
      await this.config.init();
      
      const token = this.config.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      config.baseURL = this.config.getApiUrl();
      
      if (process.env.CLI_VERBOSE === 'true') {
        console.log(chalk.dim(`→ ${config.method?.toUpperCase()} ${config.url}`));
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
    const response = await this.client.post('/api/v1/auth/login', {
      email,
      password
    });
    return response.data;
  }

  async register(email: string, password: string, organizationName?: string): Promise<AuthResponse> {
    const response = await this.client.post('/api/v1/auth/register', {
      email,
      password,
      organization_name: organizationName
    });
    return response.data;
  }

  // Memory operations - aligned with existing schema
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
    const response = await this.client.get('/api/v1/health');
    return response.data;
  }

  // Generic request method
  async request<T = Record<string, unknown>>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request(config);
    return response.data;
  }
}

export const apiClient = new APIClient();