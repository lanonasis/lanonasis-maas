import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import { CLIConfig } from './config.js';
import * as fs from 'fs';
import { EventSource } from 'eventsource';
import WebSocket from 'ws';
export class MCPClient {
    client = null;
    config;
    isConnected = false;
    sseConnection = null;
    wsConnection = null;
    retryAttempts = 0;
    maxRetries = 3;
    healthCheckInterval = null;
    connectionStartTime = 0;
    lastHealthCheck = null;
    activeConnectionMode = 'local'; // Track actual connection mode
    constructor() {
        this.config = new CLIConfig();
    }
    /**
     * Overrides the configuration directory used by the underlying CLI config.
     * Useful for tests that need isolated config state.
     */
    setConfigDirectory(configDir) {
        this.config.setConfigDirectory(configDir);
    }
    /**
     * Returns the current config file path. Primarily used for test introspection.
     */
    getConfigPath() {
        return this.config.getConfigPath();
    }
    /**
     * Helper for tests to seed authentication tokens without accessing internals.
     */
    async setTokenForTesting(token) {
        await this.config.setToken(token);
    }
    /**
     * Helper for tests to seed vendor keys without accessing internals.
     */
    async setVendorKeyForTesting(vendorKey) {
        await this.config.setVendorKey(vendorKey);
    }
    /**
     * Initialize the MCP client configuration
     */
    async init() {
        await this.config.init();
    }
    /**
     * Connect to MCP server with retry logic
     */
    async connect(options = {}) {
        this.retryAttempts = 0;
        return this.connectWithRetry(options);
    }
    /**
     * Connect to MCP server with retry logic and exponential backoff
     */
    async connectWithRetry(options = {}) {
        try {
            this.connectionStartTime = Date.now();
            // Initialize config if not already done
            await this.init();
            // Validate authentication before attempting connection
            await this.validateAuthBeforeConnect();
            // Determine connection mode with clear precedence and safe defaults
            // 1) explicit option
            // 2) explicit flags
            // 3) configured preference
            // 4) default to 'websocket' (production-ready pm2 mcp-core)
            const configuredMode = this.config.get('mcpConnectionMode');
            const preferRemote = this.config.get('mcpUseRemote');
            const connectionMode = options.connectionMode
                ?? (options.useWebSocket ? 'websocket' : undefined)
                ?? (options.useRemote ? 'remote' : undefined)
                ?? configuredMode
                ?? (preferRemote ? 'remote' : 'websocket');
            let wsUrl;
            let serverUrl;
            let serverPath;
            switch (connectionMode) {
                case 'websocket': {
                    // WebSocket connection mode for enterprise users
                    const wsUrlValue = options.serverUrl ??
                        this.config.get('mcpWebSocketUrl') ??
                        this.config.getMCPServerUrl() ??
                        'wss://mcp.lanonasis.com/ws';
                    wsUrl = wsUrlValue;
                    if (this.retryAttempts === 0) {
                        console.log(chalk.cyan(`Connecting to WebSocket MCP server at ${wsUrl}...`));
                    }
                    else {
                        console.log(chalk.yellow(`Retry ${this.retryAttempts}/${this.maxRetries}: Connecting to WebSocket MCP server...`));
                    }
                    // Initialize WebSocket connection
                    await this.initializeWebSocket(wsUrl);
                    this.isConnected = true;
                    this.activeConnectionMode = 'websocket';
                    this.retryAttempts = 0;
                    this.startHealthMonitoring();
                    return true;
                }
                case 'remote': {
                    // For remote MCP, we'll use the REST API with MCP-style interface
                    const serverUrlValue = options.serverUrl ??
                        this.config.get('mcpServerUrl') ??
                        this.config.getMCPRestUrl() ??
                        'https://mcp.lanonasis.com/api/v1';
                    serverUrl = serverUrlValue;
                    if (this.retryAttempts === 0) {
                        console.log(chalk.cyan(`Connecting to remote MCP server at ${serverUrl}...`));
                    }
                    else {
                        console.log(chalk.yellow(`Retry ${this.retryAttempts}/${this.maxRetries}: Connecting to remote MCP server...`));
                    }
                    // Initialize SSE connection for real-time updates
                    await this.initializeSSE(serverUrl);
                    this.isConnected = true;
                    this.activeConnectionMode = 'remote';
                    this.retryAttempts = 0;
                    this.startHealthMonitoring();
                    return true;
                }
                case 'local': {
                    // Local MCP server connection requires explicit path via option or config
                    serverPath = options.serverPath ?? this.config.get('mcpServerPath');
                    if (!serverPath) {
                        console.log(chalk.yellow('⚠️  No local MCP server path configured.'));
                        console.log(chalk.cyan('💡 Prefer using WebSocket mode (default). Or configure a local path via:'));
                        console.log(chalk.cyan('   lanonasis config set mcpServerPath /absolute/path/to/server.js'));
                        throw new Error('Local MCP server path not provided');
                    }
                    // Check if the server file exists
                    if (!fs.existsSync(serverPath)) {
                        console.log(chalk.yellow(`⚠️  Local MCP server not found at ${serverPath}`));
                        console.log(chalk.cyan('💡 For remote use WebSocket: lanonasis mcp connect --mode websocket --url wss://mcp.lanonasis.com/ws'));
                        throw new Error(`MCP server not found at ${serverPath}`);
                    }
                    if (this.retryAttempts === 0) {
                        console.log(chalk.cyan(`Connecting to local MCP server at ${serverPath}...`));
                    }
                    else {
                        console.log(chalk.yellow(`Retry ${this.retryAttempts}/${this.maxRetries}: Connecting to local MCP server...`));
                    }
                    // Allow passing extra args to local server (e.g., --stdio) via options or env/config
                    // Precedence: options.localArgs -> env.MCP_LOCAL_SERVER_ARGS -> config.mcpLocalArgs -> none
                    const envArgs = (process.env.MCP_LOCAL_SERVER_ARGS || '')
                        .split(' ')
                        .map(s => s.trim())
                        .filter(Boolean);
                    const configArgs = (this.config.get('mcpLocalArgs') || []);
                    const extraArgs = (options.localArgs && options.localArgs.length > 0)
                        ? options.localArgs
                        : (envArgs.length > 0 ? envArgs : configArgs);
                    const args = [serverPath, ...extraArgs];
                    const localTransport = new StdioClientTransport({
                        command: 'node',
                        args
                    });
                    this.client = new Client({
                        name: '@lanonasis/cli',
                        version: '3.0.1'
                    });
                    await this.client.connect(localTransport);
                    this.isConnected = true;
                    this.activeConnectionMode = 'local';
                    this.retryAttempts = 0;
                    console.log(chalk.green('✓ Connected to MCP server'));
                    this.startHealthMonitoring();
                    return true;
                }
                default: {
                    // Safety: if we reach default, fall back to remote (HTTP) rather than brittle local
                    const serverUrlValue = options.serverUrl
                        ?? this.config.get('mcpServerUrl')
                        ?? this.config.getMCPRestUrl()
                        ?? 'https://mcp.lanonasis.com/api/v1';
                    serverUrl = serverUrlValue;
                    console.log(chalk.yellow(`Unknown connection mode '${String(connectionMode)}', falling back to remote at ${serverUrl}`));
                    await this.initializeSSE(serverUrl);
                    this.isConnected = true;
                    this.activeConnectionMode = 'remote';
                    this.retryAttempts = 0;
                    this.startHealthMonitoring();
                    return true;
                }
            }
        }
        catch (error) {
            return this.handleConnectionFailure(error, options);
        }
    }
    /**
     * Handle connection failures with retry logic and specific error messages
     */
    async handleConnectionFailure(error, options) {
        // Check if this is an authentication error (don't retry these)
        if (this.isAuthenticationError(error)) {
            const authMsg = error?.message ?? '';
            console.error(chalk.red('Authentication failed:'), authMsg);
            this.provideAuthenticationGuidance(error);
            this.isConnected = false;
            return false;
        }
        this.retryAttempts++;
        if (this.retryAttempts >= this.maxRetries) {
            console.error(chalk.red(`Failed to connect after ${this.maxRetries} attempts`));
            this.provideNetworkTroubleshootingGuidance(error);
            this.isConnected = false;
            return false;
        }
        // For network errors, retry with exponential backoff
        const delay = await this.exponentialBackoff(this.retryAttempts);
        console.log(chalk.yellow(`Network error, retrying in ${delay}ms... (${this.retryAttempts}/${this.maxRetries})`));
        const message = error?.message ?? String(error);
        console.log(chalk.gray(`Error: ${message}`));
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connectWithRetry(options);
    }
    /**
     * Check if error is authentication-related
     */
    isAuthenticationError(error) {
        const errorMessage = error?.message?.toLowerCase() || '';
        return errorMessage.includes('authentication_required') ||
            errorMessage.includes('authentication_invalid') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('invalid token') ||
            errorMessage.includes('token is invalid') ||
            errorMessage.includes('401') ||
            errorMessage.includes('403') ||
            ((error.response?.status ?? 0) >= 401 &&
                (error.response?.status ?? 0) <= 403);
    }
    /**
     * Provide authentication-specific guidance
     */
    provideAuthenticationGuidance(error) {
        console.log(chalk.yellow('\n🔐 Authentication Issue Detected:'));
        const msg = error?.message ?? '';
        if (msg.includes('AUTHENTICATION_REQUIRED')) {
            console.log(chalk.cyan('• No credentials found. Run: lanonasis auth login'));
            console.log(chalk.cyan('• Or set vendor key: lanonasis auth login --vendor-key pk_xxx.sk_xxx'));
        }
        else if (msg.includes('AUTHENTICATION_INVALID')) {
            console.log(chalk.cyan('• Invalid credentials. Check your vendor key format'));
            console.log(chalk.cyan('• Expected format: pk_xxx.sk_xxx'));
            console.log(chalk.cyan('• Try: lanonasis auth logout && lanonasis auth login'));
        }
        else if (msg.includes('expired')) {
            console.log(chalk.cyan('• Token expired. Re-authenticate: lanonasis auth login'));
            console.log(chalk.cyan('• Or refresh: lanonasis auth refresh (if available)'));
        }
        else {
            console.log(chalk.cyan('• Check authentication status: lanonasis auth status'));
            console.log(chalk.cyan('• Re-authenticate: lanonasis auth login'));
            console.log(chalk.cyan('• Verify vendor key: lanonasis auth login --vendor-key pk_xxx.sk_xxx'));
        }
    }
    /**
     * Provide network troubleshooting guidance
     */
    provideNetworkTroubleshootingGuidance(_error) {
        console.log(chalk.yellow('\n🌐 Network Issue Detected:'));
        const msg = _error?.message ?? '';
        if (msg.includes('ECONNREFUSED') || msg.includes('connect ECONNREFUSED')) {
            console.log(chalk.cyan('• Connection refused. Service may be down:'));
            console.log(chalk.cyan('  - For remote: Check https://mcp.lanonasis.com/health'));
            console.log(chalk.cyan('  - For WebSocket: Check wss://mcp.lanonasis.com/ws'));
            console.log(chalk.cyan('  - For local: Install local MCP server'));
        }
        else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
            console.log(chalk.cyan('• Connection timeout. Check network:'));
            console.log(chalk.cyan('  - Verify internet connectivity'));
            console.log(chalk.cyan('  - Check firewall settings'));
            console.log(chalk.cyan('  - Try different connection mode: --mode remote'));
        }
        else if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
            console.log(chalk.cyan('• DNS resolution failed:'));
            console.log(chalk.cyan('  - Check DNS settings'));
            console.log(chalk.cyan('  - Verify server URL is correct'));
            console.log(chalk.cyan('  - Try using IP address instead of hostname'));
        }
        else if (msg.includes('certificate') || msg.includes('SSL') || msg.includes('TLS')) {
            console.log(chalk.cyan('• SSL/TLS certificate issue:'));
            console.log(chalk.cyan('  - Check system time and date'));
            console.log(chalk.cyan('  - Update CA certificates'));
            console.log(chalk.cyan('  - Try different connection mode'));
        }
        else {
            console.log(chalk.cyan('• General network error:'));
            console.log(chalk.cyan('  - Check server status'));
            console.log(chalk.cyan('  - Verify network connectivity'));
            console.log(chalk.cyan('  - Try: lanonasis mcp diagnose (when available)'));
        }
    }
    /**
     * Calculate exponential backoff delay with jitter
     */
    async exponentialBackoff(attempt) {
        // Base delay of 1 second, exponentially increasing
        const baseDelay = 1000;
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        // Cap at 10 seconds maximum
        const cappedDelay = Math.min(exponentialDelay, 10000);
        // Add jitter (±25% randomization) to avoid thundering herd
        const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
        return Math.round(cappedDelay + jitter);
    }
    /**
     * Validate authentication credentials before attempting MCP connection
     */
    async validateAuthBeforeConnect() {
        const token = this.config.get('token');
        const vendorKey = this.config.get('vendorKey');
        // Check if we have any authentication credentials
        if (!token && !vendorKey) {
            throw new Error('AUTHENTICATION_REQUIRED: No authentication credentials found. Run "lanonasis auth login" first.');
        }
        // If we have a token, check if it's expired or needs refresh
        if (token) {
            try {
                await this.validateAndRefreshToken(token);
            }
            catch (error) {
                throw new Error(`AUTHENTICATION_INVALID: ${error instanceof Error ? error.message : 'Token validation failed'}`);
            }
        }
        // If we have a vendor key, validate its format
        if (vendorKey && !token) {
            if (!this.validateVendorKeyFormat(vendorKey)) {
                throw new Error('AUTHENTICATION_INVALID: Invalid vendor key format. Expected format: pk_xxx.sk_xxx');
            }
        }
    }
    /**
     * Validate vendor key format
     */
    validateVendorKeyFormat(vendorKey) {
        // Vendor key should be in format: pk_xxx.sk_xxx
        const vendorKeyPattern = /^pk_[a-zA-Z0-9]+\.sk_[a-zA-Z0-9]+$/;
        return vendorKeyPattern.test(vendorKey);
    }
    /**
     * Validate and refresh token if needed
     */
    async validateAndRefreshToken(token) {
        try {
            // Try to decode the JWT token to check expiration
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                const currentTime = Math.floor(Date.now() / 1000);
                // Check if token is expired or expires within 5 minutes
                if (payload.exp && payload.exp < currentTime + 300) {
                    console.log(chalk.yellow('Token is expired or expiring soon, attempting refresh...'));
                    await this.refreshTokenIfNeeded();
                }
            }
        }
        catch {
            // If we can't decode the token, try to validate it with the server
            await this.validateTokenWithServer(token);
        }
    }
    /**
     * Refresh token if needed
     */
    async refreshTokenIfNeeded() {
        const refreshToken = this.config.get('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available. Please re-authenticate.');
        }
        try {
            const axios = (await import('axios')).default;
            const authUrl = this.config.get('authUrl') ?? 'https://api.lanonasis.com';
            const response = await axios.post(`${authUrl}/auth/refresh`, {
                refresh_token: refreshToken
            }, {
                timeout: 10000
            });
            if (response.data.access_token) {
                await this.config.setAndSave('token', response.data.access_token);
                console.log(chalk.green('✓ Token refreshed successfully'));
            }
        }
        catch {
            throw new Error('Failed to refresh token. Please re-authenticate.');
        }
    }
    /**
     * Validate token with server
     */
    async validateTokenWithServer(token) {
        try {
            const axios = (await import('axios')).default;
            const authUrl = this.config.get('authUrl') ?? 'https://api.lanonasis.com';
            await axios.get(`${authUrl}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-api-key': String(token)
                },
                timeout: 10000
            });
        }
        catch (error) {
            const status = error.response?.status;
            if (status === 401 || status === 403) {
                throw new Error('Token is invalid or expired. Please re-authenticate.');
            }
            const msg = error?.message || 'Unknown error';
            throw new Error(`Token validation failed: ${msg}`);
        }
    }
    /**
     * Initialize SSE connection for real-time updates
     */
    async initializeSSE(serverUrl) {
        // Use the proper SSE endpoint from config
        const sseUrl = this.config.getMCPSSEUrl() ?? `${serverUrl}/events`;
        const token = this.config.get('token');
        if (token) {
            // EventSource doesn't support headers directly, append token to URL
            this.sseConnection = new EventSource(`${sseUrl}?token=${encodeURIComponent(token)}`);
            this.sseConnection.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log(chalk.blue('📡 Real-time update:'), data.type);
                }
                catch {
                    // Ignore parse errors
                }
            };
            this.sseConnection.onerror = () => {
                console.error(chalk.yellow('⚠️  SSE connection error (will retry)'));
            };
        }
    }
    /**
     * Initialize WebSocket connection for enterprise MCP server
     */
    async initializeWebSocket(wsUrl) {
        const token = this.config.get('token');
        if (!token) {
            throw new Error('API key required for WebSocket mode. Set LANONASIS_API_KEY or login first.');
        }
        return new Promise((resolve, reject) => {
            try {
                // Close existing connection if any
                if (this.wsConnection) {
                    this.wsConnection.close();
                    this.wsConnection = null;
                }
                // Create new WebSocket connection with authentication
                this.wsConnection = new WebSocket(wsUrl, [], {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-API-Key': token
                    }
                });
                this.wsConnection.on('open', () => {
                    console.log(chalk.green('✅ Connected to MCP WebSocket server'));
                    // Send initialization message
                    this.sendWebSocketMessage({
                        id: 1,
                        method: 'initialize',
                        params: {
                            protocolVersion: '2024-11-05',
                            capabilities: {
                                tools: ['memory_management', 'workflow_orchestration']
                            },
                            clientInfo: {
                                name: '@lanonasis/cli',
                                version: '1.1.0'
                            }
                        }
                    });
                    resolve();
                });
                this.wsConnection.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        console.log(chalk.blue('📡 MCP message:'), message.id, message.method || 'response');
                    }
                    catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                });
                this.wsConnection.on('error', (error) => {
                    console.error(chalk.red('WebSocket error:'), error);
                    reject(error);
                });
                this.wsConnection.on('close', (code, reason) => {
                    console.log(chalk.yellow(`WebSocket connection closed (${code}): ${reason}`));
                    // Auto-reconnect after delay
                    setTimeout(() => {
                        if (this.isConnected) {
                            console.log(chalk.blue('🔄 Attempting to reconnect to WebSocket...'));
                            this.initializeWebSocket(wsUrl).catch(err => {
                                console.error('Failed to reconnect:', err);
                            });
                        }
                    }, 5000);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Send a message over the WebSocket connection
     */
    sendWebSocketMessage(message) {
        if (!this.wsConnection) {
            throw new Error('WebSocket not connected');
        }
        this.wsConnection.send(JSON.stringify(message));
    }
    /**
     * Start health monitoring for the connection
     */
    startHealthMonitoring() {
        // Clear any existing health check interval
        this.stopHealthMonitoring();
        // Start health monitoring every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 30000);
        // Perform initial health check
        setTimeout(() => this.performHealthCheck(), 5000);
    }
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    /**
     * Perform a health check on the current connection
     */
    async performHealthCheck() {
        if (!this.isConnected) {
            return;
        }
        try {
            this.lastHealthCheck = new Date();
            const connectionMode = this.activeConnectionMode || 'remote';
            switch (connectionMode) {
                case 'websocket':
                    await this.checkWebSocketHealth();
                    break;
                case 'remote':
                    await this.checkRemoteHealth();
                    break;
                default:
                    await this.checkLocalHealth();
                    break;
            }
        }
        catch {
            const connectionMode = this.activeConnectionMode || 'remote';
            console.log(chalk.yellow(`⚠️  ${connectionMode} connection health check failed, attempting reconnection...`));
            await this.handleHealthCheckFailure();
        }
    }
    /**
     * Check WebSocket connection health
     */
    async checkWebSocketHealth() {
        if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket connection not open');
        }
        // Send a ping message to check connectivity
        this.sendWebSocketMessage({
            id: Date.now(),
            method: 'ping',
            params: {}
        });
    }
    /**
     * Check remote connection health
     */
    async checkRemoteHealth() {
        const apiUrl = this.config.getMCPRestUrl() ?? 'https://mcp.lanonasis.com/api/v1';
        const token = this.config.get('token');
        if (!token) {
            throw new Error('No authentication token available');
        }
        try {
            const axios = (await import('axios')).default;
            await axios.get(`${apiUrl}/health`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-api-key': String(token)
                },
                timeout: 5000
            });
        }
        catch (e) {
            const msg = e?.message ?? String(e);
            throw new Error(`Remote health check failed: ${msg}`);
        }
    }
    /**
     * Check local connection health
     */
    async checkLocalHealth() {
        if (!this.client) {
            throw new Error('Local MCP client not initialized');
        }
        // Try to list tools as a health check
        try {
            await this.client.listTools();
        }
        catch (e) {
            const msg = e?.message ?? String(e);
            throw new Error(`Local health check failed: ${msg}`);
        }
    }
    /**
     * Handle health check failure by attempting reconnection
     */
    async handleHealthCheckFailure() {
        this.isConnected = false;
        this.stopHealthMonitoring();
        // Attempt to reconnect with current configuration
        const connectionMode = (this.activeConnectionMode || 'remote');
        const options = {
            connectionMode
        };
        console.log(chalk.yellow(`↻ Attempting reconnection using ${connectionMode} mode...`));
        // Add specific URLs if available
        if (connectionMode === 'websocket') {
            options.serverUrl = this.config.get('mcpWebSocketUrl');
        }
        else if (connectionMode === 'remote') {
            options.serverUrl = this.config.get('mcpServerUrl');
        }
        else {
            options.serverPath = this.config.get('mcpServerPath');
        }
        // Attempt reconnection
        const reconnected = await this.connect(options);
        if (reconnected) {
            console.log(chalk.green('✓ Reconnected to MCP server'));
        }
        else {
            console.log(chalk.red('✗ Failed to reconnect to MCP server'));
        }
    }
    /**
     * Disconnect from MCP server
     */
    async disconnect() {
        this.stopHealthMonitoring();
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
        if (this.sseConnection) {
            this.sseConnection.close();
            this.sseConnection = null;
        }
        if (this.wsConnection) {
            this.wsConnection.close();
            this.wsConnection = null;
        }
        this.isConnected = false;
        this.activeConnectionMode = 'websocket'; // Reset to default
    }
    /**
     * Call an MCP tool
     */
    async callTool(toolName, args) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server. Run "lanonasis mcp connect" first.');
        }
        const useRemote = this.config.get('mcpUseRemote') ?? false;
        if (useRemote) {
            // Remote MCP calls are translated to REST API calls
            return await this.callRemoteTool(toolName, args);
        }
        else {
            // Local MCP server call
            if (!this.client) {
                throw new Error('MCP client not initialized');
            }
            try {
                const result = await this.client.callTool({
                    name: toolName,
                    arguments: args
                });
                // Convert the SDK result to our expected MCPToolResponse format
                return {
                    result: result,
                    code: 200,
                    message: 'Success'
                };
            }
            catch (error) {
                throw new Error(`MCP tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    /**
     * Call remote tool via REST API with MCP interface
     */
    async callRemoteTool(toolName, args) {
        const apiUrl = this.config.getMCPRestUrl() ?? 'https://mcp.lanonasis.com/api/v1';
        const token = this.config.get('token');
        if (!token) {
            throw new Error('Authentication required. Run "lanonasis auth login" first.');
        }
        // Map MCP tool names to REST API endpoints
        const toolMappings = {
            'memory_create_memory': {
                method: 'POST',
                endpoint: '/memory',
                transform: (args) => args
            },
            'memory_search_memories': {
                method: 'POST',
                endpoint: '/memory/search',
                transform: (args) => args
            },
            'memory_get_memory': {
                method: 'GET',
                endpoint: '/memory/{id}',
                transform: () => undefined
            },
            'memory_update_memory': {
                method: 'PUT',
                endpoint: '/memory/{id}',
                transform: (args) => {
                    const data = { ...args };
                    delete data.memory_id;
                    return data;
                }
            },
            'memory_delete_memory': {
                method: 'DELETE',
                endpoint: '/memory/{id}',
                transform: () => undefined
            },
            'memory_list_memories': {
                method: 'GET',
                endpoint: '/memory',
                transform: (args) => args
            }
        };
        const mapping = toolMappings[toolName];
        if (!mapping) {
            throw new Error(`Unknown tool: ${toolName}`);
        }
        try {
            const axios = (await import('axios')).default;
            // Handle dynamic endpoint for memory operations that need ID
            let endpoint = mapping.endpoint;
            if (endpoint.includes('{id}') && args.memory_id) {
                // Ensure memory_id is treated as a string for replacement
                endpoint = endpoint.replace('{id}', String(args.memory_id));
            }
            const response = await axios({
                method: mapping.method,
                url: `${apiUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-api-key': String(token),
                    'Content-Type': 'application/json'
                },
                data: mapping.transform ? mapping.transform(args) : undefined,
                params: mapping.method === 'GET' ? args : undefined
            });
            return response.data;
        }
        catch (error) {
            // Safely handle errors with type checking
            const errorObj = error;
            const errorMsg = errorObj.response?.data?.error || (errorObj.message ?? 'Unknown error');
            throw new Error(`Remote tool call failed: ${errorMsg}`);
        }
    }
    /**
     * List available tools
     */
    async listTools() {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }
        const useRemote = this.config.get('mcpUseRemote') ?? false;
        if (useRemote) {
            // Return hardcoded list for remote mode
            return [
                { name: 'memory_create_memory', description: 'Create a new memory entry' },
                { name: 'memory_search_memories', description: 'Search memories using semantic search' },
                { name: 'memory_get_memory', description: 'Get a specific memory by ID' },
                { name: 'memory_update_memory', description: 'Update an existing memory' },
                { name: 'memory_delete_memory', description: 'Delete a memory' },
                { name: 'memory_list_memories', description: 'List all memories with pagination' }
            ];
        }
        else {
            if (!this.client) {
                throw new Error('MCP client not initialized');
            }
            const tools = await this.client.listTools();
            return tools.tools.map(tool => ({
                name: tool.name,
                description: tool.description || 'No description available'
            }));
        }
    }
    /**
     * Check if connected to MCP server
     */
    isConnectedToServer() {
        return this.isConnected;
    }
    /**
     * Get connection status details with health information
     */
    getConnectionStatus() {
        const connectionMode = this.activeConnectionMode;
        let server;
        switch (connectionMode) {
            case 'websocket':
                server = this.config.get('mcpWebSocketUrl') ?? 'wss://mcp.lanonasis.com/ws';
                break;
            case 'remote':
                server = this.config.get('mcpServerUrl') ?? 'https://mcp.lanonasis.com/api/v1';
                break;
            default:
                server = this.config.get('mcpServerPath') ?? 'local MCP server';
                break;
        }
        const connectionUptime = this.connectionStartTime > 0
            ? Date.now() - this.connectionStartTime
            : undefined;
        return {
            connected: this.isConnected,
            mode: connectionMode,
            server,
            lastHealthCheck: this.lastHealthCheck ?? undefined,
            connectionUptime,
            failureCount: this.retryAttempts
        };
    }
}
// Singleton instance
let mcpClientInstance = null;
export function getMCPClient() {
    if (!mcpClientInstance) {
        mcpClientInstance = new MCPClient();
    }
    return mcpClientInstance;
}
