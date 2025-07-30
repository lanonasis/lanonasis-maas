/**
 * Memory as a Service (MaaS) Client SDK
 * Aligned with sd-ghost-protocol schema
 */
export class MaaSClient {
    config;
    baseHeaders;
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
        const url = `${this.config.apiUrl}/api/v1${endpoint}`;
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
// Factory function for easy initialization
export function createMaaSClient(config) {
    return new MaaSClient(config);
}
// React Hook for MaaS Client (if using React)
export function useMaaSClient(config) {
    // In a real React app, you'd use useMemo here
    return new MaaSClient(config);
}
// Browser/Node.js detection
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;
// Default configurations for different environments
export const defaultConfigs = {
    development: {
        apiUrl: 'http://localhost:3000',
        timeout: 30000
    },
    production: {
        apiUrl: 'https://api.yourdomain.com',
        timeout: 10000
    }
};
//# sourceMappingURL=memory-client-sdk.js.map