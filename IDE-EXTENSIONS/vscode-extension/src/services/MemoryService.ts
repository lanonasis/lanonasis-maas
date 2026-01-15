import * as vscode from 'vscode';
import { MaaSClient, createMaaSClient } from './memory-client-sdk';
import { CreateMemoryRequest, SearchMemoryRequest, MemoryEntry, MemorySearchResult, UserMemoryStats } from '../types/memory-aligned';
import type { IMemoryService } from './IMemoryService';
import { SecureApiKeyService } from './SecureApiKeyService';

export class MemoryService implements IMemoryService {
    private client: MaaSClient | null = null;
    private config: vscode.WorkspaceConfiguration;
    private readonly secureApiKeyService?: SecureApiKeyService;
    private initializePromise: Promise<void> | null = null;
    private authenticated = false;

    constructor(secureApiKeyService?: SecureApiKeyService) {
        this.secureApiKeyService = secureApiKeyService;
        this.config = vscode.workspace.getConfiguration('lanonasis');
        void this.ensureClient();
    }

    private async resolveApiKey(): Promise<string | null> {
        if (this.secureApiKeyService) {
            try {
                const secureKey = await this.secureApiKeyService.getApiKey();
                if (secureKey && secureKey.trim().length > 0) {
                    return secureKey;
                }
            } catch (error) {
                console.warn('[MemoryService] Failed to read secure API key', error);
            }
        }

        const legacyKey = this.config.get<string>('apiKey');
        if (legacyKey && legacyKey.trim().length > 0) {
            return legacyKey;
        }

        return null;
    }

    private async loadClient(): Promise<void> {
        const apiUrl = this.config.get<string>('apiUrl', 'https://mcp.lanonasis.com');
        const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://mcp.lanonasis.com');
        // Default to direct REST API (false) - matches package.json default
        const useGateway = this.config.get<boolean>('useGateway', false);
        const effectiveUrl = useGateway ? gatewayUrl : apiUrl;

        // Try OAuth token first, then API key
        let authToken: string | null = null;
        let apiKey: string | null = null;

        if (this.secureApiKeyService) {
            try {
                // Check for OAuth Bearer token first
                const authHeader = await this.secureApiKeyService.getAuthenticationHeader();
                if (authHeader) {
                    authToken = authHeader.replace('Bearer ', '');
                }
            } catch (error) {
                console.warn('[MemoryService] Failed to get OAuth token', error);
            }

            // Fallback to API key if no OAuth token
            if (!authToken) {
                apiKey = await this.resolveApiKey();
            }
        }

        if (authToken || apiKey) {
            this.client = createMaaSClient({
                apiUrl: effectiveUrl,
                authToken: authToken || undefined,
                apiKey: apiKey || undefined,
                timeout: 30000
            });
            this.authenticated = true;
        } else {
            this.client = null;
            this.authenticated = false;
        }
    }

    private async ensureClient(): Promise<void> {
        if (this.client) {
            return;
        }

        if (!this.initializePromise) {
            this.initializePromise = this.loadClient();
        }

        try {
            await this.initializePromise;
        } finally {
            this.initializePromise = null;
        }
    }

    public isAuthenticated(): boolean {
        if (!this.client && !this.initializePromise) {
            void this.ensureClient();
        }

        return this.authenticated;
    }

    public async testConnection(apiKey?: string): Promise<void> {
        const apiUrl = this.config.get<string>('apiUrl', 'https://mcp.lanonasis.com');
        const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://mcp.lanonasis.com');
        const useGateway = this.config.get<boolean>('useGateway', false);
        const effectiveUrl = useGateway ? gatewayUrl : apiUrl;

        let testClient: MaaSClient | null = null;

        if (apiKey && apiKey.trim().length > 0) {
            testClient = createMaaSClient({
                apiUrl: effectiveUrl,
                apiKey,
                timeout: 10000
            });
        } else {
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

    public async createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry> {
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

    public async updateMemory(id: string, memory: Partial<CreateMemoryRequest>): Promise<MemoryEntry> {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const response = await client.updateMemory(id, memory);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to update memory');
        }

        return response.data;
    }

    public async searchMemories(query: string, options: Partial<SearchMemoryRequest> = {}): Promise<MemorySearchResult[]> {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const searchRequest: SearchMemoryRequest = {
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

    public async getMemory(id: string): Promise<MemoryEntry> {
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

    public async listMemories(limit: number = 50): Promise<MemoryEntry[]> {
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

    public async deleteMemory(id: string): Promise<void> {
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

    public async getMemoryStats(): Promise<UserMemoryStats> {
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

    public async refreshClient(): Promise<void> {
        this.config = vscode.workspace.getConfiguration('lanonasis');
        this.client = null;
        this.authenticated = false;
        await this.ensureClient();
    }
}