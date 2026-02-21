import axios from 'axios';
import chalk from 'chalk';
import { randomUUID } from 'crypto';
import { CLIConfig } from './config.js';
export class APIClient {
    client;
    config;
    /** When true, throw on 401/403 instead of printing+exiting (for callers that handle errors) */
    noExit = false;
    normalizeMemoryEntry(payload) {
        // API responses are inconsistent across gateways:
        // - Some return the memory entry directly
        // - Some wrap it in `{ data: <memory>, message?: string }`
        if (payload && typeof payload === 'object') {
            const obj = payload;
            const directId = obj.id;
            if (typeof directId === 'string' && directId.length > 0) {
                return payload;
            }
            const data = obj.data;
            if (data && typeof data === 'object') {
                const dataObj = data;
                if (typeof dataObj.id === 'string' && dataObj.id.length > 0) {
                    return data;
                }
            }
        }
        return payload;
    }
    shouldUseLegacyMemoryRpcFallback(error) {
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
            const discoveredServices = this.config.get('discoveredServices');
            const authMethod = this.config.get('authMethod');
            const vendorKey = await this.config.getVendorKeyAsync();
            const token = this.config.getToken();
            const isMemoryEndpoint = typeof config.url === 'string' && config.url.startsWith('/api/v1/memories');
            const forceApiFromEnv = process.env.LANONASIS_FORCE_API === 'true'
                || process.env.CLI_FORCE_API === 'true'
                || process.env.ONASIS_FORCE_API === 'true';
            const forceApiFromConfig = this.config.get('forceApi') === true
                || this.config.get('connectionTransport') === 'api';
            // Memory CRUD/search endpoints should always use the API gateway path.
            const forceDirectApi = forceApiFromEnv || forceApiFromConfig || isMemoryEndpoint;
            const prefersTokenAuth = Boolean(token) && (authMethod === 'jwt' || authMethod === 'oauth' || authMethod === 'oauth2');
            const useVendorKeyAuth = Boolean(vendorKey) && !prefersTokenAuth;
            // Determine the correct API base URL:
            // - Auth endpoints -> auth.lanonasis.com
            // - JWT auth (no vendor key) -> mcp.lanonasis.com (supports JWT tokens)
            // - Vendor key auth -> api.lanonasis.com (requires vendor key)
            let apiBaseUrl;
            const useMcpServer = !forceDirectApi && prefersTokenAuth && !useVendorKeyAuth;
            if (isAuthEndpoint) {
                apiBaseUrl = discoveredServices?.auth_base || 'https://auth.lanonasis.com';
            }
            else if (forceDirectApi) {
                // Force direct REST API mode to bypass MCP routing for troubleshooting.
                apiBaseUrl = this.config.getApiUrl();
            }
            else if (useMcpServer) {
                // JWT/OAuth tokens work with mcp.lanonasis.com
                apiBaseUrl = 'https://mcp.lanonasis.com/api/v1';
            }
            else {
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
            }
            else if (prefersTokenAuth) {
                // JWT/OAuth token authentication takes precedence when both are present.
                config.headers.Authorization = `Bearer ${token}`;
                config.headers['X-Auth-Method'] = 'jwt';
            }
            else if (vendorKey) {
                // Vendor key authentication (validated server-side)
                // Send raw key - server handles hashing for comparison
                config.headers['X-API-Key'] = vendorKey;
                config.headers['X-Auth-Method'] = 'vendor_key';
            }
            else if (token) {
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
        this.client.interceptors.response.use((response) => {
            if (process.env.CLI_VERBOSE === 'true') {
                console.log(chalk.dim(`← ${response.status} ${response.statusText}`));
            }
            return response;
        }, (error) => {
            if (error.response) {
                const { status, data } = error.response;
                if (status === 401) {
                    // Invalidate the local auth cache so the next isAuthenticated() call
                    // performs a fresh server check rather than returning a stale result.
                    this.config.invalidateAuthCache().catch(() => { });
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
        });
    }
    // Authentication - aligned with Supabase auth
    async login(email, password) {
        const response = await this.client.post('/v1/auth/login', {
            email,
            password
        });
        return response.data;
    }
    async register(email, password, organizationName) {
        const response = await this.client.post('/v1/auth/signup', {
            email,
            password,
            name: organizationName
        });
        return response.data;
    }
    // Memory operations - aligned with REST API canonical endpoints
    // All memory endpoints use /api/v1/memories path (plural, per REST conventions)
    async createMemory(data) {
        const response = await this.client.post('/api/v1/memories', data);
        return this.normalizeMemoryEntry(response.data);
    }
    async getMemories(params = {}) {
        try {
            const response = await this.client.get('/api/v1/memories', { params });
            return response.data;
        }
        catch (error) {
            // Backward-compatible fallback: newer API contracts may reject GET list.
            if (error?.response?.status === 405) {
                const limit = Number(params.limit || 20);
                const page = Number(params.page || 1);
                const offset = Number(params.offset ?? Math.max(0, (page - 1) * limit));
                // Preferred fallback: POST list endpoint (avoids triggering vector search for plain listings).
                const listPayload = {
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
                        const memories = resultsArray.map((entry) => this.normalizeMemoryEntry(entry));
                        const pagination = (payload.pagination && typeof payload.pagination === 'object')
                            ? payload.pagination
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
                    }
                    catch (listError) {
                        if (listError?.response?.status === 404 || listError?.response?.status === 405) {
                            continue;
                        }
                        throw listError;
                    }
                }
                // Secondary fallback: search endpoint for legacy contracts that expose only search.
                const searchPayload = {
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
                    .map((entry) => {
                    // Some gateways/search endpoints wrap results as `{ data: <memory> }`.
                    if (entry && typeof entry === 'object') {
                        const obj = entry;
                        const data = obj.data;
                        if (data && typeof data === 'object') {
                            const dataObj = data;
                            if (typeof dataObj.id === 'string' && dataObj.id.length > 0) {
                                return data;
                            }
                        }
                    }
                    return entry;
                })
                    .map((entry) => this.normalizeMemoryEntry(entry));
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
    async getMemory(id) {
        try {
            const response = await this.client.get(`/api/v1/memories/${id}`);
            return this.normalizeMemoryEntry(response.data);
        }
        catch (error) {
            if (this.shouldUseLegacyMemoryRpcFallback(error)) {
                const fallback = await this.client.post('/api/v1/memory/get', { id });
                const payload = fallback.data && typeof fallback.data === 'object'
                    ? fallback.data.data ?? fallback.data
                    : fallback.data;
                return this.normalizeMemoryEntry(payload);
            }
            throw error;
        }
    }
    async updateMemory(id, data) {
        try {
            const response = await this.client.put(`/api/v1/memories/${id}`, data);
            return this.normalizeMemoryEntry(response.data);
        }
        catch (error) {
            if (this.shouldUseLegacyMemoryRpcFallback(error)) {
                const fallback = await this.client.post('/api/v1/memory/update', {
                    id,
                    ...data
                });
                const payload = fallback.data && typeof fallback.data === 'object'
                    ? fallback.data.data ?? fallback.data
                    : fallback.data;
                return this.normalizeMemoryEntry(payload);
            }
            throw error;
        }
    }
    async deleteMemory(id) {
        try {
            await this.client.delete(`/api/v1/memories/${id}`);
        }
        catch (error) {
            if (this.shouldUseLegacyMemoryRpcFallback(error)) {
                await this.client.post('/api/v1/memory/delete', { id });
                return;
            }
            throw error;
        }
    }
    async searchMemories(query, options = {}) {
        const response = await this.client.post('/api/v1/memories/search', {
            query,
            ...options
        });
        return response.data;
    }
    async getMemoryStats() {
        const response = await this.client.get('/api/v1/memories/stats');
        return response.data;
    }
    async bulkDeleteMemories(memoryIds) {
        const response = await this.client.post('/api/v1/memories/bulk/delete', {
            memory_ids: memoryIds
        });
        return response.data;
    }
    // Topic operations - working with existing memory_topics table
    async createTopic(data) {
        const response = await this.client.post('/api/v1/topics', data);
        return response.data;
    }
    async getTopics() {
        const response = await this.client.get('/api/v1/topics');
        return response.data;
    }
    async getTopic(id) {
        const response = await this.client.get(`/api/v1/topics/${id}`);
        return response.data;
    }
    async updateTopic(id, data) {
        const response = await this.client.put(`/api/v1/topics/${id}`, data);
        return response.data;
    }
    async deleteTopic(id) {
        await this.client.delete(`/api/v1/topics/${id}`);
    }
    // Health check
    async getHealth() {
        const response = await this.client.get('/health');
        return response.data;
    }
    /**
     * Fetch the current user's profile from the auth gateway (GET /v1/auth/me).
     * Works for all auth methods: OAuth Bearer token, vendor key (X-API-Key), and JWT.
     * The /auth/ prefix causes the request interceptor to route this to auth_base.
     */
    async getUserProfile() {
        const response = await this.client.get('/v1/auth/me');
        return response.data;
    }
    // Generic HTTP methods
    async get(url, config) {
        const response = await this.client.get(url, config);
        return response.data;
    }
    async post(url, data, config) {
        const response = await this.client.post(url, data, config);
        return response.data;
    }
    async put(url, data, config) {
        const response = await this.client.put(url, data, config);
        return response.data;
    }
    async delete(url, config) {
        const response = await this.client.delete(url, config);
        return response.data;
    }
    // Generic request method
    async request(config) {
        const response = await this.client.request(config);
        return response.data;
    }
}
export const apiClient = new APIClient();
