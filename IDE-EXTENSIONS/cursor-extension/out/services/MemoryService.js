"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const vscode = __importStar(require("vscode"));
class MemoryService {
    constructor(authService) {
        this.baseUrl = '';
        this.authService = authService;
        this.updateConfiguration();
    }
    updateConfiguration() {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const apiUrl = config.get('apiUrl', 'https://api.lanonasis.com');
        const useGateway = config.get('useGateway', true);
        this.baseUrl = useGateway ?
            config.get('gatewayUrl', apiUrl) :
            apiUrl;
    }
    refreshClient() {
        this.updateConfiguration();
    }
    isAuthenticated() {
        return this.authService.isAuthenticated();
    }
    async createMemory(request) {
        const response = await this.makeAuthenticatedRequest('/api/v1/memory', {
            method: 'POST',
            body: JSON.stringify(request)
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create memory: ${response.status} ${error}`);
        }
        return await response.json();
    }
    async getMemory(id) {
        const response = await this.makeAuthenticatedRequest(`/api/v1/memory/${id}`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Memory not found');
            }
            const error = await response.text();
            throw new Error(`Failed to get memory: ${response.status} ${error}`);
        }
        return await response.json();
    }
    async updateMemory(id, request) {
        const response = await this.makeAuthenticatedRequest(`/api/v1/memory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(request)
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to update memory: ${response.status} ${error}`);
        }
        return await response.json();
    }
    async deleteMemory(id) {
        const response = await this.makeAuthenticatedRequest(`/api/v1/memory/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to delete memory: ${response.status} ${error}`);
        }
    }
    async listMemories(limitOrOptions = 50) {
        let options = {};
        if (typeof limitOrOptions === 'number') {
            options.limit = limitOrOptions;
        }
        else if (limitOrOptions && typeof limitOrOptions === 'object') {
            options = Object.assign({}, limitOrOptions);
        }
        else if (typeof limitOrOptions !== 'undefined') {
            throw new Error('listMemories expects a number or an options object');
        }
        const limitValue = typeof options.limit === 'number' ? options.limit : 50;
        if (typeof limitValue !== 'number' || Number.isNaN(limitValue) || limitValue < 0) {
            throw new Error('limit must be a non-negative number');
        }
        const params = new URLSearchParams();
        const normalizedLimit = Math.floor(limitValue);
        params.set('limit', normalizedLimit.toString());
        const sortValue = typeof options.sort === 'string' && options.sort.length ? options.sort : 'updated_at';
        const orderValue = typeof options.order === 'string' && options.order.length ? options.order : 'desc';
        params.set('sort', sortValue);
        params.set('order', orderValue);
        if (typeof options.page === 'number' && options.page >= 0) {
            params.set('page', Math.floor(options.page).toString());
        }
        if (typeof options.memory_type === 'string' && options.memory_type.trim().length) {
            params.set('memory_type', options.memory_type);
        }
        if (Array.isArray(options.tags) && options.tags.length) {
            params.set('tags', options.tags.join(','));
        }
        const response = await this.makeAuthenticatedRequest(`/api/v1/memory?${params.toString()}`);
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to list memories: ${response.status} ${error}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            return data;
        }
        if ('memories' in data && Array.isArray(data.memories)) {
            return data.memories;
        }
        if ('data' in data && data.data && Array.isArray(data.data.data)) {
            return data.data.data;
        }
        return [];
    }
    async searchMemories(queryOrRequest, options = {}) {
        let request;
        if (queryOrRequest && typeof queryOrRequest === 'object' && !Array.isArray(queryOrRequest)) {
            request = Object.assign({}, queryOrRequest);
        }
        else {
            request = {
                query: queryOrRequest,
                limit: options.limit ?? 20,
                threshold: options.threshold ?? 0.7,
                memory_types: options.memory_types,
                tags: options.tags,
                topic_id: options.topic_id
            };
        }
        if (!request || typeof request.query !== 'string' || !request.query.trim().length) {
            throw new Error('searchMemories requires a non-empty query string');
        }
        if (typeof request.limit === 'undefined') {
            request.limit = 20;
        }
        else {
            const parsedLimit = Number(request.limit);
            if (Number.isNaN(parsedLimit) || parsedLimit < 0) {
                throw new Error('searchMemories limit must be a non-negative number when provided');
            }
            request.limit = parsedLimit;
        }
        if (typeof request.threshold === 'undefined') {
            request.threshold = 0.7;
        }
        else {
            const parsedThreshold = Number(request.threshold);
            if (Number.isNaN(parsedThreshold)) {
                throw new Error('searchMemories threshold must be a valid number when provided');
            }
            request.threshold = parsedThreshold;
        }
        const sanitizedRequest = {};
        for (const [key, value] of Object.entries(request)) {
            if (value !== undefined) {
                sanitizedRequest[key] = value;
            }
        }
        const response = await this.makeAuthenticatedRequest('/api/v1/memory/search', {
            method: 'POST',
            body: JSON.stringify(sanitizedRequest)
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to search memories: ${response.status} ${error}`);
        }
        const data = await response.json();
        return data.results || [];
    }
    async getMemoryStats() {
        const response = await this.makeAuthenticatedRequest('/api/v1/memory/admin/stats');
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get memory stats: ${response.status} ${error}`);
        }
        return await response.json();
    }
    async testConnection(apiKey) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            else {
                const authHeader = await this.authService.getAuthenticationHeader();
                if (authHeader) {
                    headers['Authorization'] = authHeader;
                }
            }
            const response = await fetch(`${this.baseUrl}/api/v1/health`, {
                method: 'GET',
                headers
            });
            return response.ok;
        }
        catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
    async makeAuthenticatedRequest(endpoint, options = {}) {
        const authHeader = await this.authService.getAuthenticationHeader();
        if (!authHeader) {
            throw new Error('Not authenticated. Please login first.');
        }
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'User-Agent': 'Lanonasis-Cursor-Extension/1.0.0',
            ...options.headers
        };
        const response = await fetch(url, {
            ...options,
            headers
        });
        // Handle authentication errors
        if (response.status === 401) {
            // Token might be expired, try to refresh
            if (await this.authService.checkAuthenticationStatus()) {
                // Retry with new token
                const newAuthHeader = await this.authService.getAuthenticationHeader();
                if (newAuthHeader) {
                    headers['Authorization'] = newAuthHeader;
                    return await fetch(url, { ...options, headers });
                }
            }
            throw new Error('Authentication required. Please login again.');
        }
        return response;
    }
}
exports.MemoryService = MemoryService;
//# sourceMappingURL=MemoryService.js.map
