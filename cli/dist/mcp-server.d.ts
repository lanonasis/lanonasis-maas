#!/usr/bin/env node
/**
 * CLI-Embedded MCP Server
 * Uses the same configuration and authentication as @lanonasis/cli v1.5.2+
 * Can run standalone or be invoked by CLI commands
 */
interface MCPServerOptions {
    mode?: 'stdio' | 'http';
    port?: number;
    verbose?: boolean;
    useRemote?: boolean;
}
export declare class CLIMCPServer {
    private config;
    constructor();
    /**
     * Start MCP server using CLI configuration
     */
    start(options?: MCPServerOptions): Promise<void>;
    private resolveMCPServerPath;
    /**
     * Start local MCP server using CLI auth config
     */
    private startLocalMCP;
    /**
     * Connect to remote MCP server
     */
    private startRemoteMCP;
    /**
     * Check if MCP server is available and configured
     */
    checkStatus(): Promise<{
        available: boolean;
        configured: boolean;
        authMethod: string;
        mode: 'local' | 'remote' | 'auto';
    }>;
}
export default CLIMCPServer;
