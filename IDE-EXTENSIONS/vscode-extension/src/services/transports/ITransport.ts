/**
 * Transport Layer Interface Definitions
 * Defines common interfaces for WebSocket and HTTP transports
 */

export type TransportType = 'websocket' | 'http' | 'sse';

export interface TransportConfig {
  type: TransportType;
  url: string;
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'apikey';
    value: string;
  };
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
  timeout?: number;
}

export interface TransportStatus {
  connected: boolean;
  type: TransportType;
  url: string;
  latency?: number;
  lastPing?: Date;
  lastError?: string;
  reconnectAttempts?: number;
}

export type TransportEvent = 'connected' | 'disconnected' | 'error' | 'message' | 'reconnecting';

export interface TransportEventHandler {
  (event: TransportEvent, data?: unknown): void;
}

/**
 * MCP Tool Call Request
 */
export interface MCPToolRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * MCP Tool Response
 */
export interface MCPToolResponse<T = unknown> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Transport interface - common contract for all transport implementations
 */
export interface ITransport {
  /**
   * Connect to the server
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the server
   */
  disconnect(): Promise<void>;

  /**
   * Send a request and receive a response
   */
  send<T>(request: MCPToolRequest): Promise<MCPToolResponse<T>>;

  /**
   * Check if transport is currently connected
   */
  isConnected(): boolean;

  /**
   * Get current transport status
   */
  getStatus(): TransportStatus;

  /**
   * Register event handler
   */
  on(event: TransportEvent, handler: TransportEventHandler): void;

  /**
   * Remove event handler
   */
  off(event: TransportEvent, handler: TransportEventHandler): void;

  /**
   * Clean up resources
   */
  dispose(): void;
}

/**
 * Default transport configuration values
 */
export const DEFAULT_TRANSPORT_CONFIG = {
  timeout: 30000,
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000
  }
} as const;

/**
 * WebSocket URL endpoints
 */
export const TRANSPORT_ENDPOINTS = {
  websocket: 'wss://mcp.lanonasis.com/ws',
  http: 'https://api.lanonasis.com/api/v1',
  sse: 'https://mcp.lanonasis.com/api/v1/events'
} as const;
