/**
 * MCP Transport Manager
 * Handles multiple transport types for MCP connections
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { EventEmitter } from 'events';
import { EventSource } from 'eventsource';
import WebSocket from 'ws';
import chalk from 'chalk';

export type TransportType = 'stdio' | 'http' | 'websocket' | 'sse';

export interface TransportConfig {
  type: TransportType;
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'apikey' | 'basic';
    value: string;
  };
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    delay?: number;
  };
  timeout?: number;
}

export interface Transport {
  send(data: any): Promise<void>;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  close(): Promise<void>;
  isConnected(): boolean;
}

/**
 * StdIO Transport wrapper
 */
class StdioTransport extends EventEmitter implements Transport {
  private transport: StdioClientTransport;
  private connected: boolean = false;

  constructor(config: TransportConfig) {
    super();
    
    if (!config.command) {
      throw new Error('Command required for stdio transport');
    }

    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args || []
    });

    this.connected = true;
  }

  async send(data: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }
    // StdioClientTransport handles this internally
    this.emit('send', data);
  }

  async close(): Promise<void> {
    this.connected = false;
    this.removeAllListeners();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getInternalTransport(): StdioClientTransport {
    return this.transport;
  }
}

/**
 * HTTP Transport wrapper
 */
class HttpTransport extends EventEmitter implements Transport {
  private url: string;
  private headers: Record<string, string>;
  private connected: boolean = false;
  private auth?: TransportConfig['auth'];

  constructor(config: TransportConfig) {
    super();
    
    if (!config.url) {
      throw new Error('URL required for HTTP transport');
    }

    this.url = config.url;
    this.headers = config.headers || {};
    this.auth = config.auth;
    
    if (this.auth) {
      this.setupAuthentication();
    }

    this.connected = true;
  }

  private setupAuthentication(): void {
    if (!this.auth) return;

    switch (this.auth.type) {
      case 'bearer':
        this.headers['Authorization'] = `Bearer ${this.auth.value}`;
        break;
      case 'apikey':
        this.headers['X-API-Key'] = this.auth.value;
        break;
      case 'basic':
        this.headers['Authorization'] = `Basic ${this.auth.value}`;
        break;
    }
  }

  async send(data: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      this.emit('message', result);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.connected = false;
    this.removeAllListeners();
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * WebSocket Transport wrapper
 */
class WebSocketTransport extends EventEmitter implements Transport {
  private ws: WebSocket | null = null;
  private url: string;
  private connected: boolean = false;
  private reconnectConfig: TransportConfig['reconnect'];
  private reconnectAttempts: number = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private headers: Record<string, string>;

  constructor(config: TransportConfig) {
    super();
    
    if (!config.url) {
      throw new Error('URL required for WebSocket transport');
    }

    this.url = config.url;
    this.reconnectConfig = config.reconnect;
    this.headers = config.headers || {};

    if (config.auth) {
      this.setupAuthentication(config.auth);
    }
  }

  private setupAuthentication(auth: TransportConfig['auth']): void {
    if (!auth) return;

    switch (auth.type) {
      case 'bearer':
        this.headers['Authorization'] = `Bearer ${auth.value}`;
        break;
      case 'apikey':
        this.headers['X-API-Key'] = auth.value;
        break;
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, {
          headers: this.headers
        });

        this.ws.on('open', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          console.log(chalk.green(`✅ WebSocket connected to ${this.url}`));
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.emit('message', message);
          } catch {
            this.emit('error', new Error('Failed to parse WebSocket message'));
          }
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          if (!this.connected) {
            reject(error);
          }
        });

        this.ws.on('close', (code, reason) => {
          this.connected = false;
          this.emit('disconnected', { code, reason: reason.toString() });
          
          if (this.shouldReconnect()) {
            this.scheduleReconnect();
          }
        });

        // Set connection timeout
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private shouldReconnect(): boolean {
    if (!this.reconnectConfig?.enabled) return false;
    
    const maxAttempts = this.reconnectConfig.maxAttempts || 5;
    return this.reconnectAttempts < maxAttempts;
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectConfig?.delay || 5000;
    const backoff = Math.min(delay * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.reconnectAttempts++;
    console.log(chalk.yellow(
      `⏳ Reconnecting WebSocket in ${backoff}ms (attempt ${this.reconnectAttempts})...`
    ));

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error(chalk.red('Reconnection failed:'), error);
      });
    }, backoff);
  }

  async send(data: any): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(data), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.removeAllListeners();
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Server-Sent Events Transport
 */
class SSETransport extends EventEmitter implements Transport {
  private eventSource: EventSource | null = null;
  private url: string;
  private connected: boolean = false;
  private headers: Record<string, string>;

  constructor(config: TransportConfig) {
    super();
    
    if (!config.url) {
      throw new Error('URL required for SSE transport');
    }

    this.url = config.url;
    this.headers = config.headers || {};
  }

  async connect(): Promise<void> {
    // Dynamic import for EventSource
    const { EventSource } = await import('eventsource');
    
    // EventSource doesn't support headers directly
    this.eventSource = new EventSource(this.url);

    return new Promise((resolve, reject) => {
      this.eventSource!.onopen = () => {
        this.connected = true;
        this.emit('connected');
        resolve();
      };

      this.eventSource!.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
        } catch {
          this.emit('error', new Error('Failed to parse SSE message'));
        }
      };

      this.eventSource!.onerror = (error) => {
        this.emit('error', error);
        if (!this.connected) {
          reject(error);
        }
      };
    });
  }

  async send(_data: any): Promise<void> {
    // SSE is receive-only, but we can send data via HTTP POST
    throw new Error('SSE transport is read-only. Use HTTP for sending data.');
  }

  async close(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected = false;
    this.removeAllListeners();
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Transport Manager class
 */
export class MCPTransportManager {
  private transports: Map<string, Transport> = new Map();
  private configs: Map<string, TransportConfig> = new Map();

  /**
   * Create a transport based on configuration
   */
  async createTransport(
    name: string, 
    config: TransportConfig
  ): Promise<Transport> {
    // Store config for potential reconnection
    this.configs.set(name, config);

    let transport: Transport;

    switch (config.type) {
      case 'stdio':
        transport = new StdioTransport(config);
        break;

      case 'http':
        transport = new HttpTransport(config);
        break;

      case 'websocket':
        transport = new WebSocketTransport(config);
        await (transport as WebSocketTransport).connect();
        break;

      case 'sse':
        transport = new SSETransport(config);
        await (transport as SSETransport).connect();
        break;

      default:
        throw new Error(`Unsupported transport type: ${config.type}`);
    }

    this.transports.set(name, transport);
    
    // Setup event forwarding
    this.setupEventForwarding(name, transport);

    return transport;
  }

  /**
   * Setup event forwarding for monitoring
   */
  private setupEventForwarding(name: string, transport: Transport): void {
    transport.on('connected', () => {
      console.log(chalk.green(`✅ Transport '${name}' connected`));
    });

    transport.on('disconnected', (reason?: any) => {
      console.log(chalk.yellow(`⚠️ Transport '${name}' disconnected:`, reason));
    });

    transport.on('error', (error: Error) => {
      console.log(chalk.red(`❌ Transport '${name}' error:`, error.message));
    });
  }

  /**
   * Get a transport by name
   */
  getTransport(name: string): Transport | undefined {
    return this.transports.get(name);
  }

  /**
   * Create stdio transport helper
   */
  async createStdioTransport(
    command: string, 
    args: string[] = []
  ): Promise<StdioClientTransport> {
    const transport = new StdioTransport({
      type: 'stdio',
      command,
      args
    });
    
    return transport.getInternalTransport();
  }

  /**
   * Create HTTP transport helper
   */
  async createHttpTransport(
    url: string,
    headers?: Record<string, string>,
    auth?: TransportConfig['auth']
  ): Promise<Transport> {
    return this.createTransport('http-default', {
      type: 'http',
      url,
      headers,
      auth
    });
  }

  /**
   * Create WebSocket transport helper
   */
  async createWebSocketTransport(
    url: string,
    options?: {
      headers?: Record<string, string>;
      auth?: TransportConfig['auth'];
      reconnect?: TransportConfig['reconnect'];
    }
  ): Promise<Transport> {
    return this.createTransport('websocket-default', {
      type: 'websocket',
      url,
      ...options
    });
  }

  /**
   * Close all transports
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.transports.values()).map(
      transport => transport.close()
    );
    
    await Promise.all(closePromises);
    this.transports.clear();
    this.configs.clear();
  }

  /**
   * Close a specific transport
   */
  async closeTransport(name: string): Promise<void> {
    const transport = this.transports.get(name);
    if (transport) {
      await transport.close();
      this.transports.delete(name);
      this.configs.delete(name);
    }
  }

  /**
   * Get all transport statuses
   */
  getStatuses(): Record<string, boolean> {
    const statuses: Record<string, boolean> = {};
    
    for (const [name, transport] of this.transports) {
      statuses[name] = transport.isConnected();
    }
    
    return statuses;
  }

  /**
   * Reconnect a transport
   */
  async reconnect(name: string): Promise<Transport> {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`No configuration found for transport: ${name}`);
    }

    // Close existing if any
    await this.closeTransport(name);
    
    // Create new transport
    return this.createTransport(name, config);
  }
}

// Export singleton instance
export const transportManager = new MCPTransportManager();
