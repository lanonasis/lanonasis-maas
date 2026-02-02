import axios from 'axios';
import chalk from 'chalk';
import { randomUUID } from 'crypto';
import { CLIConfig } from './config.js';
export class APIClient {
    client;
    config;
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
            // Use appropriate base URL based on endpoint and auth method
            const isAuthEndpoint = config.url?.includes('/auth/') || config.url?.includes('/login') || config.url?.includes('/register') || config.url?.includes('/oauth/');
            const discoveredServices = this.config.get('discoveredServices');
            const authMethod = this.config.get('authMethod');
            const vendorKey = await this.config.getVendorKeyAsync();
            // Determine the correct API base URL:
            // - Auth endpoints -> auth.lanonasis.com
            // - JWT auth (no vendor key) -> mcp.lanonasis.com (supports JWT tokens)
            // - Vendor key auth -> api.lanonasis.com (requires vendor key)
            let apiBaseUrl;
            const useMcpServer = !vendorKey && (authMethod === 'jwt' || authMethod === 'oauth' || authMethod === 'oauth2');
            if (isAuthEndpoint) {
                apiBaseUrl = discoveredServices?.auth_base || 'https://auth.lanonasis.com';
            }
            else if (vendorKey) {
                // Vendor key works with api.lanonasis.com
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
            const token = this.config.getToken();
            if (vendorKey) {
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
                console.log(chalk.dim(`→ ${config.method?.toUpperCase()} ${config.url} [${requestId}]`));
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
        return response.data;
    }
    async getMemories(params = {}) {
        const response = await this.client.get('/api/v1/memories', { params });
        return response.data;
    }
    async getMemory(id) {
        const response = await this.client.get(`/api/v1/memories/${id}`);
        return response.data;
    }
    async updateMemory(id, data) {
        const response = await this.client.put(`/api/v1/memories/${id}`, data);
        return response.data;
    }
    async deleteMemory(id) {
        await this.client.delete(`/api/v1/memories/${id}`);
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
