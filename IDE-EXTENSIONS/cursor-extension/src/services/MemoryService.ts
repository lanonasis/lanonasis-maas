import * as vscode from 'vscode';
import { AuthenticationService } from '../auth/AuthenticationService';
import { 
    MemoryEntry, 
    CreateMemoryRequest, 
    UpdateMemoryRequest, 
    SearchMemoryRequest,
    MemorySearchResult,
    MemoryStats 
} from '../types/memory';

export class MemoryService {
    private authService: AuthenticationService;
    private baseUrl: string = '';

    constructor(authService: AuthenticationService) {
        this.authService = authService;
        this.updateConfiguration();
    }

    updateConfiguration(): void {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const apiUrl = config.get<string>('apiUrl', 'https://mcp.lanonasis.com');
        const useGateway = config.get<boolean>('useGateway', true);
        
        this.baseUrl = useGateway ? 
            config.get<string>('gatewayUrl', apiUrl) : 
            apiUrl;
    }

    async createMemory(request: CreateMemoryRequest): Promise<MemoryEntry> {
        const response = await this.makeAuthenticatedRequest('/api/v1/memories', {
            method: 'POST',
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create memory: ${response.status} ${error}`);
        }

        return await response.json() as MemoryEntry;
    }

    async getMemory(id: string): Promise<MemoryEntry> {
        const response = await this.makeAuthenticatedRequest(`/api/v1/memories/${id}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Memory not found');
            }
            const error = await response.text();
            throw new Error(`Failed to get memory: ${response.status} ${error}`);
        }

        return await response.json() as MemoryEntry;
    }

    async updateMemory(id: string, request: UpdateMemoryRequest): Promise<MemoryEntry> {
        const response = await this.makeAuthenticatedRequest(`/api/v1/memories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to update memory: ${response.status} ${error}`);
        }

        return await response.json() as MemoryEntry;
    }

    async deleteMemory(id: string): Promise<void> {
        const response = await this.makeAuthenticatedRequest(`/api/v1/memories/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to delete memory: ${response.status} ${error}`);
        }
    }

    async listMemories(options: {
        page?: number;
        limit?: number;
        memory_type?: string;
        tags?: string[];
        sort?: string;
        order?: string;
    } = {}): Promise<{
        memories: MemoryEntry[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        const params = new URLSearchParams();
        
        if (options.page) params.set('page', options.page.toString());
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.memory_type) params.set('memory_type', options.memory_type);
        if (options.tags?.length) params.set('tags', options.tags.join(','));
        if (options.sort) params.set('sort', options.sort);
        if (options.order) params.set('order', options.order);

        const url = `/api/v1/memories${params.toString() ? '?' + params.toString() : ''}`;
        const response = await this.makeAuthenticatedRequest(url);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to list memories: ${response.status} ${error}`);
        }

        return await response.json() as {
            memories: MemoryEntry[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                pages: number;
            };
        };
    }

    async searchMemories(request: SearchMemoryRequest): Promise<MemorySearchResult[]> {
        const response = await this.makeAuthenticatedRequest('/api/v1/memories/search', {
            method: 'POST',
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to search memories: ${response.status} ${error}`);
        }

        const data = await response.json() as { results: MemorySearchResult[] };
        return data.results || [];
    }

    async getMemoryStats(): Promise<MemoryStats> {
        const response = await this.makeAuthenticatedRequest('/api/v1/memories/admin/stats');

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get memory stats: ${response.status} ${error}`);
        }

        return await response.json() as MemoryStats;
    }

    async testConnection(apiKey?: string): Promise<boolean> {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            } else {
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
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    private async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<globalThis.Response> {
        const authHeader = await this.authService.getAuthenticationHeader();
        if (!authHeader) {
            throw new Error('Not authenticated. Please login first.');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'User-Agent': 'Cursor LanOnasis-Memory/1.4.5',
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
