"use strict";
/**
 * Memory as a Service (MaaS) Client SDK
 * Aligned with sd-ghost-protocol schema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfigs = exports.isNode = exports.isBrowser = exports.MaaSClient = void 0;
exports.createMaaSClient = createMaaSClient;
exports.useMaaSClient = useMaaSClient;
class MaaSClient {
    constructor(config) {
        this.config = {
            timeout: 30000,
            ...config
        };
        this.baseHeaders = {
            'Content-Type': 'application/json',
        };
        if (config.authToken) {
            this.baseHeaders['Authorization'] = `Bearer ${config.authToken}`;
        }
        else if (config.apiKey) {
            this.baseHeaders['X-API-Key'] = config.apiKey;
        }
    }
    async request(endpoint, options = {}) {
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
            const response = await fetch(url, {
                headers: { ...this.baseHeaders, ...options.headers },
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType?.includes('application/json')) {
                data = await response.json();
            }
            else {
                const text = await response.text();
                data = { error: `Unexpected response: ${text.substring(0, 100)}` };
            }
            if (!response.ok) {
                const errorMsg = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
                console.error('[MaaSClient] Error:', errorMsg);
                return { error: errorMsg };
            }
            return { data };
        }
        catch (error) {
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
    async createMemory(memory) {
        return this.request('/memory', {
            method: 'POST',
            body: JSON.stringify(memory)
        });
    }
    async getMemory(id) {
        return this.request(`/memory/${id}`);
    }
    async updateMemory(id, updates) {
        return this.request(`/memory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    async deleteMemory(id) {
        return this.request(`/memory/${id}`, {
            method: 'DELETE'
        });
    }
    async listMemories(options = {}) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    params.append(key, value.join(','));
                }
                else {
                    params.append(key, String(value));
                }
            }
        });
        return this.request(`/memory?${params.toString()}`);
    }
    async searchMemories(request) {
        return this.request('/memory/search', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }
    async bulkDeleteMemories(memoryIds) {
        return this.request('/memory/bulk/delete', {
            method: 'POST',
            body: JSON.stringify({ memory_ids: memoryIds })
        });
    }
    // Topic Operations
    async createTopic(topic) {
        return this.request('/topics', {
            method: 'POST',
            body: JSON.stringify(topic)
        });
    }
    async getTopics() {
        return this.request('/topics');
    }
    async getTopic(id) {
        return this.request(`/topics/${id}`);
    }
    async updateTopic(id, updates) {
        return this.request(`/topics/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    async deleteTopic(id) {
        return this.request(`/topics/${id}`, {
            method: 'DELETE'
        });
    }
    // Statistics
    async getMemoryStats() {
        return this.request('/memory/stats');
    }
    // Health Check
    async getHealth() {
        return this.request('/health');
    }
    // Utility Methods
    setAuthToken(token) {
        this.baseHeaders['Authorization'] = `Bearer ${token}`;
        delete this.baseHeaders['X-API-Key'];
    }
    setApiKey(apiKey) {
        this.baseHeaders['X-API-Key'] = apiKey;
        delete this.baseHeaders['Authorization'];
    }
    clearAuth() {
        delete this.baseHeaders['Authorization'];
        delete this.baseHeaders['X-API-Key'];
    }
}
exports.MaaSClient = MaaSClient;
// Factory function for easy initialization
function createMaaSClient(config) {
    return new MaaSClient(config);
}
// React Hook for MaaS Client (if using React)
function useMaaSClient(config) {
    // In a real React app, you'd use useMemo here
    return new MaaSClient(config);
}
// Browser/Node.js detection
exports.isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;
exports.isNode = typeof process !== 'undefined' && process.versions?.node;
// Default configurations for different environments
exports.defaultConfigs = {
    development: {
        apiUrl: 'http://localhost:3001',
        timeout: 30000
    },
    production: {
        apiUrl: 'https://mcp.lanonasis.com',
        timeout: 10000
    },
    gateway: {
        apiUrl: 'https://mcp.lanonasis.com',
        timeout: 15000
    }
};
//# sourceMappingURL=memory-client-sdk.js.map