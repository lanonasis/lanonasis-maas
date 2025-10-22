interface MCPConnectionOptions {
    serverPath?: string;
    serverUrl?: string;
    useRemote?: boolean;
    useWebSocket?: boolean;
    connectionMode?: 'local' | 'remote' | 'websocket';
}
/**
 * Interface for MCP tool arguments
 */
interface MCPToolArgs {
    [key: string]: unknown;
}
/**
 * Interface for MCP tool response
 */
export interface MCPToolResponse {
    result?: unknown;
    error?: {
        code: number;
        message: string;
    };
    id?: string;
    title?: string;
    memory_type?: string;
    length?: number;
    forEach?: (callback: (item: any, index: number) => void) => void;
    code?: number;
    message?: string;
    response?: any;
}
/**
 * Interface for MCP WebSocket messages
 */
export interface MCPWebSocketMessage {
    id: number;
    method?: string;
    params?: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export declare class MCPClient {
    private client;
    private config;
    private isConnected;
    private sseConnection;
    private wsConnection;
    private retryAttempts;
    private maxRetries;
    private healthCheckInterval;
    private connectionStartTime;
    private lastHealthCheck;
    constructor();
    /**
     * Initialize the MCP client configuration
     */
    init(): Promise<void>;
    /**
     * Connect to MCP server with retry logic
     */
    connect(options?: MCPConnectionOptions): Promise<boolean>;
    /**
     * Connect to MCP server with retry logic and exponential backoff
     */
    private connectWithRetry;
    /**
     * Handle connection failures with retry logic and specific error messages
     */
    private handleConnectionFailure;
    /**
     * Check if error is authentication-related
     */
    private isAuthenticationError;
    /**
     * Provide authentication-specific guidance
     */
    private provideAuthenticationGuidance;
    /**
     * Provide network troubleshooting guidance
     */
    private provideNetworkTroubleshootingGuidance;
    /**
     * Calculate exponential backoff delay with jitter
     */
    private exponentialBackoff;
    /**
     * Validate authentication credentials before attempting MCP connection
     */
    private validateAuthBeforeConnect;
    /**
     * Validate vendor key format
     */
    private validateVendorKeyFormat;
    /**
     * Validate and refresh token if needed
     */
    private validateAndRefreshToken;
    /**
     * Refresh token if needed
     */
    private refreshTokenIfNeeded;
    /**
     * Validate token with server
     */
    private validateTokenWithServer;
    /**
     * Initialize SSE connection for real-time updates
     */
    private initializeSSE;
    /**
     * Initialize WebSocket connection for enterprise MCP server
     */
    private initializeWebSocket;
    /**
     * Send a message over the WebSocket connection
     */
    private sendWebSocketMessage;
    /**
     * Start health monitoring for the connection
     */
    private startHealthMonitoring;
    /**
     * Stop health monitoring
     */
    private stopHealthMonitoring;
    /**
     * Perform a health check on the current connection
     */
    private performHealthCheck;
    /**
     * Check WebSocket connection health
     */
    private checkWebSocketHealth;
    /**
     * Check remote connection health
     */
    private checkRemoteHealth;
    /**
     * Check local connection health
     */
    private checkLocalHealth;
    /**
     * Handle health check failure by attempting reconnection
     */
    private handleHealthCheckFailure;
    /**
     * Disconnect from MCP server
     */
    disconnect(): Promise<void>;
    /**
     * Call an MCP tool
     */
    callTool(toolName: string, args: MCPToolArgs): Promise<MCPToolResponse>;
    /**
     * Call remote tool via REST API with MCP interface
     */
    private callRemoteTool;
    /**
     * List available tools
     */
    listTools(): Promise<Array<{
        name: string;
        description: string;
    }>>;
    /**
     * Check if connected to MCP server
     */
    isConnectedToServer(): boolean;
    /**
     * Get connection status details with health information
     */
    getConnectionStatus(): {
        connected: boolean;
        mode: string;
        server?: string;
        latency?: number;
        lastHealthCheck?: Date;
        connectionUptime?: number;
        failureCount: number;
    };
}
export declare function getMCPClient(): MCPClient;
export {};
