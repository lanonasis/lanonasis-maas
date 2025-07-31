interface MCPConnectionOptions {
    serverPath?: string;
    serverUrl?: string;
    useRemote?: boolean;
}
export declare class MCPClient {
    private client;
    private config;
    private isConnected;
    private sseConnection;
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
     * Disconnect from MCP server
     */
    disconnect(): Promise<void>;
    /**
     * Call an MCP tool
     */
    callTool(toolName: string, args: any): Promise<any>;
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
