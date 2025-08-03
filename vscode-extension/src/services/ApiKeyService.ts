import * as vscode from 'vscode';

export interface ApiKey {
    id: string;
    name: string;
    keyType: string;
    environment: string;
    accessLevel: string;
    projectId: string;
    createdAt: string;
    expiresAt?: string;
    tags: string[];
    metadata: Record<string, any>;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    organizationId: string;
    createdAt: string;
    teamMembers: string[];
    settings: Record<string, any>;
}

export interface CreateApiKeyRequest {
    name: string;
    value: string;
    keyType: 'api_key' | 'database_url' | 'oauth_token' | 'certificate' | 'ssh_key' | 'webhook_secret' | 'encryption_key';
    environment: 'development' | 'staging' | 'production';
    accessLevel: 'public' | 'authenticated' | 'team' | 'admin' | 'enterprise';
    projectId: string;
    tags?: string[];
    expiresAt?: string;
    rotationFrequency?: number;
    metadata?: Record<string, any>;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
    organizationId: string;
    teamMembers?: string[];
    settings?: Record<string, any>;
}

export class ApiKeyService {
    private config: vscode.WorkspaceConfiguration;
    private baseUrl: string;

    constructor() {
        this.config = vscode.workspace.getConfiguration('lanonasis');
        this.updateConfig();
    }

    private updateConfig(): void {
        const useGateway = this.config.get<boolean>('useGateway', true);
        const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
        const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com');
        
        this.baseUrl = useGateway ? gatewayUrl : apiUrl;
    }

    refreshConfig(): void {
        this.config = vscode.workspace.getConfiguration('lanonasis');
        this.updateConfig();
    }

    private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const apiKey = this.config.get<string>('apiKey');
        if (!apiKey) {
            throw new Error('API key not configured. Please set your API key in settings.');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    // ============================================================================
    // PROJECT MANAGEMENT
    // ============================================================================

    async getProjects(): Promise<Project[]> {
        return this.makeRequest<Project[]>('/api/v1/projects');
    }

    async getProject(projectId: string): Promise<Project> {
        return this.makeRequest<Project>(`/api/v1/projects/${projectId}`);
    }

    async createProject(request: CreateProjectRequest): Promise<Project> {
        return this.makeRequest<Project>('/api/v1/projects', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async updateProject(projectId: string, updates: Partial<CreateProjectRequest>): Promise<Project> {
        return this.makeRequest<Project>(`/api/v1/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteProject(projectId: string): Promise<void> {
        await this.makeRequest<void>(`/api/v1/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    // ============================================================================
    // API KEY MANAGEMENT
    // ============================================================================

    async getApiKeys(projectId?: string): Promise<ApiKey[]> {
        const endpoint = projectId ? `/api/v1/projects/${projectId}/api-keys` : '/api/v1/api-keys';
        return this.makeRequest<ApiKey[]>(endpoint);
    }

    async getApiKey(keyId: string): Promise<ApiKey> {
        return this.makeRequest<ApiKey>(`/api/v1/api-keys/${keyId}`);
    }

    async createApiKey(request: CreateApiKeyRequest): Promise<ApiKey> {
        return this.makeRequest<ApiKey>('/api/v1/api-keys', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async updateApiKey(keyId: string, updates: Partial<CreateApiKeyRequest>): Promise<ApiKey> {
        return this.makeRequest<ApiKey>(`/api/v1/api-keys/${keyId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteApiKey(keyId: string): Promise<void> {
        await this.makeRequest<void>(`/api/v1/api-keys/${keyId}`, {
            method: 'DELETE'
        });
    }

    async rotateApiKey(keyId: string): Promise<ApiKey> {
        return this.makeRequest<ApiKey>(`/api/v1/api-keys/${keyId}/rotate`, {
            method: 'POST'
        });
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    async testConnection(): Promise<boolean> {
        try {
            await this.makeRequest<any>('/api/v1/health');
            return true;
        } catch (error) {
            return false;
        }
    }

    async getUserInfo(): Promise<any> {
        return this.makeRequest<any>('/api/v1/auth/me');
    }
}
