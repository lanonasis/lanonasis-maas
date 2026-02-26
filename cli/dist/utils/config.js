import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { jwtDecode } from 'jwt-decode';
import { randomUUID } from 'crypto';
import { ApiKeyStorage } from '@lanonasis/oauth-client';
import axios from 'axios';
export class CLIConfig {
    configDir;
    configPath;
    config = {};
    lockFile;
    static CONFIG_VERSION = '1.0.0';
    authCheckCache = null;
    AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    apiKeyStorage;
    vendorKeyCache;
    constructor() {
        this.configDir = path.join(os.homedir(), '.maas');
        this.configPath = path.join(this.configDir, 'config.json');
        this.lockFile = path.join(this.configDir, 'config.lock');
        // Initialize secure storage for vendor keys using oauth-client's ApiKeyStorage
        this.apiKeyStorage = new ApiKeyStorage();
    }
    /**
     * Overrides the configuration storage directory. Primarily used for tests.
     */
    setConfigDirectory(configDir) {
        this.configDir = configDir;
        this.configPath = path.join(configDir, 'config.json');
        this.lockFile = path.join(configDir, 'config.lock');
        this.vendorKeyCache = undefined;
    }
    /**
     * Exposes the current config path for tests and diagnostics.
     */
    getConfigPath() {
        return this.configPath;
    }
    async init() {
        try {
            await fs.mkdir(this.configDir, { recursive: true });
            await this.load();
        }
        catch {
            // Config doesn't exist yet, that's ok
        }
    }
    async load() {
        // Reset in-memory cache; disk state may have changed
        this.vendorKeyCache = undefined;
        try {
            const data = await fs.readFile(this.configPath, 'utf-8');
            this.config = JSON.parse(data);
            // Handle version migration if needed
            await this.migrateConfigIfNeeded();
        }
        catch {
            this.config = {};
            // Set version for new config
            this.config.version = CLIConfig.CONFIG_VERSION;
        }
    }
    async migrateConfigIfNeeded() {
        const currentVersion = this.config.version;
        if (!currentVersion) {
            // Legacy config without version, migrate to current version
            this.config.version = CLIConfig.CONFIG_VERSION;
            // Perform any necessary migrations for legacy configs
            // For now, just ensure the version is set
            await this.save();
        }
        else if (currentVersion !== CLIConfig.CONFIG_VERSION) {
            // Future version migrations would go here
            // For now, just update the version
            this.config.version = CLIConfig.CONFIG_VERSION;
            await this.save();
        }
    }
    async save() {
        await this.atomicSave();
    }
    async atomicSave() {
        await fs.mkdir(this.configDir, { recursive: true });
        // Acquire file lock to prevent concurrent access
        const lockAcquired = await this.acquireLock();
        if (!lockAcquired) {
            throw new Error('Could not acquire configuration lock. Another process may be modifying the config.');
        }
        try {
            // Set version and update timestamp
            this.config.version = CLIConfig.CONFIG_VERSION;
            this.config.lastUpdated = new Date().toISOString();
            // Create temporary file with unique name
            const tempPath = `${this.configPath}.tmp.${randomUUID()}`;
            // Write to temporary file first
            await fs.writeFile(tempPath, JSON.stringify(this.config, null, 2), 'utf-8');
            // Atomic rename - this is the critical atomic operation
            await fs.rename(tempPath, this.configPath);
        }
        finally {
            // Always release the lock
            await this.releaseLock();
        }
    }
    async backupConfig() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.configDir, `config.backup.${timestamp}.json`);
        try {
            // Check if config exists before backing up
            await fs.access(this.configPath);
            await fs.copyFile(this.configPath, backupPath);
            return backupPath;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // Config doesn't exist, create empty backup
                await fs.writeFile(backupPath, JSON.stringify({}, null, 2));
                return backupPath;
            }
            throw error;
        }
    }
    async acquireLock(timeoutMs = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            try {
                // Try to create lock file exclusively
                await fs.writeFile(this.lockFile, process.pid.toString(), { flag: 'wx' });
                return true;
            }
            catch (error) {
                if (error.code === 'EEXIST') {
                    // Lock file exists, check if process is still running
                    try {
                        const pidStr = await fs.readFile(this.lockFile, 'utf-8');
                        const pid = parseInt(pidStr.trim());
                        if (!isNaN(pid)) {
                            try {
                                // Check if process is still running (works on Unix-like systems)
                                process.kill(pid, 0);
                                // Process is running, wait and retry
                                await new Promise(resolve => setTimeout(resolve, 100));
                                continue;
                            }
                            catch {
                                // Process is not running, remove stale lock
                                await fs.unlink(this.lockFile).catch(() => { });
                                continue;
                            }
                        }
                    }
                    catch {
                        // Can't read lock file, remove it and retry
                        await fs.unlink(this.lockFile).catch(() => { });
                        continue;
                    }
                }
                else {
                    throw error;
                }
            }
        }
        return false;
    }
    async releaseLock() {
        try {
            await fs.unlink(this.lockFile);
        }
        catch {
            // Lock file might not exist or already removed, ignore
        }
    }
    getApiUrl() {
        const baseUrl = process.env.MEMORY_API_URL ||
            this.config.apiUrl ||
            'https://api.lanonasis.com'; // Primary REST API endpoint
        // Ensure we don't double-append /api/v1 - strip it if present since APIClient adds it
        return baseUrl.replace(/\/api\/v1\/?$/, '');
    }
    // Get API URLs with fallbacks - try multiple endpoints
    getApiUrlsWithFallbacks() {
        const primary = this.getApiUrl();
        const fallbacks = [
            'https://api.lanonasis.com',
            'https://mcp.lanonasis.com'
        ];
        // Remove duplicates and return primary first
        return [primary, ...fallbacks.filter(url => url !== primary)];
    }
    // Enhanced Service Discovery Integration
    async discoverServices(verbose = false) {
        // Honour manually configured endpoints — skip auto-discovery so we don't clobber them.
        if (this.config.manualEndpointOverrides) {
            return;
        }
        const isTestEnvironment = process.env.NODE_ENV === 'test';
        const forceDiscovery = process.env.FORCE_SERVICE_DISCOVERY === 'true';
        if ((isTestEnvironment && !forceDiscovery) || process.env.SKIP_SERVICE_DISCOVERY === 'true') {
            if (!this.config.discoveredServices) {
                this.config.discoveredServices = {
                    auth_base: 'https://auth.lanonasis.com',
                    memory_base: 'https://api.lanonasis.com', // Primary REST API (Supabase Edge Functions)
                    mcp_base: 'https://mcp.lanonasis.com/api/v1', // MCP protocol REST path
                    mcp_ws_base: 'wss://mcp.lanonasis.com/ws',
                    mcp_sse_base: 'https://mcp.lanonasis.com/api/v1/events',
                    project_scope: 'lanonasis-maas'
                };
            }
            return;
        }
        // Try multiple discovery URLs with fallbacks
        const discoveryUrls = [
            'https://api.lanonasis.com/.well-known/onasis.json',
            'https://mcp.lanonasis.com/.well-known/onasis.json'
        ];
        let response = null;
        let lastError = null;
        // Use axios instead of fetch for consistency
        const axios = (await import('axios')).default;
        for (const discoveryUrl of discoveryUrls) {
            try {
                if (verbose) {
                    console.log(`🔍 Discovering services from ${discoveryUrl}...`);
                }
                response = await axios.get(discoveryUrl, {
                    timeout: 10000,
                    maxRedirects: 5,
                    proxy: false, // Bypass proxy to avoid redirect loops
                    headers: {
                        'User-Agent': 'Lanonasis-CLI/3.0.13'
                    }
                });
                if (verbose) {
                    console.log(`✓ Successfully discovered services from ${discoveryUrl}`);
                }
                break; // Success, exit loop
            }
            catch (err) {
                lastError = err;
                if (verbose) {
                    console.log(`⚠️  Failed to discover from ${discoveryUrl}, trying next...`);
                }
                continue;
            }
        }
        if (!response) {
            throw lastError || new Error('All service discovery URLs failed');
        }
        try {
            const discovered = response.data;
            let authBase = discovered.auth?.base || discovered.auth?.login?.replace('/auth/login', '') || '';
            if (authBase.includes('localhost') || authBase.includes('127.0.0.1')) {
                authBase = 'https://auth.lanonasis.com';
            }
            // Memory base should be the REST API URL without /api/v1 suffix
            // The API client will append the path as needed
            const rawMemoryBase = discovered.endpoints?.http || 'https://api.lanonasis.com/api/v1';
            const memoryBase = rawMemoryBase.replace(/\/api\/v1\/?$/, '') || 'https://api.lanonasis.com';
            this.config.discoveredServices = {
                auth_base: authBase || 'https://auth.lanonasis.com',
                memory_base: memoryBase,
                mcp_base: `${memoryBase}/api/v1`, // Full path for MCP REST calls
                mcp_ws_base: discovered.endpoints?.websocket || 'wss://mcp.lanonasis.com/ws',
                mcp_sse_base: discovered.endpoints?.sse || `${memoryBase}/api/v1/events`,
                project_scope: 'lanonasis-maas'
            };
            this.config.apiUrl = memoryBase;
            this.config.lastServiceDiscovery = new Date().toISOString();
            await this.save();
            if (verbose) {
                console.log('✓ Service discovery completed successfully');
                console.log(`  Auth: ${this.config.discoveredServices.auth_base}`);
                console.log(`  MCP: ${this.config.discoveredServices.mcp_base}`);
                console.log(`  WebSocket: ${this.config.discoveredServices.mcp_ws_base}`);
            }
        }
        catch (error) {
            const normalizedError = this.normalizeServiceError(error);
            await this.handleServiceDiscoveryFailure(normalizedError, verbose);
        }
    }
    normalizeServiceError(error) {
        if (error && typeof error === 'object') {
            if (error instanceof Error) {
                return {
                    ...error,
                    message: error.message
                };
            }
            return error;
        }
        return {
            message: typeof error === 'string' ? error : JSON.stringify(error)
        };
    }
    async handleServiceDiscoveryFailure(error, verbose) {
        const errorType = this.categorizeServiceDiscoveryError(error);
        if (verbose || process.env.CLI_VERBOSE === 'true') {
            console.log('⚠️  Service discovery failed, using cached/fallback endpoints');
            switch (errorType) {
                case 'network_error':
                    console.log('   Reason: Network connection failed');
                    console.log('   This is normal when offline or behind restrictive firewalls');
                    break;
                case 'timeout':
                    console.log('   Reason: Request timed out');
                    console.log('   The discovery service may be temporarily slow');
                    break;
                case 'server_error':
                    console.log('   Reason: Discovery service returned an error');
                    console.log('   The service may be temporarily unavailable');
                    break;
                case 'invalid_response':
                    console.log('   Reason: Invalid response format from discovery service');
                    console.log('   Using known working endpoints instead');
                    break;
                default:
                    console.log(`   Reason: ${error.message || 'Unknown error'}`);
            }
        }
        if (this.config.discoveredServices && this.config.lastServiceDiscovery) {
            const lastDiscovery = new Date(this.config.lastServiceDiscovery);
            const hoursSinceDiscovery = (Date.now() - lastDiscovery.getTime()) / (1000 * 60 * 60);
            if (hoursSinceDiscovery < 24) {
                if (verbose) {
                    console.log('✓ Using cached service endpoints (less than 24 hours old)');
                }
                return;
            }
        }
        const fallback = this.resolveFallbackEndpoints();
        this.config.discoveredServices = {
            ...fallback.endpoints,
            project_scope: 'lanonasis-maas'
        };
        this.config.apiUrl = fallback.endpoints.memory_base;
        await this.save();
        this.logFallbackUsage(fallback.source, this.config.discoveredServices);
        if (verbose) {
            console.log('✓ Using fallback service endpoints');
            console.log(`   Source: ${fallback.source === 'environment' ? 'environment overrides' : 'built-in defaults'}`);
        }
    }
    categorizeServiceDiscoveryError(error) {
        if (error.code) {
            switch (error.code) {
                case 'ECONNREFUSED':
                case 'ENOTFOUND':
                case 'ECONNRESET':
                case 'ENETUNREACH':
                    return 'network_error';
                case 'ETIMEDOUT':
                    return 'timeout';
            }
        }
        if ((error.response?.status ?? 0) >= 500) {
            return 'server_error';
        }
        if (error.response?.status === 404) {
            return 'invalid_response';
        }
        const message = error.message?.toLowerCase() || '';
        if (message.includes('timeout')) {
            return 'timeout';
        }
        if (message.includes('network') || message.includes('connection')) {
            return 'network_error';
        }
        return 'unknown';
    }
    resolveFallbackEndpoints() {
        const envAuthBase = process.env.LANONASIS_FALLBACK_AUTH_BASE ?? process.env.AUTH_BASE;
        const envMemoryBase = process.env.LANONASIS_FALLBACK_MEMORY_BASE ?? process.env.MEMORY_BASE;
        const envMcpBase = process.env.LANONASIS_FALLBACK_MCP_BASE ?? process.env.MCP_BASE;
        const envMcpWsBase = process.env.LANONASIS_FALLBACK_MCP_WS_BASE ?? process.env.MCP_WS_BASE;
        const envMcpSseBase = process.env.LANONASIS_FALLBACK_MCP_SSE_BASE ?? process.env.MCP_SSE_BASE;
        const hasEnvOverrides = Boolean(envAuthBase || envMemoryBase || envMcpBase || envMcpWsBase || envMcpSseBase);
        const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
        const isDevEnvironment = nodeEnv === 'development' || nodeEnv === 'test';
        const defaultAuthBase = isDevEnvironment ? 'http://localhost:4000' : 'https://auth.lanonasis.com';
        const defaultMemoryBase = isDevEnvironment ? 'http://localhost:4000' : 'https://api.lanonasis.com'; // Primary REST API (Supabase Edge Functions)
        const defaultMcpBase = isDevEnvironment ? 'http://localhost:4100/api/v1' : 'https://mcp.lanonasis.com/api/v1'; // MCP protocol REST path
        const defaultMcpWsBase = isDevEnvironment ? 'ws://localhost:4100/ws' : 'wss://mcp.lanonasis.com/ws';
        const defaultMcpSseBase = isDevEnvironment ? 'http://localhost:4100/api/v1/events' : 'https://mcp.lanonasis.com/api/v1/events';
        const endpoints = {
            auth_base: envAuthBase ?? defaultAuthBase,
            memory_base: envMemoryBase ?? defaultMemoryBase,
            mcp_base: envMcpBase ?? defaultMcpBase,
            mcp_ws_base: envMcpWsBase ?? defaultMcpWsBase,
            mcp_sse_base: envMcpSseBase ?? defaultMcpSseBase
        };
        return {
            endpoints,
            source: hasEnvOverrides ? 'environment' : 'default'
        };
    }
    logFallbackUsage(source, endpoints) {
        const summary = {
            auth: endpoints.auth_base,
            mcp: endpoints.mcp_base,
            websocket: endpoints.mcp_ws_base,
            sse: endpoints.mcp_sse_base,
            source
        };
        const message = `Service discovery fallback activated using ${source === 'environment' ? 'environment overrides' : 'built-in defaults'}`;
        console.warn(`⚠️  ${message}`);
        console.info('📊 service_discovery_fallback', summary);
        if (typeof process.emitWarning === 'function') {
            process.emitWarning(message, 'ServiceDiscoveryFallback');
        }
    }
    async pingAuthHealth(axiosInstance, authBase, headers, options = {}) {
        const normalizedBase = authBase.replace(/\/$/, '');
        const endpoints = [
            `${normalizedBase}/health`,
            `${normalizedBase}/api/v1/health`
        ];
        let lastError;
        for (const endpoint of endpoints) {
            try {
                const requestConfig = {
                    headers,
                    timeout: options.timeout ?? 10000
                };
                if (options.proxy === false) {
                    requestConfig.proxy = false;
                }
                await axiosInstance.get(endpoint, requestConfig);
                return;
            }
            catch (error) {
                lastError = error;
            }
        }
        if (lastError instanceof Error) {
            throw lastError;
        }
        throw new Error('Auth health endpoints unreachable');
    }
    getAuthVerificationEndpoints(pathname) {
        const authBase = (this.config.discoveredServices?.auth_base || 'https://auth.lanonasis.com').replace(/\/$/, '');
        return Array.from(new Set([
            `${authBase}${pathname}`,
            `https://auth.lanonasis.com${pathname}`,
            `http://localhost:4000${pathname}`
        ]));
    }
    extractAuthErrorMessage(payload) {
        if (!payload || typeof payload !== 'object') {
            return undefined;
        }
        const data = payload;
        const fields = ['message', 'error', 'reason', 'code'];
        for (const field of fields) {
            const value = data[field];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value;
            }
        }
        return undefined;
    }
    async verifyTokenWithAuthGateway(token) {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'X-Project-Scope': 'lanonasis-maas'
        };
        let fallbackReason = 'Unable to verify token with auth gateway';
        // Primary check (required by auth contract): /v1/auth/verify
        for (const endpoint of this.getAuthVerificationEndpoints('/v1/auth/verify')) {
            try {
                const response = await axios.post(endpoint, {}, {
                    headers,
                    timeout: 5000,
                    proxy: false
                });
                const payload = response.data;
                if (payload.valid === true || Boolean(payload.payload)) {
                    return { valid: true, method: 'token', endpoint };
                }
                if (payload.valid === false) {
                    return {
                        valid: false,
                        method: 'token',
                        endpoint,
                        reason: this.extractAuthErrorMessage(payload) || 'Token is invalid'
                    };
                }
            }
            catch (error) {
                const normalizedError = this.normalizeServiceError(error);
                const responsePayload = normalizedError.response?.data;
                const responseCode = typeof responsePayload?.code === 'string' ? responsePayload.code : undefined;
                const reason = this.extractAuthErrorMessage(responsePayload) || normalizedError.message || fallbackReason;
                fallbackReason = reason;
                // If auth gateway explicitly rejected token, stop early.
                if ((normalizedError.response?.status === 401 || normalizedError.response?.status === 403) &&
                    responseCode &&
                    responseCode !== 'AUTH_TOKEN_MISSING') {
                    return { valid: false, method: 'token', endpoint, reason };
                }
            }
        }
        // Fallback for deployments where proxy layers strip Authorization headers.
        for (const endpoint of this.getAuthVerificationEndpoints('/v1/auth/verify-token')) {
            try {
                const response = await axios.post(endpoint, { token }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Project-Scope': 'lanonasis-maas'
                    },
                    timeout: 5000,
                    proxy: false
                });
                const payload = response.data;
                if (payload.valid === true) {
                    return { valid: true, method: 'token', endpoint };
                }
                if (payload.valid === false) {
                    return {
                        valid: false,
                        method: 'token',
                        endpoint,
                        reason: this.extractAuthErrorMessage(payload) || 'Token is invalid'
                    };
                }
            }
            catch (error) {
                const normalizedError = this.normalizeServiceError(error);
                const responsePayload = normalizedError.response?.data;
                fallbackReason = this.extractAuthErrorMessage(responsePayload) || normalizedError.message || fallbackReason;
            }
        }
        return {
            valid: false,
            method: 'token',
            reason: fallbackReason
        };
    }
    async verifyVendorKeyWithAuthGateway(vendorKey) {
        // Detect whether the stored "vendor key" is actually an OAuth/JWT access token
        // (3-part base64url string separated by dots). OAuth tokens must be verified via the
        // Bearer token path (/v1/auth/verify-token), not as API keys (/v1/auth/verify-api-key),
        // because they are not stored in the api_keys table.
        const isJwtFormat = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(vendorKey.trim());
        if (isJwtFormat) {
            // Delegate to token verification — the auth gateway's UAI router accepts Bearer tokens
            // on /v1/auth/verify (requireAuth) and /v1/auth/verify-token (public, body-based).
            return this.verifyTokenWithAuthGateway(vendorKey);
        }
        const headers = {
            'X-API-Key': vendorKey,
            'X-Auth-Method': 'vendor_key',
            'X-Project-Scope': 'lanonasis-maas'
        };
        let fallbackReason = 'Unable to verify API key with auth gateway';
        // Primary check (required by auth contract): /v1/auth/verify
        for (const endpoint of this.getAuthVerificationEndpoints('/v1/auth/verify')) {
            try {
                const response = await axios.post(endpoint, {}, {
                    headers,
                    timeout: 5000,
                    proxy: false
                });
                const payload = response.data;
                if (payload.valid === true || Boolean(payload.payload)) {
                    return { valid: true, method: 'vendor_key', endpoint };
                }
                if (payload.valid === false) {
                    return {
                        valid: false,
                        method: 'vendor_key',
                        endpoint,
                        reason: this.extractAuthErrorMessage(payload) || 'API key is invalid'
                    };
                }
            }
            catch (error) {
                const normalizedError = this.normalizeServiceError(error);
                const responsePayload = normalizedError.response?.data;
                const responseCode = typeof responsePayload?.code === 'string' ? responsePayload.code : undefined;
                const reason = this.extractAuthErrorMessage(responsePayload) || normalizedError.message || fallbackReason;
                fallbackReason = reason;
                // If auth gateway explicitly rejected API key, stop early.
                if ((normalizedError.response?.status === 401 || normalizedError.response?.status === 403) &&
                    responseCode &&
                    responseCode !== 'AUTH_TOKEN_MISSING') {
                    return { valid: false, method: 'vendor_key', endpoint, reason };
                }
            }
        }
        // Fallback for deployments where reverse proxies don't forward custom auth headers on /verify.
        for (const endpoint of this.getAuthVerificationEndpoints('/v1/auth/verify-api-key')) {
            try {
                const response = await axios.post(endpoint, {}, {
                    headers,
                    timeout: 5000,
                    proxy: false
                });
                const payload = response.data;
                if (payload.valid === true) {
                    return { valid: true, method: 'vendor_key', endpoint };
                }
                if (payload.valid === false) {
                    return {
                        valid: false,
                        method: 'vendor_key',
                        endpoint,
                        reason: this.extractAuthErrorMessage(payload) || 'API key is invalid'
                    };
                }
            }
            catch (error) {
                const normalizedError = this.normalizeServiceError(error);
                const responsePayload = normalizedError.response?.data;
                fallbackReason = this.extractAuthErrorMessage(responsePayload) || normalizedError.message || fallbackReason;
            }
        }
        return {
            valid: false,
            method: 'vendor_key',
            reason: fallbackReason
        };
    }
    async verifyCurrentCredentialsWithServer() {
        await this.refreshTokenIfNeeded();
        await this.discoverServices();
        const token = this.getToken();
        const vendorKey = await this.getVendorKeyAsync();
        if (this.config.authMethod === 'vendor_key' && vendorKey) {
            return this.verifyVendorKeyWithAuthGateway(vendorKey);
        }
        if (token) {
            return this.verifyTokenWithAuthGateway(token);
        }
        if (vendorKey) {
            return this.verifyVendorKeyWithAuthGateway(vendorKey);
        }
        return {
            valid: false,
            method: 'none',
            reason: 'No credentials configured'
        };
    }
    // Manual endpoint override functionality
    async setManualEndpoints(endpoints) {
        if (!this.config.discoveredServices) {
            // Initialize with defaults first
            await this.discoverServices();
        }
        const currentServices = this.config.discoveredServices ?? {
            auth_base: 'https://auth.lanonasis.com',
            memory_base: 'https://api.lanonasis.com', // Primary REST API (Supabase Edge Functions)
            mcp_base: 'https://mcp.lanonasis.com/api/v1', // MCP protocol REST path
            mcp_ws_base: 'wss://mcp.lanonasis.com/ws',
            mcp_sse_base: 'https://mcp.lanonasis.com/api/v1/events',
            project_scope: 'lanonasis-maas'
        };
        // Merge manual overrides with existing endpoints
        this.config.discoveredServices = {
            ...currentServices,
            ...endpoints
        };
        // Mark as manually configured
        this.config.manualEndpointOverrides = true;
        this.config.lastManualEndpointUpdate = new Date().toISOString();
        await this.save();
    }
    hasManualEndpointOverrides() {
        return !!this.config.manualEndpointOverrides;
    }
    /**
     * Clears the in-memory auth cache so that the next `isAuthenticated()` call
     * performs a fresh server verification rather than returning a stale cached result.
     *
     * NOTE: `lastValidated` is intentionally NOT deleted here. Each auth path
     * (vendor_key, token) already correctly rejects 401 responses without relying
     * on `lastValidated`. Deleting it would destroy the offline grace period
     * (7-day for vendor keys, 24-hour for JWT tokens), causing auth failures
     * on transient network errors even when credentials are valid.
     */
    async invalidateAuthCache() {
        this.authCheckCache = null;
    }
    async clearManualEndpointOverrides() {
        delete this.config.manualEndpointOverrides;
        delete this.config.lastManualEndpointUpdate;
        // Rediscover services
        await this.discoverServices();
    }
    getDiscoveredApiUrl() {
        return process.env.AUTH_BASE ||
            this.config.discoveredServices?.auth_base ||
            'https://auth.lanonasis.com';
    }
    // Enhanced authentication support
    async setVendorKey(vendorKey, options = {}) {
        const trimmedKey = typeof vendorKey === 'string' ? vendorKey.trim() : '';
        // Minimal format validation (non-empty); rely on server-side checks for everything else
        const formatValidation = this.validateVendorKeyFormat(trimmedKey);
        if (formatValidation !== true) {
            throw new Error(typeof formatValidation === 'string' ? formatValidation : 'Vendor key is invalid');
        }
        // Skip server-side validation when the caller already holds a valid auth credential
        // (e.g. an OAuth access token being stored for MCP/API access — auth-gateway won't
        // recognise it as a vendor key even though the memory API accepts it).
        const isOAuthContext = ['oauth', 'oauth2'].includes(this.config.authMethod || '');
        if (!options.skipServerValidation && !isOAuthContext) {
            await this.validateVendorKeyWithServer(trimmedKey);
        }
        // Initialize and store using ApiKeyStorage from @lanonasis/oauth-client
        // This handles encryption automatically (AES-256-GCM with machine-derived key)
        await this.apiKeyStorage.initialize();
        await this.apiKeyStorage.store({
            apiKey: trimmedKey,
            organizationId: this.config.user?.organization_id,
            userId: this.config.user?.email,
            environment: process.env.NODE_ENV || 'production',
            createdAt: new Date().toISOString()
        });
        // Cache the vendor key for this process so synchronous callers can reuse it
        this.vendorKeyCache = trimmedKey;
        if (process.env.CLI_VERBOSE === 'true') {
            console.log('🔐 Vendor key stored securely via @lanonasis/oauth-client');
        }
        // Store a reference marker in config (not the actual key)
        this.config.vendorKey = 'stored_in_api_key_storage';
        // Only set authMethod to 'vendor_key' if not already set to OAuth
        // This prevents overwriting OAuth auth method when storing the token for MCP access
        if (!this.config.authMethod || !['oauth', 'oauth2', 'jwt'].includes(this.config.authMethod)) {
            this.config.authMethod = 'vendor_key';
        }
        this.config.lastValidated = new Date().toISOString();
        await this.resetFailureCount(); // Reset failure count on successful auth
        await this.save();
    }
    validateVendorKeyFormat(vendorKey) {
        const trimmed = typeof vendorKey === 'string' ? vendorKey.trim() : '';
        if (!trimmed) {
            return 'Vendor key is required';
        }
        return true;
    }
    async validateVendorKeyWithServer(vendorKey) {
        if (process.env.SKIP_SERVER_VALIDATION === 'true') {
            return;
        }
        try {
            await this.discoverServices();
            const verification = await this.verifyVendorKeyWithAuthGateway(vendorKey);
            if (verification.valid) {
                return;
            }
            throw new Error(verification.reason || 'Authentication failed. The key may be invalid, expired, or revoked.');
        }
        catch (error) {
            const normalizedError = this.normalizeServiceError(error);
            // Provide specific error messages based on response
            if (normalizedError.response?.status === 401) {
                const errorData = normalizedError.response.data;
                if (errorData?.error?.includes('expired') || errorData?.message?.includes('expired')) {
                    throw new Error('Vendor key validation failed: Key has expired. Please generate a new key from your dashboard.');
                }
                else if (errorData?.error?.includes('revoked') || errorData?.message?.includes('revoked')) {
                    throw new Error('Vendor key validation failed: Key has been revoked. Please generate a new key from your dashboard.');
                }
                else if (errorData?.error?.includes('invalid') || errorData?.message?.includes('invalid')) {
                    throw new Error('Vendor key validation failed: Key is invalid. Please check the key format and ensure it was copied correctly.');
                }
                else {
                    throw new Error('Vendor key validation failed: Authentication failed. The key may be invalid, expired, or revoked.');
                }
            }
            else if (normalizedError.response?.status === 403) {
                throw new Error('Vendor key access denied. The key may not have sufficient permissions for this operation.');
            }
            else if (normalizedError.response?.status === 429) {
                throw new Error('Too many validation attempts. Please wait a moment before trying again.');
            }
            else if ((normalizedError.response?.status ?? 0) >= 500) {
                throw new Error('Server error during validation. Please try again in a few moments.');
            }
            else if (normalizedError.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to authentication server. Please check your internet connection and try again.');
            }
            else if (normalizedError.code === 'ENOTFOUND') {
                throw new Error('Authentication server not found. Please check your internet connection.');
            }
            else if (normalizedError.code === 'ETIMEDOUT') {
                throw new Error('Validation request timed out. Please check your internet connection and try again.');
            }
            else if (normalizedError.code === 'ECONNRESET') {
                throw new Error('Connection was reset during validation. Please try again.');
            }
            else {
                throw new Error(`Vendor key validation failed: ${normalizedError.message || 'Unknown error'}`);
            }
        }
    }
    getVendorKey() {
        if (this.vendorKeyCache) {
            return this.vendorKeyCache;
        }
        try {
            // Retrieve from secure storage using ApiKeyStorage (synchronous wrapper)
            const stored = this.getVendorKeySync();
            if (stored) {
                this.vendorKeyCache = stored;
            }
            return this.vendorKeyCache;
        }
        catch (error) {
            if (process.env.CLI_VERBOSE === 'true') {
                console.error('⚠️  Failed to load vendor key from secure storage:', error);
            }
            return undefined;
        }
    }
    /**
     * Synchronous wrapper for async retrieve operation
     * Note: ApiKeyStorage.retrieve() is async but we need sync for existing code
     */
    getVendorKeySync() {
        // For now, check legacy storage. We'll update callers to use async later
        if (this.config.vendorKey && this.config.vendorKey !== 'stored_in_api_key_storage') {
            if (process.env.CLI_VERBOSE === 'true') {
                console.log('ℹ️  Using legacy vendor key storage');
            }
            return this.config.vendorKey;
        }
        return undefined;
    }
    /**
     * Async method to get vendor key from secure storage
     */
    async getVendorKeyAsync() {
        try {
            await this.apiKeyStorage.initialize();
            const stored = await this.apiKeyStorage.retrieve();
            if (stored) {
                this.vendorKeyCache = stored.apiKey;
                return this.vendorKeyCache;
            }
        }
        catch (error) {
            if (process.env.CLI_VERBOSE === 'true') {
                console.error('⚠️  Failed to retrieve vendor key:', error);
            }
        }
        // Fallback: check for legacy plaintext storage in config
        if (this.config.vendorKey && this.config.vendorKey !== 'stored_in_api_key_storage') {
            if (process.env.CLI_VERBOSE === 'true') {
                console.log('ℹ️  Found legacy plaintext vendor key, will migrate on next auth');
            }
            this.vendorKeyCache = this.config.vendorKey;
            return this.vendorKeyCache;
        }
        return undefined;
    }
    hasVendorKey() {
        // Check for marker or legacy storage
        return !!(this.vendorKeyCache || this.config.vendorKey);
    }
    async setApiUrl(url) {
        this.config.apiUrl = url;
        await this.save();
    }
    async setToken(token) {
        this.config.token = token;
        this.config.authMethod = 'jwt';
        this.config.lastValidated = new Date().toISOString();
        await this.resetFailureCount(); // Reset failure count on successful auth
        // Decode token to get user info and expiry
        try {
            const decoded = jwtDecode(token);
            // Store token expiry
            if (typeof decoded.exp === 'number') {
                this.config.tokenExpiry = decoded.exp;
            }
            // Store user info
            this.config.user = {
                email: String(decoded.email || ''),
                organization_id: String(decoded.organizationId || ''),
                role: String(decoded.role || ''),
                plan: String(decoded.plan || '')
            };
        }
        catch {
            // Invalid token, don't store user info or expiry
            this.config.tokenExpiry = undefined;
            // Mark as non-JWT (e.g., OAuth/CLI token)
            this.config.authMethod = this.config.authMethod || 'oauth';
        }
        await this.save();
    }
    getToken() {
        return this.config.token;
    }
    async getCurrentUser() {
        return this.config.user;
    }
    async isAuthenticated() {
        // Attempt refresh for OAuth sessions before checks (prevents intermittent auth dropouts).
        // This is safe to call even when not using OAuth; it will no-op.
        await this.refreshTokenIfNeeded();
        // Check if using vendor key authentication
        if (this.config.authMethod === 'vendor_key') {
            // Use async method to read from encrypted ApiKeyStorage
            const vendorKey = await this.getVendorKeyAsync();
            if (!vendorKey)
                return false;
            // Check in-memory cache first (5-minute TTL)
            if (this.authCheckCache && (Date.now() - this.authCheckCache.timestamp) < this.AUTH_CACHE_TTL) {
                return this.authCheckCache.isValid;
            }
            // Track lastValidated for the offline grace period used in the catch block.
            // The 24-hour skip-server-validation gate has been removed: it allowed expired/revoked
            // keys to appear valid as long as they had been validated within the past day.
            const lastValidated = this.config.lastValidated;
            // Verify with server on every cache-miss
            try {
                const verification = await this.verifyVendorKeyWithAuthGateway(vendorKey);
                if (!verification.valid) {
                    // Auth gateway explicitly rejected the key — no grace period applies.
                    this.authCheckCache = { isValid: false, timestamp: Date.now() };
                    return false;
                }
                // Update last validated timestamp on success
                this.config.lastValidated = new Date().toISOString();
                await this.save().catch(() => { }); // Don't fail auth check if save fails
                this.authCheckCache = { isValid: true, timestamp: Date.now() };
                return true;
            }
            catch (err) {
                // verifyVendorKeyWithAuthGateway throws only on network/timeout errors
                // (explicit 401/403 returns {valid:false} without throwing).
                // Apply the 7-day offline grace ONLY for genuine network failures.
                const normalizedErr = this.normalizeServiceError(err);
                const httpStatus = normalizedErr.response?.status ?? 0;
                if (httpStatus === 401 || httpStatus === 403) {
                    // Explicit auth rejection propagated as an exception — definitely invalid.
                    this.authCheckCache = { isValid: false, timestamp: Date.now() };
                    return false;
                }
                // Network / server error — apply offline grace period
                const gracePeriod = 7 * 24 * 60 * 60 * 1000;
                const withinGracePeriod = lastValidated &&
                    (Date.now() - new Date(lastValidated).getTime()) < gracePeriod;
                if (withinGracePeriod) {
                    if (process.env.CLI_VERBOSE === 'true') {
                        console.warn('⚠️  Unable to validate vendor key with server, using cached validation');
                    }
                    this.authCheckCache = { isValid: true, timestamp: Date.now() };
                    return true;
                }
                if (process.env.CLI_VERBOSE === 'true') {
                    console.warn('⚠️  Vendor key validation failed and grace period expired');
                }
                this.authCheckCache = { isValid: false, timestamp: Date.now() };
                return false;
            }
        }
        // Handle token-based authentication
        const token = this.getToken();
        if (!token)
            return false;
        // OAuth tokens are often opaque (not JWT). Use local expiry metadata as a quick
        // pre-check, but do not treat it as authoritative for a "true" result. We still
        // run server verification on cache misses to avoid status/API drift.
        let oauthTokenLocallyValid;
        if (this.config.authMethod === 'oauth' || this.config.authMethod === 'oauth2') {
            const tokenExpiresAt = this.get('token_expires_at');
            if (typeof tokenExpiresAt === 'number') {
                oauthTokenLocallyValid = Date.now() < tokenExpiresAt;
                if (!oauthTokenLocallyValid) {
                    this.authCheckCache = { isValid: false, timestamp: Date.now() };
                    return false;
                }
            }
            // Fall through to server validation path.
        }
        // Check cache first
        if (this.authCheckCache && (Date.now() - this.authCheckCache.timestamp) < this.AUTH_CACHE_TTL) {
            return this.authCheckCache.isValid;
        }
        // Local expiry check first (fast)
        let locallyValid = false;
        if (typeof oauthTokenLocallyValid === 'boolean') {
            locallyValid = oauthTokenLocallyValid;
        }
        else if (token.startsWith('cli_')) {
            // Handle simple CLI tokens (format: cli_xxx_timestamp)
            const parts = token.split('_');
            if (parts.length >= 3) {
                const lastPart = parts[parts.length - 1];
                const timestamp = lastPart ? parseInt(lastPart) : NaN;
                if (!isNaN(timestamp)) {
                    // CLI tokens are valid for 30 days
                    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
                    locallyValid = (Date.now() - timestamp) < thirtyDaysInMs;
                }
            }
            else {
                locallyValid = true; // Fallback for old format
            }
        }
        else {
            // Handle JWT tokens
            try {
                const decoded = jwtDecode(token);
                const now = Date.now() / 1000;
                locallyValid = typeof decoded.exp === 'number' && decoded.exp > now;
            }
            catch {
                locallyValid = false;
            }
        }
        // If not locally valid, attempt server verification before failing
        if (!locallyValid) {
            try {
                const endpoints = [
                    'http://localhost:4000/v1/auth/verify-token',
                    'https://auth.lanonasis.com/v1/auth/verify-token'
                ];
                for (const endpoint of endpoints) {
                    try {
                        const resp = await axios.post(endpoint, { token }, { timeout: 3000 });
                        if (resp.data?.valid === true) {
                            this.authCheckCache = { isValid: true, timestamp: Date.now() };
                            return true;
                        }
                    }
                    catch {
                        // try next endpoint
                        continue;
                    }
                }
            }
            catch {
                // ignore, will fall back to failure below
            }
            this.authCheckCache = { isValid: false, timestamp: Date.now() };
            return false;
        }
        // Token is locally valid - verify with server on cache miss for consistency
        try {
            // Try auth-gateway first (port 4000), then fall back to Netlify function
            const endpoints = [
                'http://localhost:4000/v1/auth/verify-token',
                'https://auth.lanonasis.com/v1/auth/verify-token'
            ];
            let response = null;
            let networkError = false;
            let authError = false;
            for (const endpoint of endpoints) {
                try {
                    response = await axios.post(endpoint, { token }, { timeout: 3000 });
                    if (response.data.valid === true) {
                        break;
                    }
                    // Explicit auth rejection should always invalidate local auth state.
                    if (response.status === 401 || response.status === 403 || response.data.valid === false) {
                        authError = true;
                    }
                    else {
                        // Non-auth failures (like 404/5xx) should behave like transient verification failures.
                        networkError = true;
                    }
                }
                catch (error) {
                    // Check if this is a network/transient error vs explicit auth rejection.
                    if (error.response) {
                        const status = error.response.status;
                        if (status === 401 || status === 403) {
                            authError = true;
                        }
                        else {
                            networkError = true;
                        }
                    }
                    else {
                        // Network error (ECONNREFUSED, ETIMEDOUT, etc.)
                        networkError = true;
                    }
                    // Try next endpoint
                    continue;
                }
            }
            if (!response || response.data.valid !== true) {
                // If server explicitly rejected (auth error), don't trust local validation
                if (authError) {
                    if (process.env.CLI_VERBOSE === 'true') {
                        console.warn('⚠️  Server validation failed with authentication error - token is invalid');
                    }
                    this.authCheckCache = { isValid: false, timestamp: Date.now() };
                    return false;
                }
                // If purely network error AND locally valid AND recently validated (within 7 days)
                // allow offline usage with grace period
                if (networkError && locallyValid) {
                    const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
                    const lastValidated = this.config.lastValidated;
                    const withinGracePeriod = lastValidated &&
                        (Date.now() - new Date(lastValidated).getTime()) < gracePeriod;
                    if (withinGracePeriod) {
                        if (process.env.CLI_VERBOSE === 'true') {
                            console.warn('⚠️  Unable to reach server, using cached validation (offline mode)');
                        }
                        this.authCheckCache = { isValid: true, timestamp: Date.now() };
                        return true;
                    }
                    else {
                        if (process.env.CLI_VERBOSE === 'true') {
                            console.warn('⚠️  Token validation grace period expired, server validation required');
                        }
                        this.authCheckCache = { isValid: false, timestamp: Date.now() };
                        return false;
                    }
                }
                // Default to invalid if we can't validate
                this.authCheckCache = { isValid: false, timestamp: Date.now() };
                return false;
            }
            // Update lastValidated on successful server validation
            this.config.lastValidated = new Date().toISOString();
            await this.save().catch(() => { }); // Don't fail auth check if save fails
            this.authCheckCache = { isValid: true, timestamp: Date.now() };
            return true;
        }
        catch {
            // If all server checks fail, fall back to local validation
            // This allows offline usage but is less secure
            if (process.env.CLI_VERBOSE === 'true') {
                console.warn('⚠️  Unable to verify token with server, using local validation');
            }
            this.authCheckCache = { isValid: locallyValid, timestamp: Date.now() };
            return locallyValid;
        }
    }
    async logout() {
        this.config.token = undefined;
        this.config.user = undefined;
        this.vendorKeyCache = undefined;
        this.config.vendorKey = undefined;
        this.config.authMethod = undefined;
        try {
            await this.apiKeyStorage.initialize();
            // ApiKeyStorage may implement clear() to remove encrypted secrets
            const storage = this.apiKeyStorage;
            if (typeof storage.clear === 'function') {
                await storage.clear();
            }
        }
        catch {
            // Ignore storage cleanup errors during logout
        }
        await this.save();
    }
    async clear() {
        this.config = {};
        this.vendorKeyCache = undefined;
        await this.save();
    }
    async exists() {
        try {
            await fs.access(this.configPath);
            return true;
        }
        catch {
            return false;
        }
    }
    // Enhanced credential validation methods
    async validateStoredCredentials() {
        try {
            const vendorKey = await this.getVendorKeyAsync();
            const token = this.getToken();
            if (!vendorKey && !token) {
                return false;
            }
            const verification = this.config.authMethod === 'vendor_key' && vendorKey
                ? await this.verifyVendorKeyWithAuthGateway(vendorKey)
                : token
                    ? await this.verifyTokenWithAuthGateway(token)
                    : await this.verifyVendorKeyWithAuthGateway(vendorKey);
            if (!verification.valid) {
                throw new Error(verification.reason || 'Stored credentials are invalid');
            }
            // Update last validated timestamp
            this.config.lastValidated = new Date().toISOString();
            await this.resetFailureCount();
            await this.save();
            return true;
        }
        catch {
            // Increment failure count
            await this.incrementFailureCount();
            return false;
        }
    }
    async refreshTokenIfNeeded() {
        const token = this.getToken();
        if (!token) {
            return;
        }
        try {
            // OAuth token refresh (opaque tokens + refresh_token + token_expires_at)
            if (this.config.authMethod === 'oauth') {
                const refreshToken = this.get('refresh_token');
                if (!refreshToken) {
                    return;
                }
                const tokenExpiresAtRaw = this.get('token_expires_at');
                const tokenExpiresAt = (() => {
                    const n = typeof tokenExpiresAtRaw === 'number'
                        ? tokenExpiresAtRaw
                        : typeof tokenExpiresAtRaw === 'string'
                            ? Number(tokenExpiresAtRaw)
                            : undefined;
                    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
                        return undefined;
                    }
                    // Support both seconds and milliseconds since epoch.
                    // Seconds are ~1.7e9; ms are ~1.7e12.
                    return n < 1e11 ? n * 1000 : n;
                })();
                const nowMs = Date.now();
                const refreshWindowMs = 5 * 60 * 1000; // 5 minutes
                // If we don't know expiry, don't force a refresh.
                if (typeof tokenExpiresAt !== 'number' || nowMs < (tokenExpiresAt - refreshWindowMs)) {
                    return;
                }
                await this.discoverServices();
                const authBase = this.getDiscoveredApiUrl();
                const resp = await axios.post(`${authBase}/oauth/token`, {
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: 'lanonasis-cli'
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000,
                    proxy: false
                });
                // Some gateways wrap responses as `{ data: { ... } }`.
                const raw = resp?.data;
                const payload = raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object'
                    ? raw.data
                    : raw;
                const accessToken = payload?.access_token ?? payload?.token;
                const refreshedRefreshToken = payload?.refresh_token;
                const expiresIn = payload?.expires_in;
                if (typeof accessToken !== 'string' || accessToken.length === 0) {
                    throw new Error('Token refresh response missing access_token');
                }
                // setToken() assumes JWT by default; ensure authMethod stays oauth after storing.
                await this.setToken(accessToken);
                this.config.authMethod = 'oauth';
                if (typeof refreshedRefreshToken === 'string' && refreshedRefreshToken.length > 0) {
                    this.config.refresh_token = refreshedRefreshToken;
                }
                if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
                    this.config.token_expires_at = Date.now() + (expiresIn * 1000);
                }
                // Keep the encrypted "vendor key" in sync for MCP/WebSocket clients that use X-API-Key.
                // This does not change authMethod away from oauth (setVendorKey guards against that).
                try {
                    await this.setVendorKey(accessToken);
                }
                catch {
                    // Non-fatal: bearer token refresh still helps API calls.
                }
                await this.save().catch(() => { });
                return;
            }
            // Check if token is JWT and if it's close to expiry
            if (token.startsWith('cli_')) {
                // CLI tokens don't need refresh, they're long-lived
                return;
            }
            // Only attempt JWT refresh for tokens that look like JWTs.
            // OAuth access tokens in this system can be opaque strings; treating them as JWTs
            // creates noisy failures and can cause unwanted state writes.
            if (token.split('.').length !== 3) {
                return;
            }
            const decoded = jwtDecode(token);
            const now = Date.now() / 1000;
            const exp = typeof decoded.exp === 'number' ? decoded.exp : 0;
            // Refresh if token expires within 5 minutes
            if (exp > 0 && (exp - now) < 300) {
                // Import axios dynamically
                await this.discoverServices();
                const authBase = this.config.discoveredServices?.auth_base || 'https://auth.lanonasis.com';
                // Attempt token refresh
                const response = await axios.post(`${authBase}/v1/auth/refresh`, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Project-Scope': 'lanonasis-maas'
                    },
                    timeout: 10000
                });
                if (response.data.token) {
                    await this.setToken(response.data.token);
                }
            }
        }
        catch (err) {
            // If refresh fails, mark credentials as potentially invalid
            await this.incrementFailureCount();
            if (process.env.CLI_VERBOSE === 'true' || process.env.NODE_ENV !== 'production') {
                console.debug('Token refresh failed:', err.message);
            }
        }
    }
    async clearInvalidCredentials() {
        this.config.token = undefined;
        this.config.vendorKey = undefined;
        this.config.user = undefined;
        this.config.authMethod = undefined;
        this.config.tokenExpiry = undefined;
        this.config.lastValidated = undefined;
        this.config.authFailureCount = 0;
        this.config.lastAuthFailure = undefined;
        await this.save();
    }
    async incrementFailureCount() {
        this.config.authFailureCount = (this.config.authFailureCount || 0) + 1;
        this.config.lastAuthFailure = new Date().toISOString();
        await this.save();
    }
    async resetFailureCount() {
        this.config.authFailureCount = 0;
        this.config.lastAuthFailure = undefined;
        await this.save();
    }
    getFailureCount() {
        return this.config.authFailureCount || 0;
    }
    getLastAuthFailure() {
        return this.config.lastAuthFailure;
    }
    shouldDelayAuth() {
        const failureCount = this.getFailureCount();
        return failureCount >= 3;
    }
    getAuthDelayMs() {
        const failureCount = this.getFailureCount();
        if (failureCount < 3)
            return 0;
        // Progressive delays: 3 failures = 2s, 4 = 4s, 5 = 8s, 6+ = 16s max
        const baseDelay = 2000; // 2 seconds
        const maxDelay = 16000; // 16 seconds max
        const delay = Math.min(baseDelay * Math.pow(2, failureCount - 3), maxDelay);
        return delay;
    }
    async getDeviceId() {
        if (!this.config.deviceId) {
            // Generate a new device ID
            this.config.deviceId = randomUUID();
            await this.save();
        }
        return this.config.deviceId;
    }
    // Generic get/set methods for MCP and other dynamic config
    get(key) {
        return this.config[key];
    }
    set(key, value) {
        this.config[key] = value;
    }
    async setAndSave(key, value) {
        this.set(key, value);
        await this.save();
    }
    // MCP-specific helpers
    getMCPServerPath() {
        // Only return an explicitly configured path. No implicit bundled defaults.
        // Returning an empty string if unset helps callers decide how to proceed safely.
        return this.config.mcpServerPath || '';
    }
    getMCPServerUrl() {
        return this.config.discoveredServices?.mcp_ws_base ||
            this.config.mcpServerUrl ||
            'wss://mcp.lanonasis.com/ws';
    }
    getMCPRestUrl() {
        const configured = this.config.mcpServerUrl;
        if (typeof configured === 'string' && configured.trim().length > 0) {
            return configured.trim();
        }
        const discoveredMcpBase = this.config.discoveredServices?.mcp_base;
        if (typeof discoveredMcpBase === 'string' && discoveredMcpBase.trim().length > 0) {
            const normalizedMcpBase = discoveredMcpBase.trim().replace(/\/$/, '');
            const normalizedMemoryBase = (this.config.discoveredServices?.memory_base || '')
                .toString()
                .trim()
                .replace(/\/$/, '');
            // Guard against service-discovery payloads that map MCP REST to the memory API host.
            const pointsToMemoryBase = normalizedMemoryBase.length > 0 &&
                normalizedMcpBase.replace(/\/api\/v1$/, '') === normalizedMemoryBase;
            if (!pointsToMemoryBase) {
                return normalizedMcpBase;
            }
        }
        return 'https://mcp.lanonasis.com/api/v1';
    }
    getMCPSSEUrl() {
        return this.config.discoveredServices?.mcp_sse_base ||
            'https://mcp.lanonasis.com/api/v1/events';
    }
    shouldUseRemoteMCP() {
        const preference = this.config.mcpPreference || 'auto';
        switch (preference) {
            case 'websocket':
            case 'remote':
                return true;
            case 'local':
                return false;
            case 'auto':
            default:
                // Default to remote/websocket (production mode)
                // Local mode should only be used when explicitly configured
                return true;
        }
    }
}
