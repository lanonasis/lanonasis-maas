/**
 * Core Memory Client - Pure Browser-Safe Implementation
 *
 * NO Node.js dependencies, NO CLI code, NO child_process
 * Works in: Browser, React Native, Cloudflare Workers, Edge Functions, Deno, Bun
 *
 * Bundle size: ~15KB gzipped
 */
/**
 * Core Memory Client class for interacting with the Memory as a Service API
 *
 * This is a pure browser-safe client with zero Node.js dependencies.
 * It uses only standard web APIs (fetch, AbortController, etc.)
 */
export class CoreMemoryClient {
    constructor(config) {
        this.config = {
            timeout: 30000,
            ...config
        };
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': '@lanonasis/memory-client/2.0.0',
            ...config.headers
        };
        // Set authentication headers
        if (config.authToken) {
            this.baseHeaders['Authorization'] = `Bearer ${config.authToken}`;
        }
        else if (config.apiKey) {
            this.baseHeaders['X-API-Key'] = config.apiKey;
        }
    }
    /**
     * Make an HTTP request to the API
     */
    async request(endpoint, options = {}) {
        const startTime = Date.now();
        // Call onRequest hook if provided
        if (this.config.onRequest) {
            try {
                this.config.onRequest(endpoint);
            }
            catch (error) {
                console.warn('onRequest hook error:', error);
            }
        }
        // Handle gateway vs direct API URL formatting
        const baseUrl = this.config.apiUrl.includes('/api')
            ? this.config.apiUrl.replace('/api', '')
            : this.config.apiUrl;
        const url = `${baseUrl}/api/v1${endpoint}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(url, {
                headers: { ...this.baseHeaders, ...options.headers },
                signal: controller.signal,
                ...options,
            });
            clearTimeout(timeoutId);
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            }
            else {
                data = await response.text();
            }
            if (!response.ok) {
                const error = {
                    message: data?.error || `HTTP ${response.status}: ${response.statusText}`,
                    statusCode: response.status,
                    code: 'API_ERROR'
                };
                // Call onError hook if provided
                if (this.config.onError) {
                    try {
                        this.config.onError(error);
                    }
                    catch (hookError) {
                        console.warn('onError hook error:', hookError);
                    }
                }
                return { error: error.message };
            }
            // Call onResponse hook if provided
            if (this.config.onResponse) {
                try {
                    const duration = Date.now() - startTime;
                    this.config.onResponse(endpoint, duration);
                }
                catch (error) {
                    console.warn('onResponse hook error:', error);
                }
            }
            return { data };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                const timeoutError = {
                    message: 'Request timeout',
                    code: 'TIMEOUT_ERROR',
                    statusCode: 408
                };
                if (this.config.onError) {
                    try {
                        this.config.onError(timeoutError);
                    }
                    catch (hookError) {
                        console.warn('onError hook error:', hookError);
                    }
                }
                return { error: 'Request timeout' };
            }
            const networkError = {
                message: error instanceof Error ? error.message : 'Network error',
                code: 'NETWORK_ERROR'
            };
            if (this.config.onError) {
                try {
                    this.config.onError(networkError);
                }
                catch (hookError) {
                    console.warn('onError hook error:', hookError);
                }
            }
            return {
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }
    /**
     * Test the API connection and authentication
     */
    async healthCheck() {
        return this.request('/health');
    }
    // Memory Operations
    /**
     * Create a new memory
     */
    async createMemory(memory) {
        return this.request('/memory', {
            method: 'POST',
            body: JSON.stringify(memory)
        });
    }
    /**
     * Get a memory by ID
     */
    async getMemory(id) {
        return this.request(`/memory/${encodeURIComponent(id)}`);
    }
    /**
     * Update an existing memory
     */
    async updateMemory(id, updates) {
        return this.request(`/memory/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    /**
     * Delete a memory
     */
    async deleteMemory(id) {
        return this.request(`/memory/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }
    /**
     * List memories with optional filtering and pagination
     */
    async listMemories(options = {}) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    params.append(key, value.join(','));
                }
                else {
                    params.append(key, String(value));
                }
            }
        });
        const queryString = params.toString();
        const endpoint = queryString ? `/memory?${queryString}` : '/memory';
        return this.request(endpoint);
    }
    /**
     * Search memories using semantic search
     */
    async searchMemories(request) {
        return this.request('/memory/search', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }
    /**
     * Bulk delete multiple memories
     */
    async bulkDeleteMemories(memoryIds) {
        return this.request('/memory/bulk/delete', {
            method: 'POST',
            body: JSON.stringify({ memory_ids: memoryIds })
        });
    }
    // Topic Operations
    /**
     * Create a new topic
     */
    async createTopic(topic) {
        return this.request('/topics', {
            method: 'POST',
            body: JSON.stringify(topic)
        });
    }
    /**
     * Get all topics
     */
    async getTopics() {
        return this.request('/topics');
    }
    /**
     * Get a topic by ID
     */
    async getTopic(id) {
        return this.request(`/topics/${encodeURIComponent(id)}`);
    }
    /**
     * Update a topic
     */
    async updateTopic(id, updates) {
        return this.request(`/topics/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    /**
     * Delete a topic
     */
    async deleteTopic(id) {
        return this.request(`/topics/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }
    /**
     * Get user memory statistics
     */
    async getMemoryStats() {
        return this.request('/memory/stats');
    }
    // Utility Methods
    /**
     * Update authentication token
     */
    setAuthToken(token) {
        this.baseHeaders['Authorization'] = `Bearer ${token}`;
        delete this.baseHeaders['X-API-Key'];
    }
    /**
     * Update API key
     */
    setApiKey(apiKey) {
        this.baseHeaders['X-API-Key'] = apiKey;
        delete this.baseHeaders['Authorization'];
    }
    /**
     * Clear authentication
     */
    clearAuth() {
        delete this.baseHeaders['Authorization'];
        delete this.baseHeaders['X-API-Key'];
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        if (updates.headers) {
            this.baseHeaders = { ...this.baseHeaders, ...updates.headers };
        }
    }
    /**
     * Get current configuration (excluding sensitive data)
     */
    getConfig() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { apiKey, authToken, ...safeConfig } = this.config;
        return safeConfig;
    }
}
/**
 * Factory function to create a new Core Memory Client instance
 */
export function createMemoryClient(config) {
    return new CoreMemoryClient(config);
}
//# sourceMappingURL=client.js.map