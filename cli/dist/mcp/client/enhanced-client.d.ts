/**
 * Enhanced MCP Client with advanced features
 * Provides multi-server support, connection pooling, and better error handling
 */
import { EventEmitter } from 'events';
export interface MCPServerConfig {
    name: string;
    url?: string;
    command?: string;
    args?: string[];
    type: 'stdio' | 'http' | 'websocket';
    timeout?: number;
    maxRetries?: number;
    priority?: number;
}
export interface ToolChain {
    tools: Array<{
        name: string;
        args: Record<string, any>;
        waitForCompletion?: boolean;
    }>;
    mode: 'sequential' | 'parallel';
}
export interface ConnectionStatus {
    server: string;
    status: 'connected' | 'disconnected' | 'error' | 'connecting';
    lastPing?: Date;
    latency?: number;
    error?: string;
}
export declare class EnhancedMCPClient extends EventEmitter {
    private clients;
    private transports;
    private connectionStatus;
    private retryAttempts;
    private healthCheckIntervals;
    private spinner;
    constructor();
    /**
     * Setup internal event handlers
     */
    private setupEventHandlers;
    /**
     * Connect to multiple MCP servers
     */
    connectMultiple(servers: MCPServerConfig[]): Promise<Map<string, boolean>>;
    /**
     * Connect to a single MCP server with retry logic
     */
    connectSingle(config: MCPServerConfig): Promise<boolean>;
    /**
     * Create client with timeout
     */
    private createClientWithTimeout;
    /**
     * Create MCP client based on config
     */
    private createClient;
    /**
     * Create WebSocket transport
     */
    private createWebSocketTransport;
    /**
     * Execute a chain of tools
     */
    executeToolChain(chain: ToolChain): Promise<any[]>;
    /**
     * Execute a single tool with automatic server selection
     */
    executeTool(toolName: string, args: Record<string, any>): Promise<any>;
    /**
     * Select the best server for a tool based on availability and latency
     */
    private selectBestServer;
    /**
     * Select a failover server
     */
    private selectFailoverServer;
    /**
     * Wait for tool completion (for async operations)
     */
    private waitForToolCompletion;
    /**
     * Start health monitoring for a server
     */
    private startHealthMonitoring;
    /**
     * Perform health check for a server
     */
    private performHealthCheck;
    /**
     * Update connection status
     */
    private updateConnectionStatus;
    /**
     * Get server configuration (placeholder - should be stored during connect)
     */
    private getServerConfig;
    /**
     * Get all connection statuses
     */
    getConnectionStatuses(): ConnectionStatus[];
    /**
     * Disconnect from all servers
     */
    disconnectAll(): Promise<void>;
    /**
     * Disconnect from a specific server
     */
    disconnect(serverName: string): Promise<void>;
    /**
     * Utility delay function
     */
    private delay;
}
export declare const enhancedMCPClient: EnhancedMCPClient;
