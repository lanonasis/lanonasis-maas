/**
 * Lanonasis MCP Server Implementation
 * Provides MCP protocol access to Lanonasis MaaS functionality
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
export interface LanonasisServerOptions {
    name?: string;
    version?: string;
    verbose?: boolean;
    apiUrl?: string;
    token?: string;
    apiKey?: string;
    transport?: 'stdio' | 'ws' | 'http' | 'sse';
    port?: number;
    host?: string;
    preferredTransport?: 'stdio' | 'websocket' | 'http';
    enableTransportFallback?: boolean;
}
export interface ConnectionHealth {
    clientId: string;
    connectedAt: Date;
    lastActivity: Date;
    transport: 'stdio' | 'websocket' | 'http';
    authenticated: boolean;
    clientInfo?: {
        name?: string;
        version?: string;
    };
}
export interface ConnectionPoolStats {
    totalConnections: number;
    activeConnections: number;
    authenticatedConnections: number;
    connectionsByTransport: Record<string, number>;
}
export declare class LanonasisMCPServer {
    private server;
    private config;
    private apiClient;
    private transport;
    private options;
    private connectionPool;
    private maxConnections;
    private connectionCleanupInterval;
    private supportedTransports;
    private transportFailures;
    private enableFallback;
    constructor(options?: LanonasisServerOptions);
    /**
     * Initialize the server
     */
    initialize(): Promise<void>;
    /**
     * Register MCP tools
     */
    private registerTools;
    /**
      * Register MCP resources
      */
    private registerResources;
    /**
     * Register MCP prompts
     */
    private registerPrompts; /**
    
    /**
     * Handle tool calls
     */
    private handleToolCall;
    /**
     * Handle resource reads
     */
    private handleResourceRead;
    /**
     * Handle system health check
     */
    private handleSystemHealth;
    /**
     * Handle system configuration
     */
    private handleSystemConfig; /**
  
     * Connection pool management methods
     */
    /**
     * Add a new connection to the pool
     */
    private addConnection;
    /**
     * Remove a connection from the pool
     */
    private removeConnection;
    /**
     * Update connection activity timestamp
     */
    private updateConnectionActivity;
    /**
     * Mark connection as authenticated
     */
    private authenticateConnection;
    /**
     * Get connection pool statistics
     */
    private getConnectionPoolStats;
    /**
     * Start connection cleanup monitoring
     */
    private startConnectionCleanup;
    /**
     * Stop connection cleanup monitoring
     */
    private stopConnectionCleanup;
    /**
     * Clean up stale connections (no activity for 10 minutes)
     */
    private cleanupStaleConnections;
    /**
     * Generate unique client ID for new connections
     */
    private generateClientId;
    /**
     * Extract client ID from request headers or metadata
     */
    private extractClientId;
    /**
     * Authenticate incoming MCP request
     */
    private authenticateRequest;
    /**
     * Extract authentication information from request
     */
    private extractAuthInfo;
    /**
     * Check if this is a stdio connection
     */
    private isStdioConnection;
    /**
     * Determine transport type from request
     */
    private determineTransport;
    /**
     * Ensure connection exists in pool
     */
    private ensureConnectionExists;
    /**
     * Validate stored CLI credentials
     */
    private validateStoredCredentials;
    /**
     * Validate provided credentials against the API
     */
    private validateCredentials;
    /**
     * Validate connection authentication status
     */
    private validateConnectionAuth;
    /**
     * Get authentication status for all connections
     */
    private getAuthenticationStatus;
    /**
     * Transport protocol management methods
     */
    /**
     * Check if a transport is available and working
     */
    private checkTransportAvailability;
    /**
     * Test WebSocket transport availability
     */
    private testWebSocketAvailability;
    /**
     * Test HTTP transport availability
     */
    private testHttpAvailability;
    /**
     * Record a transport failure
     */
    private recordTransportFailure;
    /**
     * Get the best available transport
     */
    private getBestAvailableTransport;
    /**
     * Handle transport-specific errors with clear messages
     */
    private handleTransportError;
    /**
     * Attempt to start server with transport fallback
     */
    private startWithTransportFallback;
    /**
     * Start a specific transport
     */
    private startTransport;
    /**
     * Get transport status and statistics
     */
    private getTransportStatus;
    /**
     * Check if connection limit allows new connections
     */
    private canAcceptNewConnection;
    /**
     * Get connection by client ID
     */
    private getConnection;
    /**
     * Setup error handling
     */
    private setupErrorHandling;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Start the server in stdio mode for external MCP clients (Claude Desktop, Cursor, etc.)
     * This is the primary entry point for `lanonasis mcp start`
     */
    startStdio(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Get server instance (for testing)
     */
    getServer(): Server;
    /**
     * Get connection pool for testing/monitoring
     */
    getConnectionPool(): Map<string, ConnectionHealth>;
}
