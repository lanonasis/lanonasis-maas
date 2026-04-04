import axios from 'axios';
import chalk from 'chalk';
import { randomUUID } from 'crypto';
import { CLIConfig } from './config.js';
const MEMORY_TYPES = [
    'context',
    'project',
    'knowledge',
    'reference',
    'personal',
    'workflow'
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class APIClient {
    client;
    config;
    /** When true, throw on 401/403 instead of printing+exiting (for callers that handle errors) */
    noExit = false;
    isLikelyHashedCredential(value) {
        return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
    }
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
    tryNormalizeMemoryEntry(payload) {
        if (!payload || typeof payload !== 'object') {
            return undefined;
        }
        const normalized = this.normalizeMemoryEntry(payload);
        if (!normalized || typeof normalized !== 'object') {
            return undefined;
        }
        const normalizedRecord = normalized;
        return typeof normalizedRecord.id === 'string' ? normalized : undefined;
    }
    normalizeMemoryStats(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Memory stats endpoint returned an invalid response.');
        }
        const envelope = payload;
        const rawStats = envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
            ? envelope.data
            : envelope;
        const rawByType = rawStats.memories_by_type && typeof rawStats.memories_by_type === 'object' && !Array.isArray(rawStats.memories_by_type)
            ? rawStats.memories_by_type
            : rawStats.by_type && typeof rawStats.by_type === 'object' && !Array.isArray(rawStats.by_type)
                ? rawStats.by_type
                : {};
        const memoriesByType = MEMORY_TYPES.reduce((accumulator, memoryType) => {
            const value = rawByType[memoryType];
            accumulator[memoryType] = typeof value === 'number' ? value : 0;
            return accumulator;
        }, {});
        const recentMemories = Array.isArray(rawStats.recent_memories)
            ? rawStats.recent_memories
                .map((entry) => this.tryNormalizeMemoryEntry(entry))
                .filter((entry) => entry !== undefined)
            : [];
        const totalMemories = typeof rawStats.total_memories === 'number'
            ? rawStats.total_memories
            : Object.values(memoriesByType).reduce((sum, count) => sum + count, 0);
        return {
            total_memories: totalMemories,
            memories_by_type: memoriesByType,
            total_size_bytes: typeof rawStats.total_size_bytes === 'number' ? rawStats.total_size_bytes : 0,
            avg_access_count: typeof rawStats.avg_access_count === 'number' ? rawStats.avg_access_count : 0,
            most_accessed_memory: this.tryNormalizeMemoryEntry(rawStats.most_accessed_memory),
            recent_memories: recentMemories
        };
    }
    shouldUseLegacyMemoryRpcFallback(error) {
        const status = error?.response?.status;
        const errorData = error?.response?.data;
        const message = `${errorData?.error || ''} ${errorData?.message || ''}`.toLowerCase();
        const rawRequestUrl = String(error?.config?.url || '');
        const requestPath = (() => {
            try {
                if (/^https?:\/\//i.test(rawRequestUrl)) {
                    return new URL(rawRequestUrl).pathname;
                }
            }
            catch {
                // Fall back to the raw URL if URL parsing fails.
            }
            return rawRequestUrl;
        })();
        const normalizedRequestUrl = requestPath.startsWith('/memory')
            ? this.normalizeMcpPathToApi(requestPath)
            : requestPath;
        if (status === 405) {
            return true;
        }
        if (status === 404 && /^\/api\/v1\/memories\/[^/?#]+$/.test(normalizedRequestUrl)) {
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
    shouldRetryViaApiGateway(error) {
        const baseURL = String(error?.config?.baseURL || '');
        const code = String(error?.code || '');
        const alreadyRetried = Boolean(error?.config?.__retriedViaApiGateway);
        if (alreadyRetried)
            return false;
        if (!baseURL.includes('mcp.lanonasis.com'))
            return false;
        return code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED';
    }
    shouldRetryViaSupabaseMemoryFunctions(error) {
        const status = Number(error?.response?.status || 0);
        if (status !== 401 && status !== 404)
            return false;
        const cfg = (error?.config || {});
        if (cfg.__retriedViaSupabaseMemoryFunctions || cfg.__useSupabaseMemoryFunctions)
            return false;
        const baseURL = String(cfg.baseURL || '');
        if (baseURL.includes('supabase.co'))
            return false;
        const requestUrl = String(cfg.url || '');
        const normalizedRequestUrl = requestUrl.startsWith('/memory')
            ? this.normalizeMcpPathToApi(requestUrl)
            : requestUrl;
        if (!normalizedRequestUrl.startsWith('/api/v1/memories'))
            return false;
        const errorData = error?.response?.data;
        const responseText = typeof errorData === 'string'
            ? errorData
            : `${errorData?.message || ''} ${errorData?.error || ''}`;
        if (status === 401) {
            const indicatesRouteShapeDrift = /invalid jwt|missing authorization header|authentication required|token is not active or has expired/i
                .test(responseText);
            if (!indicatesRouteShapeDrift)
                return false;
        }
        if (status === 404) {
            const isGetByIdRequest = /^\/api\/v1\/memories\/[^/?#]+$/.test(normalizedRequestUrl);
            const indicatesMissingMcpGetRoute = /cannot get \/api\/v1\/memory\/|cannot get \/memory\/|route[_ -]?not[_ -]?found/i
                .test(responseText.toLowerCase());
            if (!isGetByIdRequest || !indicatesMissingMcpGetRoute)
                return false;
        }
        const authMethod = String(this.config.get('authMethod') || '');
        const token = this.config.getToken();
        const hasOpaqueToken = Boolean(token) && token.split('.').length !== 3;
        const hasVendorKey = this.config.hasVendorKey();
        return hasVendorKey || hasOpaqueToken || authMethod === 'oauth' || authMethod === 'oauth2';
    }
    isUuid(value) {
        return UUID_PATTERN.test(value);
    }
    async resolveMemoryId(idOrPrefix) {
        const candidate = idOrPrefix.trim();
        if (!candidate) {
            throw new Error('Memory ID is required.');
        }
        if (this.isUuid(candidate)) {
            return candidate;
        }
        if (candidate.length < 8) {
            throw new Error('Memory ID prefix must be at least 8 characters or a full UUID.');
        }
        const matches = new Set();
        const normalizedCandidate = candidate.toLowerCase();
        const limit = 100;
        let page = 1;
        while (true) {
            const result = await this.getMemories({ page, limit });
            const memories = result.memories || result.data || [];
            if (memories.length === 0) {
                break;
            }
            for (const memory of memories) {
                if (memory.id.toLowerCase().startsWith(normalizedCandidate)) {
                    matches.add(memory.id);
                }
            }
            const pagination = result.pagination || {
                total: memories.length,
                limit,
                offset: 0,
                has_more: false,
            };
            const totalPages = Number.isFinite(Number(pagination.pages))
                ? Number(pagination.pages)
                : Math.max(1, Math.ceil(Number(pagination.total || memories.length) / limit));
            const hasMore = typeof pagination.has_more === 'boolean'
                ? pagination.has_more
                : page < totalPages;
            if (!hasMore) {
                break;
            }
            page += 1;
        }
        const resolvedMatches = [...matches];
        if (resolvedMatches.length === 0) {
            throw new Error(`Memory not found for ID/prefix: ${candidate}`);
        }
        if (resolvedMatches.length > 1) {
            throw new Error(`Memory ID prefix is ambiguous: ${candidate}. Matches: ${resolvedMatches.slice(0, 5).join(', ')}`);
        }
        return resolvedMatches[0];
    }
    shouldUsePostListFallback(error) {
        const status = Number(error?.response?.status || 0);
        if (status === 405)
            return true;
        if (status !== 401)
            return false;
        const message = String(error?.response?.data?.message || error?.response?.data?.error || '');
        return /missing authorization header|authentication required/i.test(message);
    }
    getSupabaseFunctionsBaseUrl() {
        const discoveredServices = this.config.get('discoveredServices');
        const candidates = [
            process.env.LANONASIS_SUPABASE_URL,
            process.env.SUPABASE_URL,
            discoveredServices?.memory_base
        ];
        for (const candidate of candidates) {
            if (typeof candidate === 'string'
                && candidate.includes('supabase.co')
                && !candidate.includes('your-project.supabase.co')
                && !candidate.includes('<project-ref>.supabase.co')) {
                return candidate.replace(/\/$/, '');
            }
        }
        return 'https://lanonasis.supabase.co';
    }
    mapMemoryApiRouteToSupabaseFunctions(config, token, vendorKey) {
        const method = String(config.method || 'get').toLowerCase();
        const rawUrl = String(config.url || '');
        const url = rawUrl.startsWith('/memory')
            ? this.normalizeMcpPathToApi(rawUrl)
            : rawUrl;
        const mapped = config;
        mapped.baseURL = this.getSupabaseFunctionsBaseUrl();
        mapped.headers = mapped.headers || {};
        if (token) {
            mapped.headers.Authorization = `Bearer ${token}`;
            delete mapped.headers['X-API-Key'];
        }
        else if (vendorKey) {
            mapped.headers['X-API-Key'] = vendorKey;
        }
        // Supabase functions do not need X-Auth-Method and can reject unexpected values.
        delete mapped.headers['X-Auth-Method'];
        mapped.headers['X-Project-Scope'] = 'lanonasis-maas';
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
                    ? config.data
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
    normalizeMcpPathToApi(url) {
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
            const isAuthGatewayManagementEndpoint = typeof config.url === 'string'
                && (config.url.startsWith('/api/v1/auth/api-keys')
                    || config.url.startsWith('/api/v1/projects'));
            const discoveredServices = this.config.get('discoveredServices');
            const authMethod = this.config.get('authMethod');
            const vendorKey = await this.config.getVendorKeyAsync();
            const token = this.config.getToken();
            const useSupabaseMemoryFunctions = config.__useSupabaseMemoryFunctions === true;
            const normalizedMemoryUrl = typeof config.url === 'string'
                ? this.normalizeMcpPathToApi(config.url)
                : '';
            const isMemoryEndpoint = normalizedMemoryUrl.startsWith('/api/v1/memories');
            const forceApiFromEnv = process.env.LANONASIS_FORCE_API === 'true'
                || process.env.CLI_FORCE_API === 'true'
                || process.env.ONASIS_FORCE_API === 'true';
            const forceApiFromConfig = this.config.get('forceApi') === true
                || this.config.get('connectionTransport') === 'api';
            if (useSupabaseMemoryFunctions && isMemoryEndpoint) {
                const remapped = this.mapMemoryApiRouteToSupabaseFunctions(config, token || undefined, vendorKey || undefined);
                if (process.env.CLI_VERBOSE === 'true') {
                    const requestId = randomUUID();
                    remapped.headers['X-Request-ID'] = requestId;
                    remapped.headers['X-Transport-Mode'] = 'supabase-functions-fallback';
                    console.log(chalk.dim(`→ ${String(remapped.method || 'get').toUpperCase()} ${remapped.url} [${requestId}]`));
                    console.log(chalk.dim(`  transport=supabase-functions-fallback baseURL=${remapped.baseURL}`));
                }
                return remapped;
            }
            const forceDirectApiRetry = config
                .__forceDirectApiGatewayRetry === true;
            // NOTE: isMemoryEndpoint is intentionally NOT in forceDirectApi.
            // api.lanonasis.com is the vendor AI proxy, NOT the memory service.
            // Memory operations must go to mcp.lanonasis.com.
            const forceDirectApi = forceApiFromEnv || forceApiFromConfig || forceDirectApiRetry;
            const prefersTokenAuth = Boolean(token) && (authMethod === 'jwt' || authMethod === 'oauth' || authMethod === 'oauth2');
            const useVendorKeyAuth = Boolean(vendorKey) && !prefersTokenAuth;
            if (authMethod === 'vendor_key' && this.isLikelyHashedCredential(vendorKey)) {
                throw new Error('Stored vendor key is in legacy hashed format. Run "lanonasis auth login --vendor-key <your-key>" to refresh secure storage.');
            }
            // Determine the correct API base URL:
            // - Auth endpoints -> auth.lanonasis.com
            // - Memory/MCP operations (JWT or vendor key) -> mcp.lanonasis.com (the memory service)
            // - Other direct API calls -> api.lanonasis.com (vendor AI proxy)
            let apiBaseUrl;
            const useMcpServer = !forceDirectApi && !isAuthEndpoint && (prefersTokenAuth || useVendorKeyAuth || isMemoryEndpoint);
            if (isAuthEndpoint || isAuthGatewayManagementEndpoint) {
                apiBaseUrl = discoveredServices?.auth_base || 'https://auth.lanonasis.com';
            }
            else if (forceDirectApi) {
                // Explicit force: direct to api.lanonasis.com for troubleshooting.
                apiBaseUrl = this.config.getApiUrl();
            }
            else if (useMcpServer) {
                // Memory service lives at mcp.lanonasis.com — accepts JWT, OAuth, and vendor keys.
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
            if (isAuthEndpoint || isAuthGatewayManagementEndpoint) {
                config.headers['X-Project-Scope'] = 'lanonasis-maas';
            }
            // Enhanced Authentication Support
            // In forced direct-API mode, prefer bearer token auth when available.
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
            if (this.shouldRetryViaSupabaseMemoryFunctions(error)) {
                const retryConfig = {
                    ...error.config,
                    __retriedViaSupabaseMemoryFunctions: true,
                    __useSupabaseMemoryFunctions: true
                };
                return this.client.request(retryConfig);
            }
            if (this.shouldRetryViaApiGateway(error)) {
                const retryConfig = {
                    ...error.config,
                    __retriedViaApiGateway: true,
                    __forceDirectApiGatewayRetry: true
                };
                retryConfig.baseURL = this.config.getApiUrl();
                if (typeof retryConfig.url === 'string') {
                    retryConfig.url = this.normalizeMcpPathToApi(retryConfig.url);
                }
                return this.client.request(retryConfig);
            }
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
            if (this.shouldUsePostListFallback(error)) {
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
        const resolvedId = await this.resolveMemoryId(id);
        try {
            const response = await this.client.get(`/api/v1/memories/${encodeURIComponent(resolvedId)}`);
            return this.normalizeMemoryEntry(response.data);
        }
        catch (error) {
            if (this.shouldUseLegacyMemoryRpcFallback(error)) {
                const fallback = await this.client.get('/api/v1/memory/get', {
                    params: { id: resolvedId }
                });
                const payload = fallback.data && typeof fallback.data === 'object'
                    ? fallback.data.data ?? fallback.data
                    : fallback.data;
                return this.normalizeMemoryEntry(payload);
            }
            throw error;
        }
    }
    async updateMemory(id, data) {
        const resolvedId = await this.resolveMemoryId(id);
        try {
            const response = await this.client.put(`/api/v1/memories/${encodeURIComponent(resolvedId)}`, data);
            return this.normalizeMemoryEntry(response.data);
        }
        catch (error) {
            if (this.shouldUseLegacyMemoryRpcFallback(error) || error?.response?.status === 404) {
                const fallback = await this.client.post('/api/v1/memory/update', {
                    id: resolvedId,
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
        const resolvedId = await this.resolveMemoryId(id);
        try {
            await this.client.delete(`/api/v1/memories/${encodeURIComponent(resolvedId)}`);
        }
        catch (error) {
            if (this.shouldUseLegacyMemoryRpcFallback(error) || error?.response?.status === 404) {
                await this.client.delete('/api/v1/memory/delete', {
                    params: { id: resolvedId }
                });
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
        return this.normalizeMemoryStats(response.data);
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
