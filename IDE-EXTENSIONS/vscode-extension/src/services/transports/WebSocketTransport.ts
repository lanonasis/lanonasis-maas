/**
 * WebSocket Transport Implementation
 * Provides real-time bidirectional communication with the MCP server
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

// Use ws library in Node.js environment (VSCode extension host)
import WebSocket from 'ws';

interface PendingRequest {
  resolve: (response: MCPToolResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface QueuedMessage {
  request: MCPToolRequest;
  id: number;
}

// Configuration constants
const MAX_QUEUED_MESSAGES = 100;
const HEARTBEAT_INTERVAL_MS = 30000;

/**
 * WebSocket Transport for MCP communication
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Heartbeat/ping mechanism
 * - Message queuing during disconnection
 * - Request/response correlation
 */
export class WebSocketTransport implements ITransport {
  private config: TransportConfig;
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private lastError?: string;
  private lastPing?: Date;
  private latency?: number;
  private reconnectAttempts: number = 0;
  private messageId: number = 0;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private eventHandlers: Map<TransportEvent, Set<TransportEventHandler>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private disposed: boolean = false;

  constructor(config: TransportConfig) {
    this.config = {
      ...DEFAULT_TRANSPORT_CONFIG,
      ...config,
      type: 'websocket'
    };
  }

  async connect(): Promise<void> {
    if (this.disposed) {
      throw new Error('Transport has been disposed');
    }

    return new Promise((resolve, reject) => {
      try {
        const headers: Record<string, string> = {
          'X-Client-Type': 'vscode-extension',
          'X-Client-Version': '2.0.8',
          'X-Project-Scope': 'lanonasis-maas',
          ...this.config.headers
        };

        if (this.config.auth) {
          if (this.config.auth.type === 'bearer') {
            headers['Authorization'] = `Bearer ${this.config.auth.value}`;
          } else if (this.config.auth.type === 'apikey') {
            headers['X-API-Key'] = this.config.auth.value;
          }
        }

        this.ws = new WebSocket(this.config.url, { headers });

        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.timeout || DEFAULT_TRANSPORT_CONFIG.timeout);

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          this.handleOpen();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          clearTimeout(connectionTimeout);
          this.handleClose(code, reason.toString());
        });

        this.ws.on('error', (error: Error) => {
          clearTimeout(connectionTimeout);
          this.handleError(error);
          if (!this.connected) {
            reject(error);
          }
        });

        this.ws.on('pong', () => {
          this.handlePong();
        });

      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.clearReconnectTimeout();
    this.isReconnecting = false;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connected = false;
    this.rejectPendingRequests('Transport disconnected');
    this.emit('disconnected');
  }

  async send<T>(request: MCPToolRequest): Promise<MCPToolResponse<T>> {
    const id = ++this.messageId;

    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for later if reconnection is enabled
      if (this.config.reconnect?.enabled && this.messageQueue.length < MAX_QUEUED_MESSAGES) {
        this.messageQueue.push({ request, id });
        return new Promise((resolve, reject) => {
          this.pendingRequests.set(id, {
            resolve: resolve as (response: MCPToolResponse) => void,
            reject,
            timeout: setTimeout(() => {
              this.pendingRequests.delete(id);
              reject(new Error('Request timeout (queued)'));
            }, this.config.timeout || DEFAULT_TRANSPORT_CONFIG.timeout)
          });
        });
      }

      return {
        error: {
          code: -1,
          message: 'Transport not connected'
        }
      };
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, this.config.timeout || DEFAULT_TRANSPORT_CONFIG.timeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (response: MCPToolResponse) => void,
        reject,
        timeout
      });

      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: request.method,
        params: request.params
      });

      const socket = this.ws;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        resolve({
          error: {
            code: -1,
            message: 'Transport not connected'
          }
        });
        return;
      }

      socket.send(message);
    });
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  getStatus(): TransportStatus {
    return {
      connected: this.connected,
      type: 'websocket',
      url: this.config.url,
      latency: this.latency,
      lastPing: this.lastPing,
      lastError: this.lastError,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  on(event: TransportEvent, handler: TransportEventHandler): void {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(handler);
  }

  off(event: TransportEvent, handler: TransportEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  dispose(): void {
    this.disposed = true;
    this.disconnect();
    this.eventHandlers.clear();
    this.pendingRequests.clear();
    this.messageQueue = [];
  }

  private handleOpen(): void {
    this.connected = true;
    this.reconnectAttempts = 0;
    this.lastError = undefined;
    this.lastPing = new Date();
    this.isReconnecting = false;

    this.startHeartbeat();
    this.flushMessageQueue();
    this.emit('connected');
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      this.lastPing = new Date();

      // Handle JSON-RPC response
      if (message.id !== undefined) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);

          if (message.error) {
            pending.resolve({ error: message.error });
          } else {
            pending.resolve({ result: message.result });
          }
        }
      }

      // Handle server-initiated messages (notifications)
      if (message.method && !message.id) {
        this.emit('message', message);
      }

    } catch (error) {
      console.error('[WebSocketTransport] Failed to parse message:', error);
    }
  }

  private handleClose(code: number, reason: string): void {
    this.connected = false;
    this.stopHeartbeat();

    const wasConnected = this.ws !== null;
    this.ws = null;

    // Don't reconnect for intentional closes
    if (code === 1000 || this.disposed) {
      this.emit('disconnected', { code, reason });
      return;
    }

    this.lastError = `Connection closed: ${code} ${reason}`;
    this.emit('disconnected', { code, reason });

    // Attempt reconnection if enabled and not already reconnecting
    if (
      this.config.reconnect?.enabled &&
      !this.isReconnecting &&
      wasConnected &&
      this.reconnectAttempts < (this.config.reconnect.maxAttempts || 5)
    ) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= (this.config.reconnect?.maxAttempts || 5)) {
      this.rejectPendingRequests('Max reconnection attempts reached');
    }
  }

  private handleError(error: Error): void {
    this.lastError = error.message;
    this.emit('error', error);
  }

  private handlePong(): void {
    const now = Date.now();
    if (this.lastPing) {
      this.latency = now - this.lastPing.getTime();
    }
    this.lastPing = new Date(now);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPing = new Date();
        this.ws.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting || this.disposed) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const baseDelay = this.config.reconnect?.baseDelay || 1000;
    const maxDelay = this.config.reconnect?.maxDelay || 30000;

    // Exponential backoff with jitter
    const delay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      maxDelay
    );

    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimeout = setTimeout(async () => {
      if (this.disposed) return;

      try {
        await this.connect();
      } catch (error) {
        // handleClose will schedule next reconnect if needed
        console.warn('[WebSocketTransport] Reconnect attempt failed:', error);
        this.isReconnecting = false;
      }
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private flushMessageQueue(): void {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.messageQueue.length > 0) {
      const queued = this.messageQueue.shift();
      if (!queued) {
        continue;
      }
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id: queued.id,
        method: queued.request.method,
        params: queued.request.params
      });

      this.ws.send(message);
    }
  }

  private rejectPendingRequests(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
    this.messageQueue = [];
  }

  private emit(event: TransportEvent, data?: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(event, data);
      } catch (e) {
        console.error(`[WebSocketTransport] Error in event handler for ${event}:`, e);
      }
    });
  }
}
