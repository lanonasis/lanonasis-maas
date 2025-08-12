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
    constructor();
    /**
     * Connect to MCP server (local or remote)
     */
    connect(options?: MCPConnectionOptions): Promise<boolean>;
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
     * Get connection status details
     */
    getConnectionStatus(): {
        connected: boolean;
        mode: string;
        server?: string;
    };
}
export declare function getMCPClient(): MCPClient;
export {};
