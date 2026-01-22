import * as vscode from 'vscode';
import { CoreMemoryClient, createMemoryClient, CreateMemoryRequest, SearchMemoryRequest, MemoryEntry, MemorySearchResult, UserMemoryStats } from '@lanonasis/memory-client';
import type { IMemoryService } from './IMemoryService';
import { SecureApiKeyService } from '@lanonasis/ide-extension-core';

export class MemoryService implements IMemoryService {
    private client: CoreMemoryClient | null = null;
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
        const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
        const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com');
        // Default to direct REST API (false) - matches package.json default
        const useGateway = this.config.get<boolean>('useGateway', false);
        const effectiveUrl = useGateway ? gatewayUrl : apiUrl;

        // Try OAuth token first, then API key
        let authToken: string | null = null;
        let apiKey: string | null = null;

        if (this.secureApiKeyService) {
            try {
                const credential = await this.secureApiKeyService.getStoredCredentials();
                console.log('[MemoryService] getStoredCredentials result:', {
                    hasCredential: !!credential,
                    type: credential?.type,
                    tokenLength: credential?.token?.length,
                    tokenPrefix: credential?.token?.substring(0, 12)
                });
                if (credential?.type === 'oauth') {
                    authToken = credential.token;
                    console.log('[MemoryService] Using OAuth token');
                } else if (credential?.type === 'apiKey') {
                    apiKey = credential.token;
                    console.log('[MemoryService] Using API key');
                } else if (credential) {
                    console.warn('[MemoryService] Unknown credential type:', credential.type);
                }
            } catch (error) {
                console.warn('[MemoryService] Failed to read stored credentials', error);
            }
        } else {
            console.warn('[MemoryService] No secureApiKeyService available');
        }

        if (!authToken && !apiKey) {
            apiKey = await this.resolveApiKey();
        }

        if (authToken || apiKey) {
            console.log('[MemoryService] Creating client with:', {
                hasAuthToken: !!authToken,
                hasApiKey: !!apiKey,
                apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : null,
                apiUrl: effectiveUrl
            });
            this.client = createMemoryClient({
                apiUrl: effectiveUrl,
                authToken: authToken || undefined,
                apiKey: apiKey || undefined,
                timeout: 30000
            });
            this.authenticated = true;
        } else {
            console.log('[MemoryService] No credentials found - client not created');
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
        const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
        const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com');
        const useGateway = this.config.get<boolean>('useGateway', false);
        const effectiveUrl = useGateway ? gatewayUrl : apiUrl;

        let testClient: CoreMemoryClient | null = null;

        if (apiKey && apiKey.trim().length > 0) {
            testClient = createMemoryClient({
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

        const response = await testClient.healthCheck();
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
            const message = response.error || 'Failed to fetch memories';
            if (this.isAuthError(message)) {
                await this.refreshClient();
                if (!this.client) {
                    throw new Error(message);
                }
                const retry = await this.client.listMemories({
                    limit: validatedLimit,
                    sort: 'updated_at',
                    order: 'desc'
                });
                if (retry.error || !retry.data) {
                    throw new Error(retry.error || message);
                }
                return retry.data.data;
            }
            throw new Error(message);
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

    private isAuthError(message: string): boolean {
        const normalized = message.toLowerCase();
        return normalized.includes('authentication required')
            || normalized.includes('unauthorized')
            || normalized.includes('401')
            || normalized.includes('auth token')
            || normalized.includes('bearer');
    }
}
