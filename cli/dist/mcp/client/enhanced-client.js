/**
 * Enhanced MCP Client with advanced features
 * Provides multi-server support, connection pooling, and better error handling
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import { EventEmitter } from 'events';
export class EnhancedMCPClient extends EventEmitter {
    clients = new Map();
    transports = new Map();
    connectionStatus = new Map();
    retryAttempts = new Map();
    healthCheckIntervals = new Map();
    spinner = null;
    constructor() {
        super();
        this.setupEventHandlers();
    }
    /**
     * Setup internal event handlers
     */
    setupEventHandlers() {
        this.on('connection:established', (server) => {
            console.log(chalk.green(`✅ Connected to ${server}`));
        });
        this.on('connection:lost', (server) => {
            console.log(chalk.yellow(`⚠️ Lost connection to ${server}`));
        });
        this.on('connection:error', (server, error) => {
            console.log(chalk.red(`❌ Connection error for ${server}: ${error.message}`));
        });
    }
    /**
     * Connect to multiple MCP servers
     */
    async connectMultiple(servers) {
        const results = new Map();
        // Sort servers by priority
        const sortedServers = servers.sort((a, b) => (a.priority || 999) - (b.priority || 999));
        // Connect in parallel with controlled concurrency
        const connectionPromises = sortedServers.map(server => this.connectSingle(server).then(success => {
            results.set(server.name, success);
            return { server: server.name, success };
        }));
        await Promise.allSettled(connectionPromises);
        // Start health monitoring for connected servers
        results.forEach((success, name) => {
            if (success) {
                this.startHealthMonitoring(name);
            }
        });
        return results;
    }
    /**
     * Connect to a single MCP server with retry logic
     */
    async connectSingle(config) {
        const maxRetries = config.maxRetries || 3;
        const timeout = config.timeout || 30000;
        let attempts = 0;
        while (true) {
            try {
                this.updateConnectionStatus(config.name, 'connecting');
                const client = await this.createClientWithTimeout(config, timeout);
                this.clients.set(config.name, client);
                this.updateConnectionStatus(config.name, 'connected');
                this.emit('connection:established', config.name);
                return true;
            }
            catch (error) {
                attempts++;
                this.retryAttempts.set(config.name, attempts);
                if (attempts >= maxRetries) {
                    this.updateConnectionStatus(config.name, 'error', error);
                    this.emit('connection:error', config.name, error);
                    return false;
                }
                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
                console.log(chalk.yellow(`⏳ Retrying connection to ${config.name} in ${delay}ms...`));
                await this.delay(delay);
            }
        }
    }
    /**
     * Create client with timeout
     */
    async createClientWithTimeout(config, timeout) {
        return Promise.race([
            this.createClient(config),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Connection timeout after ${timeout}ms`)), timeout))
        ]);
    }
    /**
     * Create MCP client based on config
     */
    async createClient(config) {
        let transport;
        switch (config.type) {
            case 'stdio':
                if (!config.command) {
                    throw new Error('Command required for stdio transport');
                }
                transport = new StdioClientTransport({
                    command: config.command,
                    args: config.args || []
                });
                break;
            case 'http':
                if (!config.url) {
                    throw new Error('URL required for http transport');
                }
                // HTTP transport is not directly supported by MCP SDK
                // Use stdio or websocket instead
                throw new Error('HTTP transport not directly supported. Use websocket or stdio transport.');
            case 'websocket':
                if (!config.url) {
                    throw new Error('URL required for websocket transport');
                }
                transport = await this.createWebSocketTransport(config.url);
                break;
            default:
                throw new Error(`Unsupported transport type: ${config.type}`);
        }
        this.transports.set(config.name, transport);
        const client = new Client({
            name: `lanonasis-cli-${config.name}`,
            version: '3.0.1'
        }, {
            capabilities: {}
        });
        await client.connect(transport);
        return client;
    }
    /**
     * Create WebSocket transport
     */
    async createWebSocketTransport(url) {
        // Custom WebSocket transport implementation
        const WebSocket = (await import('ws')).default;
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            ws.on('open', () => {
                resolve({
                    send: (data) => ws.send(JSON.stringify(data)),
                    on: (event, handler) => ws.on(event, handler),
                    close: () => ws.close()
                });
            });
            ws.on('error', reject);
        });
    }
    /**
     * Execute a chain of tools
     */
    async executeToolChain(chain) {
        const results = [];
        if (chain.mode === 'sequential') {
            for (const tool of chain.tools) {
                const result = await this.executeTool(tool.name, tool.args);
                results.push(result);
                if (tool.waitForCompletion) {
                    await this.waitForToolCompletion(tool.name, result);
                }
            }
        }
        else {
            // Parallel execution
            const promises = chain.tools.map(tool => this.executeTool(tool.name, tool.args));
            const parallelResults = await Promise.allSettled(promises);
            parallelResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    results.push({ error: result.reason, tool: chain.tools[index].name });
                }
            });
        }
        return results;
    }
    /**
     * Execute a single tool with automatic server selection
     */
    async executeTool(toolName, args) {
        // Find the best available server for this tool
        const server = await this.selectBestServer(toolName);
        if (!server) {
            throw new Error(`No available server for tool: ${toolName}`);
        }
        const client = this.clients.get(server);
        if (!client) {
            throw new Error(`Client not found for server: ${server}`);
        }
        try {
            const result = await client.callTool({
                name: toolName,
                arguments: args
            });
            return result;
        }
        catch (error) {
            // Try failover to another server
            const failoverServer = await this.selectFailoverServer(server, toolName);
            if (failoverServer) {
                console.log(chalk.yellow(`⚠️ Failing over to ${failoverServer}...`));
                const failoverClient = this.clients.get(failoverServer);
                if (failoverClient) {
                    return failoverClient.callTool({
                        name: toolName,
                        arguments: args
                    });
                }
            }
            throw error;
        }
    }
    /**
     * Select the best server for a tool based on availability and latency
     */
    async selectBestServer(_toolName) {
        const availableServers = Array.from(this.clients.keys()).filter(name => {
            const status = this.connectionStatus.get(name);
            return status?.status === 'connected';
        });
        if (availableServers.length === 0) {
            return null;
        }
        // For now, return the first available server
        // TODO: Implement smarter selection based on tool availability and latency
        return availableServers[0];
    }
    /**
     * Select a failover server
     */
    async selectFailoverServer(excludeServer, _toolName) {
        const availableServers = Array.from(this.clients.keys()).filter(name => {
            const status = this.connectionStatus.get(name);
            return name !== excludeServer && status?.status === 'connected';
        });
        return availableServers.length > 0 ? availableServers[0] : null;
    }
    /**
     * Wait for tool completion (for async operations)
     */
    async waitForToolCompletion(toolName, initialResult) {
        // Implementation depends on the specific tool
        // This is a placeholder for tools that return operation IDs
        if (initialResult.operationId) {
            let completed = false;
            let attempts = 0;
            const maxAttempts = 60; // 1 minute with 1 second intervals
            while (!completed && attempts < maxAttempts) {
                await this.delay(1000);
                // Check operation status (implementation specific)
                // completed = await this.checkOperationStatus(initialResult.operationId);
                attempts++;
            }
        }
    }
    /**
     * Start health monitoring for a server
     */
    startHealthMonitoring(serverName) {
        // Clear existing interval if any
        const existingInterval = this.healthCheckIntervals.get(serverName);
        if (existingInterval) {
            clearInterval(existingInterval);
        }
        const interval = setInterval(async () => {
            await this.performHealthCheck(serverName);
        }, 30000); // Check every 30 seconds
        this.healthCheckIntervals.set(serverName, interval);
    }
    /**
     * Perform health check for a server
     */
    async performHealthCheck(serverName) {
        const client = this.clients.get(serverName);
        if (!client)
            return;
        const startTime = Date.now();
        try {
            // Use a simple tool call as a health check
            await client.listTools();
            const latency = Date.now() - startTime;
            this.updateConnectionStatus(serverName, 'connected', undefined, latency);
        }
        catch (error) {
            this.updateConnectionStatus(serverName, 'error', error);
            // Attempt reconnection
            const config = this.getServerConfig(serverName);
            if (config) {
                console.log(chalk.yellow(`⚠️ Attempting to reconnect to ${serverName}...`));
                await this.connectSingle(config);
            }
        }
    }
    /**
     * Update connection status
     */
    updateConnectionStatus(server, status, error, latency) {
        this.connectionStatus.set(server, {
            server,
            status,
            lastPing: new Date(),
            latency,
            error: error?.message
        });
    }
    /**
     * Get server configuration (placeholder - should be stored during connect)
     */
    getServerConfig(_serverName) {
        // TODO: Store and retrieve server configs
        return null;
    }
    /**
     * Get all connection statuses
     */
    getConnectionStatuses() {
        return Array.from(this.connectionStatus.values());
    }
    /**
     * Disconnect from all servers
     */
    async disconnectAll() {
        // Stop all health monitoring
        this.healthCheckIntervals.forEach(interval => {
            clearInterval(interval);
        });
        this.healthCheckIntervals.clear();
        // Disconnect all clients
        await Promise.all(Array.from(this.clients.entries()).map(async ([name, client]) => {
            try {
                await client.close();
                console.log(chalk.gray(`Disconnected from ${name}`));
            }
            catch {
                console.log(chalk.yellow(`Warning: Error disconnecting from ${name}`));
            }
        }));
        this.clients.clear();
        this.transports.clear();
        this.connectionStatus.clear();
    }
    /**
     * Disconnect from a specific server
     */
    async disconnect(serverName) {
        const interval = this.healthCheckIntervals.get(serverName);
        if (interval) {
            clearInterval(interval);
            this.healthCheckIntervals.delete(serverName);
        }
        const client = this.clients.get(serverName);
        if (client) {
            await client.close();
            this.clients.delete(serverName);
        }
        this.transports.delete(serverName);
        this.connectionStatus.delete(serverName);
    }
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// Export singleton instance
export const enhancedMCPClient = new EnhancedMCPClient();
