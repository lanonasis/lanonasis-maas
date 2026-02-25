import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import chalk from 'chalk';
import { randomUUID } from 'crypto';
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
export type WriteIntent = 'new' | 'continue' | 'auto';

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
  continuity_key?: string;
  idempotency_key?: string;
  write_intent?: WriteIntent;
}

export interface UpdateMemoryRequest {
  title?: string;
  content?: string;
  memory_type?: MemoryType;
  tags?: string[];
  topic_id?: string | null;
  metadata?: Record<string, unknown>;
  continuity_key?: string;
  idempotency_key?: string;
  write_intent?: WriteIntent;
}

export interface GetMemoriesParams {
  page?: number;
  limit?: number;
  offset?: number;
  memory_type?: MemoryType;
  tags?: string[] | string;
  topic_id?: string;
  user_id?: string;
  sort?: 'created_at' | 'updated_at' | 'last_accessed' | 'access_count' | 'title';
  order?: 'asc' | 'desc';
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
  similarity_score: number;
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

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  provider: string | null;
  project_scope: string | null;
  platform: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  metadata?: { locale: string | null; timezone: string | null };
}

export class APIClient {
  private client: AxiosInstance;
  private config: CLIConfig;
  /** When true, throw on 401/403 instead of printing+exiting (for callers that handle errors) */
  noExit = false;

  private normalizeMemoryEntry(payload: unknown): MemoryEntry {
    // API responses are inconsistent across gateways:
    // - Some return the memory entry directly
    // - Some wrap it in `{ data: <memory>, message?: string }`
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      const directId = obj.id;
      if (typeof directId === 'string' && directId.length > 0) {
        return payload as MemoryEntry;
      }
      const data = obj.data;
      if (data && typeof data === 'object') {
        const dataObj = data as Record<string, unknown>;
        if (typeof dataObj.id === 'string' && dataObj.id.length > 0) {
          return data as MemoryEntry;
        }
      }
    }
    return payload as MemoryEntry;
  }

  private shouldUseLegacyMemoryRpcFallback(error: any): boolean {
    const status = error?.response?.status;
    const errorData = error?.response?.data;
    const message = `${errorData?.error || ''} ${errorData?.message || ''}`.toLowerCase();

    if (status === 405) {
      return true;
    }

    if (status === 400 && message.includes('memory id is required')) {
      return true;
    }

    if (status === 400 && message.includes('method not allowed')) {
      return true;
    }

    return false;
  }

  private shouldRetryViaApiGateway(error: any): boolean {
    const baseURL = String(error?.config?.baseURL || '');
    const code = String(error?.code || '');
    const alreadyRetried = Boolean(error?.config?.__retriedViaApiGateway);
    if (alreadyRetried) return false;
    if (!baseURL.includes('mcp.lanonasis.com')) return false;
    return code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED';
  }

  private shouldRetryViaSupabaseMemoryFunctions(error: any): boolean {
    const status = Number(error?.response?.status || 0);
    if (status !== 401) return false;

    const cfg = (error?.config || {}) as AxiosRequestConfig & {
      __retriedViaSupabaseMemoryFunctions?: boolean;
      __useSupabaseMemoryFunctions?: boolean;
    };
    if (cfg.__retriedViaSupabaseMemoryFunctions || cfg.__useSupabaseMemoryFunctions) return false;

    const baseURL = String(cfg.baseURL || '');
    if (baseURL.includes('supabase.co')) return false;

    const requestUrl = String(cfg.url || '');
    if (!requestUrl.startsWith('/api/v1/memories')) return false;

    const message = String(error?.response?.data?.message || error?.response?.data?.error || '');
    if (!/invalid jwt/i.test(message)) return false;

    const authMethod = String(this.config.get<string>('authMethod') || '');
    const token = this.config.getToken();
    const hasOpaqueToken = Boolean(token) && token!.split('.').length !== 3;

    return hasOpaqueToken || authMethod === 'oauth' || authMethod === 'oauth2';
  }

  private getSupabaseFunctionsBaseUrl(): string {
    const discoveredServices = this.config.get<any>('discoveredServices');
    const candidates = [
      process.env.LANONASIS_SUPABASE_URL,
      process.env.SUPABASE_URL,
      discoveredServices?.memory_base
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.includes('supabase.co')) {
        return candidate.replace(/\/$/, '');
      }
    }

    return 'https://lanonasis.supabase.co';
  }

  private mapMemoryApiRouteToSupabaseFunctions(
    config: InternalAxiosRequestConfig,
    token?: string,
    vendorKey?: string
  ): InternalAxiosRequestConfig {
    const method = String(config.method || 'get').toLowerCase();
    const url = String(config.url || '');

    const mapped = config;
    mapped.baseURL = this.getSupabaseFunctionsBaseUrl();
    mapped.headers = mapped.headers || ({} as InternalAxiosRequestConfig['headers']);

    if (token) {
      (mapped.headers as any).Authorization = `Bearer ${token}`;
      delete (mapped.headers as any)['X-API-Key'];
    } else if (vendorKey) {
      (mapped.headers as any)['X-API-Key'] = vendorKey;
    }

    // Supabase functions do not need X-Auth-Method and can reject unexpected values.
    delete (mapped.headers as any)['X-Auth-Method'];
    (mapped.headers as any)['X-Project-Scope'] = 'lanonasis-maas';

    if (method === 'get' && url === '/api/v1/memories') {
      mapped.url = '/functions/v1/memory-list';
      return mapped;
    }
    if (method === 'post' && url === '/api/v1/memories') {
      mapped.url = '/functions/v1/memory-create';
      return mapped;
    }
    if (method === 'post' && url === '/api/v1/memories/search') {
      mapped.url = '/functions/v1/memory-search';
      return mapped;
    }
    if (method === 'get' && url === '/api/v1/memories/stats') {
      mapped.url = '/functions/v1/memory-stats';
      return mapped;
    }
    if (method === 'post' && url === '/api/v1/memories/bulk/delete') {
      mapped.url = '/functions/v1/memory-bulk-delete';
      return mapped;
    }

    const idMatch = url.match(/^\/api\/v1\/memories\/([^/?#]+)$/);
    if (idMatch) {
      const id = decodeURIComponent(idMatch[1] || '');
      if (method === 'get') {
        mapped.url = '/functions/v1/memory-get';
        mapped.params = { ...(config.params || {}), id };
        return mapped;
      }
      if (method === 'put' || method === 'patch') {
        mapped.method = 'post';
        mapped.url = '/functions/v1/memory-update';
        const body = (config.data && typeof config.data === 'object')
          ? (config.data as Record<string, unknown>)
          : {};
        mapped.data = { id, ...body };
        return mapped;
      }
      if (method === 'delete') {
        mapped.url = '/functions/v1/memory-delete';
        mapped.params = { ...(config.params || {}), id };
        return mapped;
      }
    }

    return mapped;
  }

  private normalizeMcpPathToApi(url: string): string {
    // MCP HTTP compatibility path -> API gateway REST paths
    if (url === '/memory') {
      return '/api/v1/memories';
    }
    if (url.startsWith('/memory/')) {
      return url.replace('/memory/', '/api/v1/memories/');
    }
    return url;
  }

  constructor() {
    this.config = new CLIConfig();
    this.client = axios.create({
      proxy: false // Bypass proxy to avoid redirect loops in containerized environments
    });
    
    // Setup request interceptor to add auth token and headers
    this.client.interceptors.request.use(async (config) => {
      await this.config.init();

      // Keep OAuth sessions alive automatically (prevents intermittent "auth required" cutouts).
      await this.config.refreshTokenIfNeeded();
      
      // Service Discovery
      await this.config.discoverServices();
      
      // Use appropriate base URL based on endpoint and auth method
      const isAuthEndpoint = config.url?.includes('/auth/') || config.url?.includes('/login') || config.url?.includes('/register') || config.url?.includes('/oauth/');
      const discoveredServices = this.config.get<any>('discoveredServices');
      const authMethod = this.config.get<string>('authMethod');
      const vendorKey = await this.config.getVendorKeyAsync();
      const token = this.config.getToken();
      const useSupabaseMemoryFunctions = (config as AxiosRequestConfig & {
        __useSupabaseMemoryFunctions?: boolean;
      }).__useSupabaseMemoryFunctions === true;
      const isMemoryEndpoint = typeof config.url === 'string' && config.url.startsWith('/api/v1/memories');
      const forceApiFromEnv = process.env.LANONASIS_FORCE_API === 'true'
        || process.env.CLI_FORCE_API === 'true'
        || process.env.ONASIS_FORCE_API === 'true';
      const forceApiFromConfig = this.config.get<boolean>('forceApi') === true
        || this.config.get<string>('connectionTransport') === 'api';

      if (useSupabaseMemoryFunctions && typeof config.url === 'string' && config.url.startsWith('/api/v1/memories')) {
        const remapped = this.mapMemoryApiRouteToSupabaseFunctions(config, token || undefined, vendorKey || undefined);
        if (process.env.CLI_VERBOSE === 'true') {
          const requestId = randomUUID();
          (remapped.headers as any)['X-Request-ID'] = requestId;
          (remapped.headers as any)['X-Transport-Mode'] = 'supabase-functions-fallback';
          console.log(chalk.dim(`→ ${String(remapped.method || 'get').toUpperCase()} ${remapped.url} [${requestId}]`));
          console.log(chalk.dim(`  transport=supabase-functions-fallback baseURL=${remapped.baseURL}`));
        }
        return remapped;
      }

      // Memory CRUD/search endpoints should always use the API gateway path.
      const forceDirectApiRetry = (config as AxiosRequestConfig & { __forceDirectApiGatewayRetry?: boolean })
        .__forceDirectApiGatewayRetry === true;
      const forceDirectApi = forceApiFromEnv || forceApiFromConfig || isMemoryEndpoint || forceDirectApiRetry;
      const prefersTokenAuth = Boolean(token) && (authMethod === 'jwt' || authMethod === 'oauth' || authMethod === 'oauth2');
      const useVendorKeyAuth = Boolean(vendorKey) && !prefersTokenAuth;

      // Determine the correct API base URL:
      // - Auth endpoints -> auth.lanonasis.com
      // - JWT auth (no vendor key) -> mcp.lanonasis.com (supports JWT tokens)
      // - Vendor key auth -> api.lanonasis.com (requires vendor key)
      let apiBaseUrl: string;
      const useMcpServer = !forceDirectApi && prefersTokenAuth && !useVendorKeyAuth;

      if (isAuthEndpoint) {
        apiBaseUrl = discoveredServices?.auth_base || 'https://auth.lanonasis.com';
      } else if (forceDirectApi) {
        // Force direct REST API mode to bypass MCP routing for troubleshooting.
        apiBaseUrl = this.config.getApiUrl();
      } else if (useMcpServer) {
        // JWT/OAuth tokens work with mcp.lanonasis.com
        apiBaseUrl = 'https://mcp.lanonasis.com/api/v1';
      } else {
        apiBaseUrl = this.config.getApiUrl();
      }
      config.baseURL = apiBaseUrl;

      // Path translation for MCP server:
      // MCP uses /memory (singular) while main API uses /memories (plural)
      if (useMcpServer && config.url) {
        config.url = config.url.replace(/\/api\/v1\/memories/g, '/memory');
      }

      // Add project scope header for auth endpoints
      if (isAuthEndpoint) {
        config.headers['X-Project-Scope'] = 'lanonasis-maas';
      }

      // Enhanced Authentication Support
      // Even in forced direct-API mode, prefer bearer token auth when available.
      // This avoids accidentally sending an OAuth access token as X-API-Key (we store it
      // in secure storage for MCP/WebSocket usage), which can cause 401s.
      const preferVendorKeyInDirectApiMode = forceDirectApi && Boolean(vendorKey) && !prefersTokenAuth;
      if (preferVendorKeyInDirectApiMode) {
        // Vendor key authentication (validated server-side)
        // Send raw key - server handles hashing for comparison
        config.headers['X-API-Key'] = vendorKey;
        config.headers['X-Auth-Method'] = 'vendor_key';
      } else if (prefersTokenAuth) {
        // JWT/OAuth token authentication takes precedence when both are present.
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Auth-Method'] = 'jwt';
      } else if (vendorKey) {
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
        const transportMode = forceDirectApi ? 'api-forced' : (useMcpServer ? 'mcp-http' : 'api');
        config.headers['X-Transport-Mode'] = transportMode;
        console.log(chalk.dim(`→ ${config.method?.toUpperCase()} ${config.url} [${requestId}]`));
        console.log(chalk.dim(`  transport=${transportMode} baseURL=${config.baseURL}`));
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
        if (this.shouldRetryViaSupabaseMemoryFunctions(error)) {
          const retryConfig = {
            ...error.config,
            __retriedViaSupabaseMemoryFunctions: true,
            __useSupabaseMemoryFunctions: true
          } as AxiosRequestConfig & {
            __retriedViaSupabaseMemoryFunctions?: boolean;
            __useSupabaseMemoryFunctions?: boolean;
          };

          return this.client.request(retryConfig);
        }

        if (this.shouldRetryViaApiGateway(error)) {
          const retryConfig = {
            ...error.config,
            __retriedViaApiGateway: true,
            __forceDirectApiGatewayRetry: true
          } as AxiosRequestConfig & {
            __retriedViaApiGateway?: boolean;
            __forceDirectApiGatewayRetry?: boolean;
          };

          retryConfig.baseURL = this.config.getApiUrl();
          if (typeof retryConfig.url === 'string') {
            retryConfig.url = this.normalizeMcpPathToApi(retryConfig.url);
          }

          return this.client.request(retryConfig);
        }

        if (error.response) {
          const { status, data } = error.response as { status: number; data: ApiErrorResponse; statusText: string; };
          
          if (status === 401) {
            // Invalidate the local auth cache so the next isAuthenticated() call
            // performs a fresh server check rather than returning a stale result.
            this.config.invalidateAuthCache().catch(() => {});
            if (this.noExit) {
              // Caller handles the error (e.g. auth status probe) — throw so try/catch fires
              return Promise.reject(error);
            }
            console.error(chalk.red('✖ Authentication failed'));
            console.log(chalk.yellow('Please run:'), chalk.white('lanonasis auth login'));
            process.exit(1);
          }

          if (status === 403) {
            if (this.noExit) {
              return Promise.reject(error);
            }
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

  // Memory operations - aligned with REST API canonical endpoints
  // All memory endpoints use /api/v1/memories path (plural, per REST conventions)
  async createMemory(data: CreateMemoryRequest): Promise<MemoryEntry> {
    const response = await this.client.post('/api/v1/memories', data);
    return this.normalizeMemoryEntry(response.data);
  }

  async getMemories(params: GetMemoriesParams = {}): Promise<PaginatedResponse<MemoryEntry>> {
    try {
      const response = await this.client.get('/api/v1/memories', { params });
      return response.data;
    } catch (error: any) {
      // Backward-compatible fallback: newer API contracts may reject GET list.
      if (error?.response?.status === 405) {
        const limit = Number(params.limit || 20);
        const page = Number(params.page || 1);
        const offset = Number(params.offset ?? Math.max(0, (page - 1) * limit));

        // Preferred fallback: POST list endpoint (avoids triggering vector search for plain listings).
        const listPayload: Record<string, unknown> = {
          limit,
          offset
        };
        if (params.memory_type) {
          listPayload.memory_type = params.memory_type;
        }
        if (params.tags) {
          listPayload.tags = Array.isArray(params.tags)
            ? params.tags
            : String(params.tags).split(',').map((tag) => tag.trim()).filter(Boolean);
        }
        if (params.topic_id) {
          listPayload.topic_id = params.topic_id;
        }
        if (params.user_id) {
          listPayload.user_id = params.user_id;
        }
        if (params.sort || params.sort_by) {
          listPayload.sort_by = params.sort_by || params.sort;
        }
        if (params.order || params.sort_order) {
          listPayload.sort_order = params.sort_order || params.order;
        }

        for (const endpoint of ['/api/v1/memories/list', '/api/v1/memory/list']) {
          try {
            const listResponse = await this.client.post(endpoint, listPayload);
            const payload = listResponse.data || {};
            const resultsArray = Array.isArray(payload.data)
              ? payload.data
              : Array.isArray(payload.memories)
                ? payload.memories
                : Array.isArray(payload.results)
                  ? payload.results
                  : [];

            const memories = resultsArray.map((entry: unknown) => this.normalizeMemoryEntry(entry));
            const pagination = (payload.pagination && typeof payload.pagination === 'object')
              ? payload.pagination as Record<string, unknown>
              : {};
            const total = Number.isFinite(Number(pagination.total))
              ? Number(pagination.total)
              : Number.isFinite(Number(payload.total))
                ? Number(payload.total)
                : memories.length;
            const pages = Number.isFinite(Number(pagination.total_pages))
              ? Number(pagination.total_pages)
              : Number.isFinite(Number(pagination.pages))
                ? Number(pagination.pages)
                : Math.max(1, Math.ceil(total / limit));
            const currentPage = Number.isFinite(Number(pagination.page))
              ? Number(pagination.page)
              : Math.max(1, Math.floor(offset / limit) + 1);
            const hasMore = typeof pagination.has_more === 'boolean'
              ? pagination.has_more
              : typeof pagination.has_next === 'boolean'
                ? pagination.has_next
                : (offset + memories.length) < total;

            return {
              ...payload,
              data: memories,
              memories,
              pagination: {
                total,
                limit,
                offset,
                has_more: hasMore,
                page: currentPage,
                pages
              }
            };
          } catch (listError: any) {
            if (listError?.response?.status === 404 || listError?.response?.status === 405) {
              continue;
            }
            throw listError;
          }
        }

        // Secondary fallback: search endpoint for legacy contracts that expose only search.
        const searchPayload: SearchMemoryRequest & { offset?: number } = {
          query: '*',
          limit,
          threshold: 0
        };

        if (params.memory_type) {
          searchPayload.memory_types = [params.memory_type];
        }
        if (params.tags) {
          searchPayload.tags = Array.isArray(params.tags)
            ? params.tags
            : String(params.tags).split(',').map((tag) => tag.trim()).filter(Boolean);
        }
        if (params.topic_id) {
          searchPayload.topic_id = params.topic_id;
        }
        if (offset > 0) {
          searchPayload.offset = offset;
        }

        const fallback = await this.client.post('/api/v1/memories/search', searchPayload);
        const payload = fallback.data || {};
        const resultsArray = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.results)
            ? payload.results
            : [];
        const memories = resultsArray
          .map((entry: unknown) => {
            // Some gateways/search endpoints wrap results as `{ data: <memory> }`.
            if (entry && typeof entry === 'object') {
              const obj = entry as Record<string, unknown>;
              const data = obj.data;
              if (data && typeof data === 'object') {
                const dataObj = data as Record<string, unknown>;
                if (typeof dataObj.id === 'string' && dataObj.id.length > 0) {
                  return data;
                }
              }
            }
            return entry;
          })
          .map((entry: unknown) => this.normalizeMemoryEntry(entry));
        const total = Number.isFinite(payload.total) ? Number(payload.total) : memories.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        const currentPage = Math.max(1, Math.floor(offset / limit) + 1);

        return {
          ...payload,
          data: memories,
          memories,
          pagination: {
            total,
            limit,
            offset,
            has_more: (offset + memories.length) < total,
            page: currentPage,
            pages
          }
        };
      }

      throw error;
    }
  }

  async getMemory(id: string): Promise<MemoryEntry> {
    try {
      const response = await this.client.get(`/api/v1/memories/${id}`);
      return this.normalizeMemoryEntry(response.data);
    } catch (error: any) {
      if (this.shouldUseLegacyMemoryRpcFallback(error)) {
        const fallback = await this.client.post('/api/v1/memory/get', { id });
        const payload = fallback.data && typeof fallback.data === 'object'
          ? (fallback.data as Record<string, unknown>).data ?? fallback.data
          : fallback.data;
        return this.normalizeMemoryEntry(payload);
      }
      throw error;
    }
  }

  async updateMemory(id: string, data: UpdateMemoryRequest): Promise<MemoryEntry> {
    try {
      const response = await this.client.put(`/api/v1/memories/${id}`, data);
      return this.normalizeMemoryEntry(response.data);
    } catch (error: any) {
      if (this.shouldUseLegacyMemoryRpcFallback(error)) {
        const fallback = await this.client.post('/api/v1/memory/update', {
          id,
          ...data
        });
        const payload = fallback.data && typeof fallback.data === 'object'
          ? (fallback.data as Record<string, unknown>).data ?? fallback.data
          : fallback.data;
        return this.normalizeMemoryEntry(payload);
      }
      throw error;
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/memories/${id}`);
    } catch (error: any) {
      if (this.shouldUseLegacyMemoryRpcFallback(error)) {
        await this.client.post('/api/v1/memory/delete', { id });
        return;
      }
      throw error;
    }
  }

  async searchMemories(query: string, options: Omit<SearchMemoryRequest, 'query'> = {}): Promise<PaginatedResponse<MemorySearchResult>> {
    const response = await this.client.post('/api/v1/memories/search', {
      query,
      ...options
    });
    return response.data;
  }

  async getMemoryStats(): Promise<MemoryStats> {
    const response = await this.client.get('/api/v1/memories/stats');
    return response.data;
  }

  async bulkDeleteMemories(memoryIds: string[]): Promise<BulkDeleteResponse> {
    const response = await this.client.post('/api/v1/memories/bulk/delete', {
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

  /**
   * Fetch the current user's profile from the auth gateway (GET /v1/auth/me).
   * Works for all auth methods: OAuth Bearer token, vendor key (X-API-Key), and JWT.
   * The /auth/ prefix causes the request interceptor to route this to auth_base.
   */
  async getUserProfile(): Promise<UserProfile> {
    const response = await this.client.get('/v1/auth/me');
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
