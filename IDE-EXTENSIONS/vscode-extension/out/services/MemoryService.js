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
const memory_client_sdk_1 = require("./memory-client-sdk");
class MemoryService {
    constructor(secureApiKeyService) {
        this.client = null;
        this.initializePromise = null;
        this.authenticated = false;
        this.secureApiKeyService = secureApiKeyService;
        this.config = vscode.workspace.getConfiguration('lanonasis');
        void this.ensureClient();
    }
    async resolveApiKey() {
        if (this.secureApiKeyService) {
            try {
                const secureKey = await this.secureApiKeyService.getApiKey();
                if (secureKey && secureKey.trim().length > 0) {
                    return secureKey;
                }
            }
            catch (error) {
                console.warn('[MemoryService] Failed to read secure API key', error);
            }
        }
        const legacyKey = this.config.get('apiKey');
        if (legacyKey && legacyKey.trim().length > 0) {
            return legacyKey;
        }
        return null;
    }
    async loadClient() {
        const apiKey = await this.resolveApiKey();
        const apiUrl = this.config.get('apiUrl', 'https://api.lanonasis.com');
        const gatewayUrl = this.config.get('gatewayUrl', 'https://api.lanonasis.com');
        const useGateway = this.config.get('useGateway', true);
        const effectiveUrl = useGateway ? gatewayUrl : apiUrl;
        if (apiKey) {
            this.client = (0, memory_client_sdk_1.createMaaSClient)({
                apiUrl: effectiveUrl,
                apiKey,
                timeout: 30000
            });
            this.authenticated = true;
        }
        else {
            this.client = null;
            this.authenticated = false;
        }
    }
    async ensureClient() {
        if (this.client) {
            return;
        }
        if (!this.initializePromise) {
            this.initializePromise = this.loadClient();
        }
        try {
            await this.initializePromise;
        }
        finally {
            this.initializePromise = null;
        }
    }
    isAuthenticated() {
        if (!this.client && !this.initializePromise) {
            void this.ensureClient();
        }
        return this.authenticated;
    }
    async testConnection(apiKey) {
        const apiUrl = this.config.get('apiUrl', 'https://api.lanonasis.com');
        const gatewayUrl = this.config.get('gatewayUrl', 'https://api.lanonasis.com');
        const useGateway = this.config.get('useGateway', true);
        const effectiveUrl = useGateway ? gatewayUrl : apiUrl;
        let testClient = null;
        if (apiKey && apiKey.trim().length > 0) {
            testClient = (0, memory_client_sdk_1.createMaaSClient)({
                apiUrl: effectiveUrl,
                apiKey,
                timeout: 10000
            });
        }
        else {
            await this.ensureClient();
            testClient = this.client;
        }
        if (!testClient) {
            throw new Error('No API key configured');
        }
        const response = await testClient.getHealth();
        if (response.error) {
            throw new Error(response.error);
        }
    }
    async createMemory(memory) {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }
        const response = await client.createMemory(memory);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to create memory');
        }
        return response.data;
    }
    async searchMemories(query, options = {}) {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }
        const searchRequest = {
            query,
            limit: 20,
            threshold: 0.7,
            status: 'active',
            ...options
        };
        const response = await client.searchMemories(searchRequest);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Search failed');
        }
        return response.data.results;
    }
    async getMemory(id) {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }
        const response = await client.getMemory(id);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Memory not found');
        }
        return response.data;
    }
    async listMemories(limit = 50) {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }
        // Type validation for limit parameter
        if (typeof limit !== 'number' || limit < 0) {
            throw new Error('limit must be a non-negative number');
        }
        // Ensure limit is within reasonable bounds
        const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1000);
        const response = await client.listMemories({
            limit: validatedLimit,
            sort: 'updated_at',
            order: 'desc'
        });
        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to fetch memories');
        }
        return response.data.data;
    }
    async deleteMemory(id) {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }
        const response = await client.deleteMemory(id);
        if (response.error) {
            throw new Error(response.error);
        }
    }
    async getMemoryStats() {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }
        const response = await client.getMemoryStats();
        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to fetch stats');
        }
        return response.data;
    }
    async refreshClient() {
        this.config = vscode.workspace.getConfiguration('lanonasis');
        this.client = null;
        this.authenticated = false;
        await this.ensureClient();
    }
}
exports.MemoryService = MemoryService;
//# sourceMappingURL=MemoryService.js.map