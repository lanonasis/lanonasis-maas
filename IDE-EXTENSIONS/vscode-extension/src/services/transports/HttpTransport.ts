/**
 * HTTP Transport Implementation
 * Provides HTTP-based communication with the MCP server
 */

import {
  ITransport,
  TransportConfig,
  TransportStatus,
  TransportEvent,
  TransportEventHandler,
  MCPToolRequest,
  MCPToolResponse,
  DEFAULT_TRANSPORT_CONFIG
} from './ITransport';

/**
 * HTTP Transport for MCP communication
 * Uses fetch API for request/response pattern
 */
export class HttpTransport implements ITransport {
  private config: TransportConfig;
  private connected: boolean = false;
  private lastError?: string;
  private lastPing?: Date;
  private eventHandlers: Map<TransportEvent, Set<TransportEventHandler>> = new Map();
  private baseHeaders: Record<string, string>;

  constructor(config: TransportConfig) {
    this.config = {
      ...DEFAULT_TRANSPORT_CONFIG,
      ...config,
      type: 'http'
    };

    this.baseHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'vscode-extension',
      'X-Client-Version': '2.0.8',
      'X-Project-Scope': 'lanonasis-maas',
      ...config.headers
    };

    if (config.auth) {
      if (config.auth.type === 'bearer') {
        this.baseHeaders['Authorization'] = `Bearer ${config.auth.value}`;
      } else if (config.auth.type === 'apikey') {
        this.baseHeaders['X-API-Key'] = config.auth.value;
      }
    }
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a health check using URL parsing for robustness
      const baseUrl = new URL(this.config.url);
      if (baseUrl.pathname.endsWith('/api/v1')) {
        baseUrl.pathname = baseUrl.pathname.slice(0, -'/api/v1'.length) || '/';
      }
      const normalizedPath = baseUrl.pathname.replace(/\/$/, '');
      baseUrl.pathname = `${normalizedPath}/health`;
      const healthUrl = baseUrl.toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout || DEFAULT_TRANSPORT_CONFIG.timeout
      );

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: this.baseHeaders,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      this.connected = true;
      this.lastPing = new Date();
      this.lastError = undefined;
      this.emit('connected');
    } catch (error) {
      this.connected = false;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }

  async send<T>(request: MCPToolRequest): Promise<MCPToolResponse<T>> {
    if (!this.connected) {
      return {
        error: {
          code: -1,
          message: 'Transport not connected'
        }
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout || DEFAULT_TRANSPORT_CONFIG.timeout
      );

      // Map MCP tool call to REST API endpoint
      const endpoint = this.mapToolToEndpoint(request.params.name);
      const method = this.mapToolToMethod(request.params.name);

      const fetchOptions: RequestInit = {
        method,
        headers: this.baseHeaders,
        signal: controller.signal
      };

      // Add body for POST/PUT requests
      if (method !== 'GET' && method !== 'DELETE') {
        fetchOptions.body = JSON.stringify(request.params.arguments);
      }

      const url = this.buildUrl(endpoint, method === 'GET' ? request.params.arguments : undefined);
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);
      this.lastPing = new Date();

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          error: {
            code: response.status,
            message: `HTTP ${response.status}: ${response.statusText}`,
            data: errorBody
          }
        };
      }

      const data = await response.json();
      this.emit('message', data);

      return { result: data as T };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);

      // Check if it's a network error that should trigger reconnection
      if (this.isNetworkError(error)) {
        this.connected = false;
        this.emit('disconnected');
      }

      this.emit('error', error);

      return {
        error: {
          code: -1,
          message: this.lastError
        }
      };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus(): TransportStatus {
    return {
      connected: this.connected,
      type: 'http',
      url: this.config.url,
      lastPing: this.lastPing,
      lastError: this.lastError
    };
  }

  on(event: TransportEvent, handler: TransportEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: TransportEvent, handler: TransportEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  dispose(): void {
    this.connected = false;
    this.eventHandlers.clear();
  }

  private emit(event: TransportEvent, data?: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(event, data);
      } catch (e) {
        console.error(`[HttpTransport] Error in event handler for ${event}:`, e);
      }
    });
  }

  /**
   * Map MCP tool name to REST API endpoint
   */
  private mapToolToEndpoint(toolName: string): string {
    const toolEndpointMap: Record<string, string> = {
      'memory_create': '/memory',
      'memory_search': '/memory/search',
      'memory_list': '/memory',
      'memory_get': '/memory',
      'memory_update': '/memory',
      'memory_delete': '/memory',
      'memory_stats': '/memory/stats',
      'topic_create': '/topics',
      'topic_list': '/topics',
      'system_health': '/health'
    };

    return toolEndpointMap[toolName] || `/mcp/tools/${toolName}`;
  }

  /**
   * Map MCP tool name to HTTP method based on action suffix
   */
  private mapToolToMethod(toolName: string): string {
    // Use action suffix for more precise mapping (e.g., memory_create -> create)
    const segments = toolName.split('_');
    const action = segments[segments.length - 1] || toolName;

    if (action === 'create') return 'POST';
    if (action === 'update') return 'PUT';
    if (action === 'delete') return 'DELETE';
    if (action === 'search') return 'POST';
    return 'GET';
  }

  /**
   * Build URL with query parameters for GET requests
   */
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    let url = `${this.config.url}${endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Check if error is a network-related error
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('etimedout') ||
        message.includes('abort')
      );
    }
    return false;
  }
}
