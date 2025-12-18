/**
 * MCP (Model Context Protocol) types and interfaces
 */

export interface MCPClientConfig {
  endpoint?: string;
  apiKey?: string;
  token?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  endpoint: string;
}

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, any>;
  requestId?: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface SessionConfig {
  toolId: string;
  keyNames: string[];
  justification?: string;
  duration?: number;
  permissions?: string[];
}

export interface AccessContext {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  ipAddress?: string;
  userAgent?: string;
}

