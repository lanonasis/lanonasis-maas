import * as vscode from 'vscode';
import { SecureApiKeyService } from './SecureApiKeyService';

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
  keyType:
    | 'api_key'
    | 'database_url'
    | 'oauth_token'
    | 'certificate'
    | 'ssh_key'
    | 'webhook_secret'
    | 'encryption_key';
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

    this.baseUrl = useGateway ? gatewayUrl : apiUrl;
  }

  refreshConfig(): void {
    this.config = vscode.workspace.getConfiguration('lanonasis');
    this.updateConfig();
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const apiKey = await this.secureApiKeyService.getApiKeyOrPrompt();
    if (!apiKey) {
      throw new Error(
        'API key not configured. Please configure your API key to use Lanonasis services.',
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
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
      body: JSON.stringify(request),
    });
  }

  async updateProject(projectId: string, updates: Partial<CreateProjectRequest>): Promise<Project> {
    return this.makeRequest<Project>(`/api/v1/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.makeRequest<void>(`/api/v1/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // API KEY MANAGEMENT (MCP-Core endpoints)
  // ============================================================================

  async getApiKeys(projectId?: string): Promise<ApiKey[]> {
    // MCP-Core endpoint: /api/v1/auth/api-keys
    // Note: projectId filtering not supported by MCP-Core yet
    const endpoint = '/api/v1/auth/api-keys';
    return this.makeRequest<ApiKey[]>(endpoint);
  }

  async getApiKey(keyId: string): Promise<ApiKey> {
    // MCP-Core doesn't have individual key GET, fetch all and filter
    const keys = await this.getApiKeys();
    const key = keys.find((k) => k.id === keyId);
    if (!key) {
      throw new Error(`API key ${keyId} not found`);
    }
    return key;
  }

  async createApiKey(request: CreateApiKeyRequest): Promise<ApiKey> {
    // MCP-Core endpoint: POST /api/v1/auth/api-keys
    return this.makeRequest<ApiKey>('/api/v1/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify({
        name: request.name,
        access_level: request.accessLevel,
        description: `${request.keyType} key for ${request.environment}`,
        expires_in_days: request.expiresAt
          ? Math.ceil((new Date(request.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 365,
        project_id: request.projectId,
      }),
    });
  }

  async updateApiKey(keyId: string, updates: Partial<CreateApiKeyRequest>): Promise<ApiKey> {
    // MCP-Core doesn't support update, need to revoke and recreate
    throw new Error('API key update not supported. Please revoke and create a new key.');
  }

  async deleteApiKey(keyId: string): Promise<void> {
    // MCP-Core endpoint: DELETE /api/v1/auth/api-keys/:keyId
    await this.makeRequest<void>(`/api/v1/auth/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  async rotateApiKey(keyId: string): Promise<ApiKey> {
    // MCP-Core endpoint: POST /api/v1/auth/api-keys/:keyId/revoke
    return this.makeRequest<ApiKey>(`/api/v1/auth/api-keys/${keyId}/revoke`, {
      method: 'POST',
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
