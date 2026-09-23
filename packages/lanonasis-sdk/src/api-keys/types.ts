/**
 * API Key types and interfaces
 */

export interface ApiKey {
  id: string;
  name: string;
  keyType: KeyType;
  environment: Environment;
  accessLevel: AccessLevel;
  status: KeyStatus;
  project_id?: string;
  user_id?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
  last_used_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface ApiKeyProject {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  keyType: KeyType;
  environment: Environment;
  accessLevel: AccessLevel;
  project_id?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface UpdateApiKeyRequest {
  name?: string;
  status?: KeyStatus;
  accessLevel?: AccessLevel;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export type KeyType = 
  | 'api_key'
  | 'oauth_token'
  | 'jwt_token'
  | 'webhook_secret'
  | 'database_url'
  | 'custom';

export type Environment = 
  | 'development'
  | 'staging'
  | 'production';

export type AccessLevel = 
  | 'read'
  | 'write'
  | 'admin'
  | 'custom';

export type KeyStatus = 
  | 'active'
  | 'inactive'
  | 'revoked'
  | 'expired';

export interface MCPTool {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateMCPToolRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface MCPAccessRequest {
  toolId: string;
  keyNames: string[];
  justification?: string;
  duration?: number;
}

export interface MCPSession {
  id: string;
  tool_id: string;
  user_id?: string;
  organization_id?: string;
  status: 'active' | 'expired' | 'revoked';
  created_at?: string;
  expires_at?: string;
  accessed_keys?: string[];
}

export interface ProxyToken {
  token: string;
  expires_at: string;
  permissions: string[];
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  api_key_id?: string;
  user_id?: string;
  organization_id?: string;
  details?: Record<string, any>;
  created_at?: string;
}

export interface KeyUsageAnalytics {
  key_id: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  last_used_at?: string;
  period: {
    start: string;
    end: string;
  };
}

