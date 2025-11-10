"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpCommands = mcpCommands;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const table_1 = require("table");
const mcp_client_js_1 = require("../utils/mcp-client.js");
const enhanced_client_js_1 = require("../mcp/client/enhanced-client.js");
const config_js_1 = require("../utils/config.js");
const ws_1 = __importDefault(require("ws"));
function mcpCommands(program) {
    const mcp = program
        .command('mcp')
        .description('MCP (Model Context Protocol) server operations');
    // Also register mcp-server command directly on program for convenience
    const mcpServer = program
        .command('mcp-server')
        .description('MCP server initialization and management');
    mcpServer.command('init')
        .description('Initialize MCP server configuration')
        .action(async () => {
        console.log(chalk_1.default.cyan('🚀 Initializing MCP Server Configuration'));
        console.log('');
        const config = new config_js_1.CLIConfig();
        const isAuthenticated = !!config.get('token');
        if (isAuthenticated) {
            console.log(chalk_1.default.green('✓ Authenticated - Using remote MCP mode'));
            console.log('  Your memory operations will use mcp.lanonasis.com');
            console.log('  with real-time SSE updates enabled');
        }
        else {
            console.log(chalk_1.default.yellow('⚠️  Not authenticated - Using local MCP mode'));
            console.log('  Run "lanonasis auth login" to enable remote mode');
        }
        console.log('');
        console.log(chalk_1.default.cyan('Available MCP Commands:'));
        console.log('  lanonasis mcp connect       # Auto-connect to best mode');
        console.log('  lanonasis mcp connect -r    # Force remote mode');
        console.log('  lanonasis mcp connect -l    # Force local mode');
        console.log('  lanonasis mcp status        # Check connection status');
        console.log('  lanonasis mcp tools         # List available tools');
        console.log('');
        console.log(chalk_1.default.cyan('Memory operations are MCP-powered by default!'));
        // Auto-connect to MCP
        const spinner = (0, ora_1.default)('Auto-connecting to MCP...').start();
        try {
            const client = (0, mcp_client_js_1.getMCPClient)();
            const connected = await client.connect({ useRemote: isAuthenticated });
            if (connected) {
                spinner.succeed(chalk_1.default.green(`Connected to ${isAuthenticated ? 'remote' : 'local'} MCP server`));
                process.exit(0);
            }
            else {
                spinner.fail('Failed to auto-connect to MCP');
                process.exit(1);
            }
        }
        catch {
            spinner.fail('MCP auto-connect failed');
        }
        process.exit(1);
    });
    // Connect command
    mcp.command('connect')
        .description('Connect to MCP server (local, remote, or WebSocket)')
        .option('-l, --local', 'Connect to local MCP server')
        .option('-r, --remote', 'Connect to remote MCP server (mcp.lanonasis.com)')
        .option('-w, --websocket', 'Connect using WebSocket mode for enterprise users')
        .option('-s, --server <path>', 'Local MCP server path')
        .option('-u, --url <url>', 'Remote/WebSocket server URL')
        .option('--local-args <args>', 'Extra args for local server (e.g., "--stdio --port 3001")')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Connecting to MCP server...').start();
        const config = new config_js_1.CLIConfig();
        try {
            let connectionMode;
            // Determine connection mode - WebSocket takes precedence over remote and local
            if (options.websocket) {
                connectionMode = 'websocket';
            }
            else if (options.remote) {
                connectionMode = 'remote';
            }
            else if (options.local) {
                connectionMode = 'local';
            }
            else {
                // Default to remote if authenticated, otherwise local
                connectionMode = config.get('token') ? 'remote' : 'local';
            }
            // Save preferences
            config.set('mcpConnectionMode', connectionMode);
            if (options.server) {
                config.set('mcpServerPath', options.server);
            }
            if (options.url) {
                if (connectionMode === 'websocket') {
                    config.set('mcpWebSocketUrl', options.url);
                }
                else {
                    config.set('mcpServerUrl', options.url);
                }
            }
            let connected = false;
            // Use Enhanced MCP Client for better connection handling
            const enhancedClient = new enhanced_client_js_1.EnhancedMCPClient();
            if (options.url) {
                // Connect to specific URL (WebSocket or remote)
                const serverConfig = {
                    name: 'user-specified',
                    type: (options.url.startsWith('wss://') ? 'websocket' : 'stdio'),
                    url: options.url,
                    priority: 1
                };
                connected = await enhancedClient.connectSingle(serverConfig);
                if (connected) {
                    spinner.succeed(chalk_1.default.green(`Connected to MCP server at ${options.url}`));
                    process.exit(0);
                    return;
                }
            }
            else {
                // Fall back to old client for local connections
                const client = (0, mcp_client_js_1.getMCPClient)();
                const localArgs = typeof options.localArgs === 'string' && options.localArgs.trim().length > 0
                    ? options.localArgs.split(' ').map((s) => s.trim()).filter(Boolean)
                    : undefined;
                connected = await client.connect({
                    connectionMode,
                    serverPath: options.server,
                    serverUrl: options.url,
                    localArgs
                });
            }
            if (connected) {
                spinner.succeed(chalk_1.default.green(`Connected to MCP server in ${connectionMode} mode`));
                process.exit(0);
                if (connectionMode === 'remote') {
                    console.log(chalk_1.default.cyan('ℹ️  Using remote MCP via mcp.lanonasis.com'));
                    console.log(chalk_1.default.cyan('📡 SSE endpoint active for real-time updates'));
                }
                else if (connectionMode === 'websocket') {
                    console.log(chalk_1.default.cyan('ℹ️  Using enterprise WebSocket MCP server'));
                    console.log(chalk_1.default.cyan('📡 WebSocket connection active with auto-reconnect'));
                }
            }
            else {
                spinner.fail('Failed to connect to MCP server');
            }
        }
        catch (error) {
            process.exit(1);
            spinner.fail(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    // Disconnect command
    mcp.command('disconnect')
        .description('Disconnect from MCP server')
        .action(async () => {
        const client = (0, mcp_client_js_1.getMCPClient)();
        await client.disconnect();
        console.log(chalk_1.default.green('✓ Disconnected from MCP server'));
    });
    // Status command
    mcp.command('status')
        .description('Show MCP connection status')
        .action(async () => {
        const client = (0, mcp_client_js_1.getMCPClient)();
        // Reload config from disk to get latest preference
        await client.init();
        const status = client.getConnectionStatus();
        console.log(chalk_1.default.cyan('\n📊 MCP Connection Status'));
        console.log(chalk_1.default.cyan('========================'));
        console.log(`Status: ${status.connected ? chalk_1.default.green('Connected') : chalk_1.default.red('Disconnected')}`);
        // Display mode with proper labels
        let modeDisplay;
        switch (status.mode) {
            case 'websocket':
                modeDisplay = chalk_1.default.blue('WebSocket');
                break;
            case 'remote':
                modeDisplay = chalk_1.default.blue('Remote (HTTP/SSE)');
                break;
            case 'local':
                modeDisplay = chalk_1.default.yellow('Local (stdio)');
                break;
            default:
                modeDisplay = chalk_1.default.gray(status.mode);
        }
        console.log(`Mode: ${modeDisplay}`);
        console.log(`Server: ${status.server}`);
        if (status.connected) {
            if (status.mode === 'remote') {
                console.log(`\n${chalk_1.default.cyan('Features:')}`);
                console.log('• Real-time updates via SSE');
                console.log('• Authenticated API access');
                console.log('• MCP-compatible tool interface');
            }
            else if (status.mode === 'websocket') {
                console.log(`\n${chalk_1.default.cyan('Features:')}`);
                console.log('• Bi-directional real-time communication');
                console.log('• Authenticated WebSocket connection');
                console.log('• Production-ready MCP server');
            }
        }
    });
    // List tools command
    mcp.command('tools')
        .description('List available MCP tools')
        .action(async () => {
        const spinner = (0, ora_1.default)('Fetching available tools...').start();
        try {
            const client = (0, mcp_client_js_1.getMCPClient)();
            if (!client.isConnectedToServer()) {
                spinner.info('Not connected. Attempting auto-connect...');
                const config = new config_js_1.CLIConfig();
                const useRemote = !!config.get('token');
                await client.connect({ useRemote });
            }
            const tools = await client.listTools();
            spinner.succeed('Tools fetched successfully');
            console.log(chalk_1.default.cyan('\n🔧 Available MCP Tools'));
            console.log(chalk_1.default.cyan('====================='));
            const tableData = [
                [chalk_1.default.bold('Tool Name'), chalk_1.default.bold('Description')]
            ];
            tools.forEach(tool => {
                tableData.push([
                    chalk_1.default.green(tool.name),
                    tool.description
                ]);
            });
            console.log((0, table_1.table)(tableData, {
                border: {
                    topBody: '─',
                    topJoin: '┬',
                    topLeft: '┌',
                    topRight: '┐',
                    bottomBody: '─',
                    bottomJoin: '┴',
                    bottomLeft: '└',
                    bottomRight: '┘',
                    bodyLeft: '│',
                    bodyRight: '│',
                    bodyJoin: '│',
                    joinBody: '─',
                    joinLeft: '├',
                    joinRight: '┤',
                    joinJoin: '┼'
                }
            }));
        }
        catch (error) {
            spinner.fail(`Failed to fetch tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    // Call tool command
    mcp.command('call')
        .description('Call an MCP tool directly')
        .argument('<tool>', 'Tool name to call')
        .option('-a, --args <json>', 'Tool arguments as JSON')
        .action(async (toolName, options) => {
        const spinner = (0, ora_1.default)(`Calling tool: ${toolName}...`).start();
        try {
            const client = (0, mcp_client_js_1.getMCPClient)();
            if (!client.isConnectedToServer()) {
                spinner.info('Not connected. Attempting auto-connect...');
                const config = new config_js_1.CLIConfig();
                const useRemote = !!config.get('token');
                await client.connect({ useRemote });
            }
            let args = {};
            if (options.args) {
                try {
                    args = JSON.parse(options.args);
                }
                catch {
                    spinner.fail('Invalid JSON arguments');
                    process.exit(1);
                }
            }
            const result = await client.callTool(toolName, args);
            spinner.succeed(`Tool ${toolName} executed successfully`);
            console.log(chalk_1.default.cyan('\n📤 Tool Result:'));
            console.log(JSON.stringify(result, null, 2));
        }
        catch (error) {
            spinner.fail(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    // Memory-specific MCP commands
    const memory = mcp.command('memory')
        .description('Memory operations via MCP');
    memory.command('create')
        .description('Create memory via MCP')
        .requiredOption('-t, --title <title>', 'Memory title')
        .requiredOption('-c, --content <content>', 'Memory content')
        .option('-T, --type <type>', 'Memory type', 'context')
        .option('--tags <tags>', 'Comma-separated tags')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Creating memory via MCP...').start();
        try {
            const client = (0, mcp_client_js_1.getMCPClient)();
            if (!client.isConnectedToServer()) {
                spinner.info('Not connected. Attempting auto-connect...');
                const config = new config_js_1.CLIConfig();
                const useRemote = !!config.get('token');
                await client.connect({ useRemote });
            }
            const result = await client.callTool('memory_create_memory', {
                title: options.title,
                content: options.content,
                memory_type: options.type,
                tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : []
            });
            spinner.succeed('Memory created successfully');
            console.log(chalk_1.default.green('\n✓ Memory created'));
            console.log(`ID: ${chalk_1.default.cyan(result.id)}`);
            console.log(`Title: ${result.title}`);
            console.log(`Type: ${result.memory_type}`);
        }
        catch (error) {
            spinner.fail(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    memory.command('search')
        .description('Search memories via MCP')
        .argument('<query>', 'Search query')
        .option('-l, --limit <number>', 'Maximum results', '10')
        .option('-t, --threshold <number>', 'Similarity threshold (0-1)', '0.7')
        .action(async (query, options) => {
        const spinner = (0, ora_1.default)('Searching memories via MCP...').start();
        try {
            const client = (0, mcp_client_js_1.getMCPClient)();
            if (!client.isConnectedToServer()) {
                spinner.info('Not connected. Attempting auto-connect...');
                const config = new config_js_1.CLIConfig();
                const useRemote = !!config.get('token');
                await client.connect({ useRemote });
            }
            const results = await client.callTool('memory_search_memories', {
                query,
                limit: parseInt(options.limit),
                threshold: parseFloat(options.threshold)
            });
            spinner.succeed(`Found ${results.length} memories`);
            if (results.length === 0) {
                console.log(chalk_1.default.yellow('\nNo memories found matching your query'));
                return;
            }
            console.log(chalk_1.default.cyan('\n🔍 Search Results:'));
            results.forEach((memory, index) => {
                console.log(`\n${chalk_1.default.bold(`${index + 1}. ${memory.title}`)}`);
                console.log(`   ID: ${chalk_1.default.gray(memory.id)}`);
                console.log(`   Type: ${chalk_1.default.blue(memory.memory_type)}`);
                console.log(`   Score: ${chalk_1.default.green((memory.relevance_score * 100).toFixed(1) + '%')}`);
                console.log(`   Content: ${memory.content.substring(0, 100)}...`);
            });
        }
        catch (error) {
            spinner.fail(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    // Configure MCP preferences
    mcp.command('config')
        .description('Configure MCP preferences')
        .option('--prefer-remote', 'Prefer remote MCP server when available')
        .option('--prefer-local', 'Prefer local MCP server')
        .option('--auto', 'Auto-detect best connection mode')
        .action(async (options) => {
        const config = new config_js_1.CLIConfig();
        if (options.preferRemote) {
            await config.setAndSave('mcpPreference', 'remote');
            console.log(chalk_1.default.green('✓ Set MCP preference to remote'));
        }
        else if (options.preferLocal) {
            await config.setAndSave('mcpPreference', 'local');
            console.log(chalk_1.default.green('✓ Set MCP preference to local'));
        }
        else if (options.auto) {
            await config.setAndSave('mcpPreference', 'auto');
            console.log(chalk_1.default.green('✓ Set MCP preference to auto-detect'));
        }
        else {
            const current = config.get('mcpPreference') || 'auto';
            console.log(`Current MCP preference: ${chalk_1.default.cyan(current)}`);
            console.log('\nOptions:');
            console.log('  --prefer-remote : Use remote MCP server (mcp.lanonasis.com)');
            console.log('  --prefer-local  : Use local MCP server');
            console.log('  --auto          : Auto-detect based on authentication');
        }
    });
    // Diagnose MCP connection issues
    mcp.command('diagnose')
        .description('Diagnose MCP connection issues')
        .option('-v, --verbose', 'show detailed diagnostic information')
        .action(async (options) => {
        const config = new config_js_1.CLIConfig();
        await config.init();
        console.log(chalk_1.default.blue.bold('🔍 MCP Connection Diagnostic'));
        console.log(chalk_1.default.cyan('━'.repeat(50)));
        console.log();
        const diagnostics = {
            authenticationValid: false,
            endpointsReachable: false,
            transportTests: {
                websocket: false,
                http: false,
                sse: false
            },
            connectionLatency: {},
            currentConnection: null,
            toolsAvailable: false,
            healthCheckPassing: false
        };
        // Step 1: Check authentication status
        console.log(chalk_1.default.cyan('1. Authentication Status'));
        const token = config.getToken();
        const vendorKey = config.getVendorKey();
        if (!token && !vendorKey) {
            console.log(chalk_1.default.red('   ✖ No authentication credentials found'));
            console.log(chalk_1.default.gray('   → Run: lanonasis auth login'));
            console.log(chalk_1.default.gray('   → MCP requires authentication for remote access'));
        }
        else {
            try {
                const isValid = await config.validateStoredCredentials();
                diagnostics.authenticationValid = isValid;
                if (isValid) {
                    console.log(chalk_1.default.green('   ✓ Authentication credentials are valid'));
                }
                else {
                    console.log(chalk_1.default.red('   ✖ Authentication credentials are invalid'));
                    console.log(chalk_1.default.gray('   → Run: lanonasis auth login'));
                }
            }
            catch (error) {
                console.log(chalk_1.default.yellow('   ⚠ Could not validate authentication'));
                console.log(chalk_1.default.gray(`     ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        }
        // Step 2: Test endpoint availability
        console.log(chalk_1.default.cyan('\n2. Endpoint Availability'));
        const spinner1 = (0, ora_1.default)('Testing MCP endpoints...').start();
        try {
            await config.discoverServices(options.verbose);
            const services = config.get('discoveredServices');
            if (services) {
                spinner1.succeed('MCP endpoints discovered');
                diagnostics.endpointsReachable = true;
                console.log(chalk_1.default.green('   ✓ Service discovery successful'));
                if (options.verbose) {
                    const svc = services;
                    console.log(chalk_1.default.gray(`     HTTP: ${svc.mcp_base}`));
                    console.log(chalk_1.default.gray(`     WebSocket: ${svc.mcp_ws_base}`));
                    console.log(chalk_1.default.gray(`     SSE: ${svc.mcp_sse_base}`));
                }
            }
            else {
                spinner1.warn('Using fallback endpoints');
                console.log(chalk_1.default.yellow('   ⚠ Service discovery failed, using fallbacks'));
                diagnostics.endpointsReachable = true; // Fallbacks still work
            }
        }
        catch (error) {
            spinner1.fail('Endpoint discovery failed');
            console.log(chalk_1.default.red('   ✖ Cannot discover MCP endpoints'));
            console.log(chalk_1.default.gray(`     ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
        // Step 3: Test transport protocols
        console.log(chalk_1.default.cyan('\n3. Transport Protocol Tests'));
        // Test HTTP/REST endpoint
        if (diagnostics.authenticationValid) {
            const httpSpinner = (0, ora_1.default)('Testing HTTP transport...').start();
            try {
                const startTime = Date.now();
                const axios = (await import('axios')).default;
                const httpUrl = config.getMCPRestUrl();
                await axios.get(`${httpUrl}/health`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-api-key': String(token || vendorKey)
                    },
                    timeout: 10000
                });
                const latency = Date.now() - startTime;
                diagnostics.connectionLatency.http = latency;
                diagnostics.transportTests.http = true;
                httpSpinner.succeed(`HTTP transport working (${latency}ms)`);
                console.log(chalk_1.default.green(`   ✓ HTTP/REST endpoint reachable`));
            }
            catch (error) {
                httpSpinner.fail('HTTP transport failed');
                console.log(chalk_1.default.red('   ✖ HTTP/REST endpoint failed'));
                if (options.verbose) {
                    console.log(chalk_1.default.gray(`     Error: ${error instanceof Error ? error.message : String(error)}`));
                }
            }
            // Test WebSocket endpoint
            const wsSpinner = (0, ora_1.default)('Testing WebSocket transport...').start();
            try {
                const startTime = Date.now();
                const wsUrl = config.getMCPServerUrl();
                // Create a test WebSocket connection
                const ws = new ws_1.default(wsUrl, [], {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-API-Key': String(token || vendorKey)
                    }
                });
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        ws.close();
                        reject(new Error('WebSocket connection timeout'));
                    }, 10000);
                    ws.on('open', () => {
                        clearTimeout(timeout);
                        const latency = Date.now() - startTime;
                        diagnostics.connectionLatency.websocket = latency;
                        diagnostics.transportTests.websocket = true;
                        ws.close();
                        resolve(true);
                    });
                    ws.on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });
                wsSpinner.succeed(`WebSocket transport working (${diagnostics.connectionLatency.websocket}ms)`);
                console.log(chalk_1.default.green('   ✓ WebSocket endpoint reachable'));
            }
            catch (error) {
                wsSpinner.fail('WebSocket transport failed');
                console.log(chalk_1.default.red('   ✖ WebSocket endpoint failed'));
                if (options.verbose) {
                    console.log(chalk_1.default.gray(`     Error: ${error instanceof Error ? error.message : String(error)}`));
                }
            }
            // Test SSE endpoint
            const sseSpinner = (0, ora_1.default)('Testing SSE transport...').start();
            try {
                const startTime = Date.now();
                const sseUrl = config.getMCPSSEUrl();
                // Test SSE endpoint with a quick connection test
                const axios = (await import('axios')).default;
                await axios.get(sseUrl.replace('/events', '/health'), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-api-key': String(token || vendorKey)
                    },
                    timeout: 10000
                });
                const latency = Date.now() - startTime;
                diagnostics.connectionLatency.sse = latency;
                diagnostics.transportTests.sse = true;
                sseSpinner.succeed(`SSE transport working (${latency}ms)`);
                console.log(chalk_1.default.green('   ✓ SSE endpoint reachable'));
            }
            catch (error) {
                sseSpinner.fail('SSE transport failed');
                console.log(chalk_1.default.red('   ✖ SSE endpoint failed'));
                if (options.verbose) {
                    console.log(chalk_1.default.gray(`     Error: ${error instanceof Error ? error.message : String(error)}`));
                }
            }
        }
        else {
            console.log(chalk_1.default.gray('   - Skipped transport tests (authentication required)'));
        }
        // Step 4: Test current MCP connection
        console.log(chalk_1.default.cyan('\n4. Current MCP Connection'));
        const client = (0, mcp_client_js_1.getMCPClient)();
        diagnostics.currentConnection = client.getConnectionStatus();
        if (diagnostics.currentConnection.connected) {
            console.log(chalk_1.default.green('   ✓ MCP client is connected'));
            console.log(chalk_1.default.gray(`     Mode: ${diagnostics.currentConnection.mode}`));
            console.log(chalk_1.default.gray(`     Server: ${diagnostics.currentConnection.server}`));
            if (diagnostics.currentConnection.connectionUptime) {
                const uptimeSeconds = Math.floor(diagnostics.currentConnection.connectionUptime / 1000);
                console.log(chalk_1.default.gray(`     Uptime: ${uptimeSeconds}s`));
            }
            if (diagnostics.currentConnection.lastHealthCheck) {
                const healthCheckAge = Date.now() - diagnostics.currentConnection.lastHealthCheck.getTime();
                console.log(chalk_1.default.gray(`     Last health check: ${Math.floor(healthCheckAge / 1000)}s ago`));
            }
        }
        else {
            console.log(chalk_1.default.red('   ✖ MCP client is not connected'));
            console.log(chalk_1.default.gray('   → Try: lanonasis mcp connect'));
        }
        // Step 5: Test tool availability
        console.log(chalk_1.default.cyan('\n5. Tool Availability'));
        if (diagnostics.currentConnection.connected) {
            const toolSpinner = (0, ora_1.default)('Testing MCP tools...').start();
            try {
                const tools = await client.listTools();
                diagnostics.toolsAvailable = tools.length > 0;
                toolSpinner.succeed(`Found ${tools.length} available tools`);
                console.log(chalk_1.default.green(`   ✓ ${tools.length} MCP tools available`));
                if (options.verbose && tools.length > 0) {
                    console.log(chalk_1.default.gray('     Available tools:'));
                    tools.slice(0, 5).forEach(tool => {
                        console.log(chalk_1.default.gray(`       • ${tool.name}`));
                    });
                    if (tools.length > 5) {
                        console.log(chalk_1.default.gray(`       ... and ${tools.length - 5} more`));
                    }
                }
            }
            catch (error) {
                toolSpinner.fail('Tool listing failed');
                console.log(chalk_1.default.red('   ✖ Cannot list MCP tools'));
                if (options.verbose) {
                    console.log(chalk_1.default.gray(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            }
        }
        else {
            console.log(chalk_1.default.gray('   - Skipped (not connected to MCP server)'));
        }
        // Step 6: Connection quality measurement
        console.log(chalk_1.default.cyan('\n6. Connection Quality'));
        if (Object.keys(diagnostics.connectionLatency).length > 0) {
            console.log(chalk_1.default.green('   ✓ Latency measurements:'));
            Object.entries(diagnostics.connectionLatency).forEach(([transport, latency]) => {
                const quality = latency < 100 ? 'Excellent' : latency < 300 ? 'Good' : latency < 1000 ? 'Fair' : 'Poor';
                const color = latency < 100 ? chalk_1.default.green : latency < 300 ? chalk_1.default.yellow : chalk_1.default.red;
                console.log(color(`     ${transport.toUpperCase()}: ${latency}ms (${quality})`));
            });
        }
        else {
            console.log(chalk_1.default.gray('   - No latency measurements available'));
        }
        // Summary and recommendations
        console.log(chalk_1.default.blue.bold('\n📋 MCP Diagnostic Summary'));
        console.log(chalk_1.default.cyan('━'.repeat(50)));
        const issues = [];
        const recommendations = [];
        if (!diagnostics.authenticationValid) {
            issues.push('Authentication credentials are invalid or missing');
            recommendations.push('Run: lanonasis auth login');
        }
        if (!diagnostics.endpointsReachable) {
            issues.push('MCP endpoints are not reachable');
            recommendations.push('Check internet connection and firewall settings');
        }
        const workingTransports = Object.values(diagnostics.transportTests).filter(Boolean).length;
        if (workingTransports === 0 && diagnostics.authenticationValid) {
            issues.push('No transport protocols are working');
            recommendations.push('Check network connectivity to mcp.lanonasis.com');
        }
        else if (workingTransports < 3 && diagnostics.authenticationValid) {
            issues.push(`Only ${workingTransports}/3 transport protocols working`);
            recommendations.push('Some MCP features may be limited');
        }
        if (!diagnostics.currentConnection.connected) {
            issues.push('MCP client is not connected');
            recommendations.push('Run: lanonasis mcp connect');
        }
        if (!diagnostics.toolsAvailable && diagnostics.currentConnection.connected) {
            issues.push('No MCP tools are available');
            recommendations.push('Check MCP server configuration');
        }
        // Show results
        if (issues.length === 0) {
            console.log(chalk_1.default.green('✅ All MCP connection checks passed!'));
            console.log(chalk_1.default.cyan('   Your MCP connection is working correctly.'));
            if (Object.keys(diagnostics.connectionLatency).length > 0) {
                const avgLatency = Object.values(diagnostics.connectionLatency).reduce((a, b) => a + b, 0) / Object.values(diagnostics.connectionLatency).length;
                console.log(chalk_1.default.cyan(`   Average latency: ${Math.round(avgLatency)}ms`));
            }
        }
        else {
            console.log(chalk_1.default.red(`❌ Found ${issues.length} issue(s):`));
            issues.forEach(issue => {
                console.log(chalk_1.default.red(`   • ${issue}`));
            });
            console.log(chalk_1.default.yellow('\n💡 Recommended actions:'));
            recommendations.forEach(rec => {
                console.log(chalk_1.default.cyan(`   • ${rec}`));
            });
        }
        // Additional troubleshooting info
        if (issues.length > 0) {
            console.log(chalk_1.default.gray('\n🔧 Additional troubleshooting:'));
            console.log(chalk_1.default.gray('   • Try different connection modes: --mode websocket|remote|local'));
            console.log(chalk_1.default.gray('   • Check firewall settings for ports 80, 443, and WebSocket'));
            console.log(chalk_1.default.gray('   • Verify your network allows outbound HTTPS connections'));
            console.log(chalk_1.default.gray('   • Contact support if issues persist'));
        }
    });
}
