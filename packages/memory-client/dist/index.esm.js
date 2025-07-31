import { z } from 'zod';

/**
 * Memory Client class for interacting with the Memory as a Service API
 */
class MemoryClient {
    constructor(config) {
        this.config = {
            timeout: 30000,
            useGateway: true,
            ...config
        };
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': '@lanonasis/memory-client/1.0.0',
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
                return {
                    error: data?.error || `HTTP ${response.status}: ${response.statusText}`
                };
            }
            return { data };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return { error: 'Request timeout' };
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
 * Factory function to create a new Memory Client instance
 */
function createMemoryClient(config) {
    return new MemoryClient(config);
}

/**
 * Memory types supported by the service
 */
const MEMORY_TYPES = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];
/**
 * Memory status values
 */
const MEMORY_STATUSES = ['active', 'archived', 'draft', 'deleted'];
/**
 * Validation schemas using Zod
 */
const createMemorySchema = z.object({
    title: z.string().min(1).max(500),
    content: z.string().min(1).max(50000),
    summary: z.string().max(1000).optional(),
    memory_type: z.enum(MEMORY_TYPES).default('context'),
    topic_id: z.string().uuid().optional(),
    project_ref: z.string().max(100).optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).default([]),
    metadata: z.record(z.unknown()).optional()
});
const updateMemorySchema = z.object({
    title: z.string().min(1).max(500).optional(),
    content: z.string().min(1).max(50000).optional(),
    summary: z.string().max(1000).optional(),
    memory_type: z.enum(MEMORY_TYPES).optional(),
    status: z.enum(MEMORY_STATUSES).optional(),
    topic_id: z.string().uuid().nullable().optional(),
    project_ref: z.string().max(100).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
    metadata: z.record(z.unknown()).optional()
});
const searchMemorySchema = z.object({
    query: z.string().min(1).max(1000),
    memory_types: z.array(z.enum(MEMORY_TYPES)).optional(),
    tags: z.array(z.string()).optional(),
    topic_id: z.string().uuid().optional(),
    project_ref: z.string().optional(),
    status: z.enum(MEMORY_STATUSES).default('active'),
    limit: z.number().int().min(1).max(100).default(20),
    threshold: z.number().min(0).max(1).default(0.7)
});
const createTopicSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(50).optional(),
    parent_topic_id: z.string().uuid().optional()
});

/**
 * @lanonasis/memory-client
 *
 * Memory as a Service (MaaS) Client SDK for Lanonasis
 * Intelligent memory management with semantic search capabilities
 */
// Main client
// Constants
const VERSION = '1.0.0';
const CLIENT_NAME = '@lanonasis/memory-client';
// Environment detection
const isBrowser = typeof window !== 'undefined';
const isNode = typeof globalThis !== 'undefined' && 'process' in globalThis && globalThis.process?.versions?.node;
// Default configurations for different environments
const defaultConfigs = {
    development: {
        apiUrl: 'http://localhost:3001',
        timeout: 30000,
        useGateway: false
    },
    production: {
        apiUrl: 'https://api.lanonasis.com',
        timeout: 15000,
        useGateway: true
    },
    gateway: {
        apiUrl: 'https://api.lanonasis.com',
        timeout: 10000,
        useGateway: true
    }
};
// Utility functions will be added in a future version to avoid circular imports

export { CLIENT_NAME, MEMORY_STATUSES, MEMORY_TYPES, MemoryClient, VERSION, createMemoryClient, createMemorySchema, createTopicSchema, defaultConfigs, isBrowser, isNode, searchMemorySchema, updateMemorySchema };
//# sourceMappingURL=index.esm.js.map
