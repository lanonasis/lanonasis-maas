/**
 * Transport Manager
 * Orchestrates transport selection, fallback chain, and health monitoring
 */

import * as vscode from 'vscode';
import {
  ITransport,
  TransportType,
  TransportConfig,
  TransportEvent,
  MCPToolRequest,
  MCPToolResponse,
  TRANSPORT_ENDPOINTS
} from './ITransport';
import { WebSocketTransport } from './WebSocketTransport';
import { HttpTransport } from './HttpTransport';

export type TransportPreference = 'auto' | 'websocket' | 'http';

export interface TransportManagerConfig {
  preference: TransportPreference;
  websocketUrl?: string;
  httpUrl?: string;
  auth?: {
    type: 'bearer' | 'apikey';
    value: string;
  };
  enableRealtime?: boolean;
  headers?: Record<string, string>;
}

export interface TransportManagerStatus {
  activeTransport: TransportType | null;
  availableTransports: TransportType[];
  connectionHealth: 'healthy' | 'degraded' | 'disconnected';
  realTimeCapable: boolean;
  lastHealthCheck?: Date;
  failureCount: number;
}

interface FailureTracking {
  count: number;
  firstFailure: Date;
  lastFailure: Date;
}

/**
 * Transport Manager
 * Manages transport lifecycle, fallback chain, and health monitoring
 */
export class TransportManager {
  private config: TransportManagerConfig;
  private activeTransport: ITransport | null = null;
  private activeTransportType: TransportType | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private failureTracking: Map<TransportType, FailureTracking> = new Map();
  private outputChannel: vscode.OutputChannel;
  private disposed: boolean = false;

  // Fallback chain constants
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly FAILURE_WINDOW_MS = 60000; // 1 minute
  private static readonly HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
  private static readonly RECOVERY_ATTEMPT_INTERVAL_MS = 300000; // 5 minutes

  constructor(config: TransportManagerConfig, outputChannel: vscode.OutputChannel) {
    this.config = config;
    this.outputChannel = outputChannel;
  }

  /**
   * Initialize and connect using the preferred transport with fallback
   */
  async connect(): Promise<void> {
    if (this.disposed) {
      throw new Error('TransportManager has been disposed');
    }

    this.log('Initializing transport connection...');

    const transportOrder = this.getTransportOrder();

    for (const transportType of transportOrder) {
      try {
        this.log(`Attempting ${transportType} transport...`);
        await this.connectTransport(transportType);
        this.log(`Connected via ${transportType}`);
        this.startHealthMonitoring();
        return;
      } catch (error) {
        this.log(`${transportType} failed: ${error instanceof Error ? error.message : error}`);
        this.recordFailure(transportType);
      }
    }

    throw new Error('All transports failed to connect');
  }

  /**
   * Disconnect current transport
   */
  async disconnect(): Promise<void> {
    this.stopHealthMonitoring();
    this.stopRecoveryAttempts();

    if (this.activeTransport) {
      await this.activeTransport.disconnect();
      this.activeTransport.dispose();
      this.activeTransport = null;
      this.activeTransportType = null;
    }
  }

  /**
   * Send a request through the active transport
   */
  async send<T>(request: MCPToolRequest): Promise<MCPToolResponse<T>> {
    if (!this.activeTransport || !this.activeTransportType || !this.activeTransport.isConnected()) {
      // Attempt reconnection
      try {
        await this.connect();
      } catch {
        return {
          error: {
            code: -1,
            message: 'No transport available'
          }
        };
      }
    }

    const transport = this.activeTransport;
    const transportType = this.activeTransportType;
    if (!transport || !transportType) {
      return {
        error: {
          code: -1,
          message: 'No transport available'
        }
      };
    }

    const response = await transport.send<T>(request);

    if (response.error) {
      this.recordFailure(transportType);
      await this.checkFallback();
    }

    return response;
  }

  /**
   * Get current transport status
   */
  getStatus(): TransportManagerStatus {
    const transportStatus = this.activeTransport?.getStatus();

    return {
      activeTransport: this.activeTransportType,
      availableTransports: this.getAvailableTransports(),
      connectionHealth: this.calculateConnectionHealth(),
      realTimeCapable: this.activeTransportType === 'websocket',
      lastHealthCheck: transportStatus?.lastPing,
      failureCount: this.getTotalFailures()
    };
  }

  /**
   * Check if real-time updates are available
   */
  isRealTimeCapable(): boolean {
    return this.activeTransportType === 'websocket' && this.config.enableRealtime !== false;
  }

  /**
   * Register for transport events
   */
  onTransportEvent(event: TransportEvent, handler: (event: TransportEvent, data?: unknown) => void): void {
    this.activeTransport?.on(event, handler);
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.disposed = true;
    this.disconnect();
    this.failureTracking.clear();
  }

  /**
   * Get transport order based on preference
   */
  private getTransportOrder(): TransportType[] {
    switch (this.config.preference) {
      case 'websocket':
        return ['websocket', 'http'];
      case 'http':
        return ['http'];
      case 'auto':
      default:
        // Auto: prefer WebSocket for real-time, fallback to HTTP
        return this.config.enableRealtime !== false
          ? ['websocket', 'http']
          : ['http', 'websocket'];
    }
  }

  /**
   * Connect to a specific transport type
   */
  private async connectTransport(type: TransportType): Promise<void> {
    const config = this.buildTransportConfig(type);

    let transport: ITransport;
    switch (type) {
      case 'websocket':
        transport = new WebSocketTransport(config);
        break;
      case 'http':
      case 'sse':
        transport = new HttpTransport(config);
        break;
      default:
        throw new Error(`Unknown transport type: ${type}`);
    }

    // Setup event handlers
    transport.on('disconnected', () => this.handleDisconnect());
    transport.on('error', (_, error) => this.handleError(error));
    transport.on('reconnecting', (_, data) => this.handleReconnecting(data));

    await transport.connect();

    // Dispose old transport if exists
    if (this.activeTransport) {
      this.activeTransport.dispose();
    }

    this.activeTransport = transport;
    this.activeTransportType = type;
    this.clearFailures(type);
  }

  /**
   * Build transport configuration for a specific type
   */
  private buildTransportConfig(type: TransportType): TransportConfig {
    const baseConfig: Partial<TransportConfig> = {
      auth: this.config.auth,
      headers: this.config.headers,
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000
      }
    };

    switch (type) {
      case 'websocket':
        return {
          ...baseConfig,
          type: 'websocket',
          url: this.config.websocketUrl || TRANSPORT_ENDPOINTS.websocket
        } as TransportConfig;

      case 'http':
      case 'sse':
        return {
          ...baseConfig,
          type: 'http',
          url: this.config.httpUrl || TRANSPORT_ENDPOINTS.http
        } as TransportConfig;

      default:
        throw new Error(`Unknown transport type: ${type}`);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.stopHealthMonitoring();

    this.healthCheckInterval = setInterval(async () => {
      if (!this.activeTransport?.isConnected()) {
        this.log('Health check: Transport disconnected');
        await this.checkFallback();
      }
    }, TransportManager.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Start recovery attempts for preferred transport
   */
  private startRecoveryAttempts(): void {
    if (this.recoveryInterval) return;

    // Only attempt recovery if we're on fallback transport
    if (this.activeTransportType === this.getTransportOrder()[0]) {
      return;
    }

    this.recoveryInterval = setInterval(async () => {
      const preferredTransport = this.getTransportOrder()[0];

      if (this.activeTransportType !== preferredTransport) {
        this.log(`Attempting recovery to ${preferredTransport}...`);

        try {
          await this.connectTransport(preferredTransport);
          this.log(`Recovered to ${preferredTransport}`);
          this.stopRecoveryAttempts();
        } catch (error) {
          this.log(`Recovery failed: ${error instanceof Error ? error.message : error}`);
        }
      }
    }, TransportManager.RECOVERY_ATTEMPT_INTERVAL_MS);
  }

  /**
   * Stop recovery attempts
   */
  private stopRecoveryAttempts(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
  }

  /**
   * Check if we should fall back to another transport
   */
  private async checkFallback(): Promise<void> {
    if (!this.activeTransportType) return;

    const failures = this.failureTracking.get(this.activeTransportType);
    if (!failures) return;

    // Check if failures exceed threshold within window
    const now = Date.now();
    const windowStart = now - TransportManager.FAILURE_WINDOW_MS;

    if (
      failures.count >= TransportManager.FAILURE_THRESHOLD &&
      failures.firstFailure.getTime() > windowStart
    ) {
      this.log(`Failure threshold reached for ${this.activeTransportType}, attempting fallback...`);

      const transportOrder = this.getTransportOrder();
      const currentIndex = transportOrder.indexOf(this.activeTransportType);
      const nextTransports = transportOrder.slice(currentIndex + 1);

      for (const transportType of nextTransports) {
        try {
          await this.connectTransport(transportType);
          this.log(`Fell back to ${transportType}`);
          this.startRecoveryAttempts();
          return;
        } catch (error) {
          this.log(`Fallback to ${transportType} failed: ${error instanceof Error ? error.message : error}`);
        }
      }

      this.log('All fallback transports failed');
    }
  }

  /**
   * Record a failure for a transport type
   */
  private recordFailure(type: TransportType): void {
    const now = new Date();
    const existing = this.failureTracking.get(type);

    if (existing) {
      // Reset if outside failure window
      if (now.getTime() - existing.firstFailure.getTime() > TransportManager.FAILURE_WINDOW_MS) {
        this.failureTracking.set(type, {
          count: 1,
          firstFailure: now,
          lastFailure: now
        });
      } else {
        existing.count++;
        existing.lastFailure = now;
      }
    } else {
      this.failureTracking.set(type, {
        count: 1,
        firstFailure: now,
        lastFailure: now
      });
    }
  }

  /**
   * Clear failures for a transport type
   */
  private clearFailures(type: TransportType): void {
    this.failureTracking.delete(type);
  }

  /**
   * Get total failure count
   */
  private getTotalFailures(): number {
    let total = 0;
    for (const [, tracking] of this.failureTracking) {
      total += tracking.count;
    }
    return total;
  }

  /**
   * Get list of available transports
   */
  private getAvailableTransports(): TransportType[] {
    const available: TransportType[] = [];

    if (this.config.websocketUrl || TRANSPORT_ENDPOINTS.websocket) {
      available.push('websocket');
    }
    if (this.config.httpUrl || TRANSPORT_ENDPOINTS.http) {
      available.push('http');
    }

    return available;
  }

  /**
   * Calculate overall connection health
   */
  private calculateConnectionHealth(): 'healthy' | 'degraded' | 'disconnected' {
    if (!this.activeTransport || !this.activeTransport.isConnected()) {
      return 'disconnected';
    }

    // Check if we're on fallback transport
    const preferredTransport = this.getTransportOrder()[0];
    if (this.activeTransportType !== preferredTransport) {
      return 'degraded';
    }

    // Check recent failures
    const failures = this.failureTracking.get(this.activeTransportType);
    if (failures && failures.count > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Handle transport disconnect
   */
  private handleDisconnect(): void {
    this.log('Transport disconnected');
    this.checkFallback();
  }

  /**
   * Handle transport error
   */
  private handleError(error: unknown): void {
    this.log(`Transport error: ${error instanceof Error ? error.message : error}`);
    if (this.activeTransportType) {
      this.recordFailure(this.activeTransportType);
    }
  }

  /**
   * Handle reconnection attempt
   */
  private handleReconnecting(data: unknown): void {
    const { attempt, delay } = data as { attempt: number; delay: number };
    this.log(`Reconnecting (attempt ${attempt}, delay ${delay}ms)...`);
  }

  /**
   * Log message to output channel
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [TransportManager] ${message}`);
  }
}
