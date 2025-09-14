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
        // Check if we're using the gateway URL (contains '/api' already)
        const baseUrl = this.config.apiUrl.includes('/api')
            ? this.config.apiUrl.replace('/api', '')
            : this.config.apiUrl;
        const url = `${baseUrl}/api/v1${endpoint}`;
        try {
            const response = await fetch(url, {
                headers: { ...this.baseHeaders, ...options.headers },
                ...options,
                signal: AbortSignal.timeout(this.config.timeout || 30000)
            });
            const data = await response.json();
            if (!response.ok) {
                return { error: data.error || `HTTP ${response.status}` };
            }
            return { data };
        }
        catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error'
            };
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
        apiUrl: 'https://api.LanOnasis.com',
        timeout: 10000
    },
    gateway: {
        apiUrl: 'https://api.LanOnasis.com',
        timeout: 15000
    }
};
//# sourceMappingURL=memory-client-sdk.js.map