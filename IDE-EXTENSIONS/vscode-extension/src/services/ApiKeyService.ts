import * as vscode from 'vscode';
import { SecureApiKeyService, StoredCredential } from '@lanonasis/ide-extension-core';

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
    metadata: Record<string, unknown>;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    organizationId: string;
    createdAt: string;
    teamMembers: string[];
    settings: Record<string, unknown>;
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
    metadata?: Record<string, unknown>;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
    organizationId: string;
    teamMembers?: string[];
    settings?: Record<string, unknown>;
}

export class ApiKeyService {
    private config: vscode.WorkspaceConfiguration;
    private baseUrl: string = 'https://api.lanonasis.com';
    private secureApiKeyService: SecureApiKeyService;

    constructor(secureApiKeyService: SecureApiKeyService) {
        this.secureApiKeyService = secureApiKeyService;
        this.config = vscode.workspace.getConfiguration('lanonasis');
        this.updateConfig();
    }

    private updateConfig(): void {
        const useGateway = this.config.get<boolean>('useGateway', true);
        const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
        const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com');

        this.baseUrl = this.sanitizeBaseUrl(useGateway ? gatewayUrl : apiUrl);
    }

    refreshConfig(): void {
        this.config = vscode.workspace.getConfiguration('lanonasis');
        this.updateConfig();
    }

    private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const credentials = await this.resolveCredentials();
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseUrl}${normalizedEndpoint}`;
        const authHeaders: Record<string, string> = credentials.type === 'oauth'
            ? { 'Authorization': `Bearer ${credentials.token}` }
            : { 'X-API-Key': credentials.token };

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    private sanitizeBaseUrl(url: string): string {
        if (!url) {
            return 'https://api.lanonasis.com';
        }

        let clean = url.trim();
        // remove trailing slashes
        clean = clean.replace(/\/+$/, '');

        // remove duplicate /api or /api/v1 suffixes
        clean = clean.replace(/\/api\/v1$/i, '').replace(/\/api$/i, '');

        return clean || 'https://api.lanonasis.com';
    }

    private async resolveCredentials(): Promise<StoredCredential> {
        let credentials = await this.secureApiKeyService.getStoredCredentials();

        if (!credentials) {
            const value = await this.secureApiKeyService.getApiKeyOrPrompt();
            if (!value) {
                throw new Error('API key not configured. Please configure your API key to use Lanonasis services.');
            }

            credentials = await this.secureApiKeyService.getStoredCredentials();

            if (!credentials) {
                credentials = {
                    type: this.looksLikeJwt(value) ? 'oauth' : 'apiKey',
                    token: value
                };
            }
        }

        return credentials;
    }

    private looksLikeJwt(token: string): boolean {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }
        const jwtSegment = /^[A-Za-z0-9-_]+$/;
        return parts.every(segment => jwtSegment.test(segment));
    }

    private isFallbackableError(error: unknown): boolean {
        const message = error instanceof Error ? error.message : String(error);
        return message.includes('404') || message.includes('405') || message.includes('Not Found') || message.includes('Method Not Allowed');
    }

    private isPostRequiredError(error: unknown): boolean {
        const message = error instanceof Error ? error.message : String(error);
        return message.includes('Use POST') || message.includes('Method not allowed') || message.includes('Method Not Allowed');
    }

    private normalizeApiKeysResponse(response: ApiKey[] | { success: boolean; data: ApiKey[] }): ApiKey[] {
        if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
            return response.data;
        }

        if (Array.isArray(response)) {
            return response;
        }

        return [];
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
        const primaryEndpoint = projectId
            ? `/api/v1/api-keys?projectId=${encodeURIComponent(projectId)}`
            : '/api/v1/api-keys';
        const legacyEndpoint = projectId
            ? `/api/v1/projects/${projectId}/api-keys`
            : '/api/v1/auth/api-keys';

        try {
            const response = await this.makeRequest<ApiKey[] | { success: boolean; data: ApiKey[] }>(primaryEndpoint);
            return this.normalizeApiKeysResponse(response);
        } catch (error) {
            if (!this.isFallbackableError(error)) {
                throw error;
            }

            try {
                const response = await this.makeRequest<ApiKey[] | { success: boolean; data: ApiKey[] }>(legacyEndpoint);
                return this.normalizeApiKeysResponse(response);
            } catch (legacyError) {
                if (!this.isPostRequiredError(legacyError) || !legacyEndpoint.includes('/auth/api-keys')) {
                    throw legacyError;
                }

                const response = await this.makeRequest<ApiKey[] | { success: boolean; data: ApiKey[] }>(legacyEndpoint, {
                    method: 'POST',
                    body: JSON.stringify(projectId ? { projectId } : {})
                });
                return this.normalizeApiKeysResponse(response);
            }
        }
    }

    async getApiKey(keyId: string): Promise<ApiKey> {
        try {
            return await this.makeRequest<ApiKey>(`/api/v1/api-keys/${keyId}`);
        } catch (error) {
            if (!this.isFallbackableError(error)) {
                throw error;
            }
            return this.makeRequest<ApiKey>(`/api/v1/auth/api-keys/${keyId}`);
        }
    }

    async createApiKey(request: CreateApiKeyRequest): Promise<ApiKey> {
        try {
            return await this.makeRequest<ApiKey>('/api/v1/api-keys', {
                method: 'POST',
                body: JSON.stringify(request)
            });
        } catch (error) {
            if (!this.isFallbackableError(error)) {
                throw error;
            }
            return this.makeRequest<ApiKey>('/api/v1/auth/api-keys', {
                method: 'POST',
                body: JSON.stringify(request)
            });
        }
    }

    async updateApiKey(keyId: string, updates: Partial<CreateApiKeyRequest>): Promise<ApiKey> {
        try {
            return await this.makeRequest<ApiKey>(`/api/v1/api-keys/${keyId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
        } catch (error) {
            if (!this.isFallbackableError(error)) {
                throw error;
            }
            return this.makeRequest<ApiKey>(`/api/v1/auth/api-keys/${keyId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
        }
    }

    async deleteApiKey(keyId: string): Promise<void> {
        try {
            await this.makeRequest<void>(`/api/v1/api-keys/${keyId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            if (!this.isFallbackableError(error)) {
                throw error;
            }
            await this.makeRequest<void>(`/api/v1/auth/api-keys/${keyId}`, {
                method: 'DELETE'
            });
        }
    }

    async rotateApiKey(keyId: string): Promise<ApiKey> {
        try {
            return await this.makeRequest<ApiKey>(`/api/v1/api-keys/${keyId}/rotate`, {
                method: 'POST'
            });
        } catch (error) {
            if (!this.isFallbackableError(error)) {
                throw error;
            }
            return this.makeRequest<ApiKey>(`/api/v1/auth/api-keys/${keyId}/rotate`, {
                method: 'POST'
            });
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    async testConnection(): Promise<boolean> {
        try {
            const credentials = await this.resolveCredentials();

            // For OAuth tokens, use proper token introspection endpoint
            if (credentials.type === 'oauth') {
                // POST to /oauth/introspect with the token for proper validation
                const response = await fetch(`${this.baseUrl}/oauth/introspect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Bearer ${credentials.token}`
                    },
                    body: new URLSearchParams({ token: credentials.token })
                });

                if (!response.ok) {
                    return false;
                }

                const data = await response.json() as { active?: boolean };
                return data.active === true;
            }

            // For API keys, use /health endpoint to verify connectivity
            // (API key validation happens server-side via X-API-Key header)
            await this.makeRequest<{ status: string }>('/health');
            return true;
        } catch {
            return false;
        }
    }

    async getUserInfo(): Promise<{ id: string; email: string; name?: string }> {
        return this.makeRequest<{ id: string; email: string; name?: string }>('/api/v1/auth/me');
    }
}
