/**
 * MCP Transport Manager
 * Handles multiple transport types for MCP connections
 */
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
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
 * Transport Manager class
 */
export declare class MCPTransportManager {
    private transports;
    private configs;
    /**
     * Create a transport based on configuration
     */
    createTransport(name: string, config: TransportConfig): Promise<Transport>;
    /**
     * Setup event forwarding for monitoring
     */
    private setupEventForwarding;
    /**
     * Get a transport by name
     */
    getTransport(name: string): Transport | undefined;
    /**
     * Create stdio transport helper
     */
    createStdioTransport(command: string, args?: string[]): Promise<StdioClientTransport>;
    /**
     * Create HTTP transport helper
     */
    createHttpTransport(url: string, headers?: Record<string, string>, auth?: TransportConfig['auth']): Promise<Transport>;
    /**
     * Create WebSocket transport helper
     */
    createWebSocketTransport(url: string, options?: {
        headers?: Record<string, string>;
        auth?: TransportConfig['auth'];
        reconnect?: TransportConfig['reconnect'];
    }): Promise<Transport>;
    /**
     * Close all transports
     */
    closeAll(): Promise<void>;
    /**
     * Close a specific transport
     */
    closeTransport(name: string): Promise<void>;
    /**
     * Get all transport statuses
     */
    getStatuses(): Record<string, boolean>;
    /**
     * Reconnect a transport
     */
    reconnect(name: string): Promise<Transport>;
}
export declare const transportManager: MCPTransportManager;
