import * as vscode from 'vscode';
import { MaaSClient, createMaaSClient } from './memory-client-sdk';
import { CreateMemoryRequest, SearchMemoryRequest, MemoryEntry, MemorySearchResult } from '../types/memory-aligned';

export class MemoryService {
    private client: MaaSClient | null = null;
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('lanonasis');
        this.initializeClient();
    }

    private initializeClient(): void {
        const apiKey = this.config.get<string>('apiKey');
        const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
        const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com');
        const useGateway = this.config.get<boolean>('useGateway', true);

        // Use gateway URL if enabled, otherwise use direct API URL
        const effectiveUrl = useGateway ? gatewayUrl : apiUrl;

        if (apiKey && apiKey.trim().length > 0) {
            this.client = createMaaSClient({
                apiUrl: effectiveUrl,
                apiKey,
                timeout: 30000
            });
        }
    }

    public refreshClient(): void {
        this.config = vscode.workspace.getConfiguration('lanonasis');
        this.initializeClient();
    }

    public isAuthenticated(): boolean {
        return this.client !== null;
    }

    public async testConnection(apiKey?: string): Promise<void> {
        const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
        const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com');
        const useGateway = this.config.get<boolean>('useGateway', true);
        const effectiveUrl = useGateway ? gatewayUrl : apiUrl;

        const testClient = apiKey ? createMaaSClient({
            apiUrl: effectiveUrl,
            apiKey,
            timeout: 10000
        }) : this.client;

        if (!testClient) {
            throw new Error('No API key configured');
        }

        const response = await testClient.getHealth();
        if (response.error) {
            throw new Error(response.error);
        }
    }

    public async createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry> {
        if (!this.client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const response = await this.client.createMemory(memory);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to create memory');
        }

        return response.data;
    }

    public async searchMemories(query: string, options: Partial<SearchMemoryRequest> = {}): Promise<MemorySearchResult[]> {
        if (!this.client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const searchRequest: SearchMemoryRequest = {
            query,
            limit: 20,
            threshold: 0.7,
            status: 'active',
            ...options
        };

        const response = await this.client.searchMemories(searchRequest);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Search failed');
        }

        return response.data.results;
    }

    public async getMemory(id: string): Promise<MemoryEntry> {
        if (!this.client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const response = await this.client.getMemory(id);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Memory not found');
        }

        return response.data;
    }

    public async listMemories(limit: number = 50): Promise<MemoryEntry[]> {
        if (!this.client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const response = await this.client.listMemories({ 
            limit,
            sort: 'updated_at',
            order: 'desc'
        });
        
        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to fetch memories');
        }

        return response.data.data;
    }

    public async deleteMemory(id: string): Promise<void> {
        if (!this.client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const response = await this.client.deleteMemory(id);
        if (response.error) {
            throw new Error(response.error);
        }
    }

    public async getMemoryStats() {
        if (!this.client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const response = await this.client.getMemoryStats();
        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to fetch stats');
        }

        return response.data;
    }
}