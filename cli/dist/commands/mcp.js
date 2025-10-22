import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { getMCPClient } from '../utils/mcp-client.js';
import { EnhancedMCPClient } from '../mcp/client/enhanced-client.js';
import { CLIConfig } from '../utils/config.js';
export function mcpCommands(program) {
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
        console.log(chalk.cyan('🚀 Initializing MCP Server Configuration'));
        console.log('');
        const config = new CLIConfig();
        const isAuthenticated = !!config.get('token');
        if (isAuthenticated) {
            console.log(chalk.green('✓ Authenticated - Using remote MCP mode'));
            console.log('  Your memory operations will use mcp.lanonasis.com');
            console.log('  with real-time SSE updates enabled');
        }
        else {
            console.log(chalk.yellow('⚠️  Not authenticated - Using local MCP mode'));
            console.log('  Run "lanonasis auth login" to enable remote mode');
        }
        console.log('');
        console.log(chalk.cyan('Available MCP Commands:'));
        console.log('  lanonasis mcp connect       # Auto-connect to best mode');
        console.log('  lanonasis mcp connect -r    # Force remote mode');
        console.log('  lanonasis mcp connect -l    # Force local mode');
        console.log('  lanonasis mcp status        # Check connection status');
        console.log('  lanonasis mcp tools         # List available tools');
        console.log('');
        console.log(chalk.cyan('Memory operations are MCP-powered by default!'));
        // Auto-connect to MCP
        const spinner = ora('Auto-connecting to MCP...').start();
        try {
            const client = getMCPClient();
            const connected = await client.connect({ useRemote: isAuthenticated });
            if (connected) {
                spinner.succeed(chalk.green(`Connected to ${isAuthenticated ? 'remote' : 'local'} MCP server`));
            }
            else {
                spinner.fail('Failed to auto-connect to MCP');
            }
        }
        catch {
            spinner.fail('MCP auto-connect failed');
        }
    });
    // Connect command
    mcp.command('connect')
        .description('Connect to MCP server (local, remote, or WebSocket)')
        .option('-l, --local', 'Connect to local MCP server')
        .option('-r, --remote', 'Connect to remote MCP server (mcp.lanonasis.com)')
        .option('-w, --websocket', 'Connect using WebSocket mode for enterprise users')
        .option('-s, --server <path>', 'Local MCP server path')
        .option('-u, --url <url>', 'Remote/WebSocket server URL')
        .action(async (options) => {
        const spinner = ora('Connecting to MCP server...').start();
        const config = new CLIConfig();
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
                connectionMode = !!config.get('token') ? 'remote' : 'local';
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
            const enhancedClient = new EnhancedMCPClient();
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
                    spinner.succeed(chalk.green(`Connected to MCP server at ${options.url}`));
                    return;
                }
            }
            else {
                // Fall back to old client for local connections
                const client = getMCPClient();
                connected = await client.connect({
                    connectionMode,
                    serverPath: options.server,
                    serverUrl: options.url
                });
            }
            if (connected) {
                spinner.succeed(chalk.green(`Connected to MCP server in ${connectionMode} mode`));
                if (connectionMode === 'remote') {
                    console.log(chalk.cyan('ℹ️  Using remote MCP via mcp.lanonasis.com'));
                    console.log(chalk.cyan('📡 SSE endpoint active for real-time updates'));
                }
                else if (connectionMode === 'websocket') {
                    console.log(chalk.cyan('ℹ️  Using enterprise WebSocket MCP server'));
                    console.log(chalk.cyan('📡 WebSocket connection active with auto-reconnect'));
                }
            }
            else {
                spinner.fail('Failed to connect to MCP server');
            }
        }
        catch (error) {
            spinner.fail(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    // Disconnect command
    mcp.command('disconnect')
        .description('Disconnect from MCP server')
        .action(async () => {
        const client = getMCPClient();
        await client.disconnect();
        console.log(chalk.green('✓ Disconnected from MCP server'));
    });
    // Status command
    mcp.command('status')
        .description('Show MCP connection status')
        .action(async () => {
        const client = getMCPClient();
        const status = client.getConnectionStatus();
        console.log(chalk.cyan('\n📊 MCP Connection Status'));
        console.log(chalk.cyan('========================'));
        console.log(`Status: ${status.connected ? chalk.green('Connected') : chalk.red('Disconnected')}`);
        console.log(`Mode: ${status.mode === 'remote' ? chalk.blue('Remote (API)') : chalk.yellow('Local')}`);
        console.log(`Server: ${status.server}`);
        if (status.connected && status.mode === 'remote') {
            console.log(`\n${chalk.cyan('Features:')}`);
            console.log('• Real-time updates via SSE');
            console.log('• Authenticated API access');
            console.log('• MCP-compatible tool interface');
        }
    });
    // List tools command
    mcp.command('tools')
        .description('List available MCP tools')
        .action(async () => {
        const spinner = ora('Fetching available tools...').start();
        try {
            const client = getMCPClient();
            if (!client.isConnectedToServer()) {
                spinner.info('Not connected. Attempting auto-connect...');
                const config = new CLIConfig();
                const useRemote = !!config.get('token');
                await client.connect({ useRemote });
            }
            const tools = await client.listTools();
            spinner.succeed('Tools fetched successfully');
            console.log(chalk.cyan('\n🔧 Available MCP Tools'));
            console.log(chalk.cyan('====================='));
            const tableData = [
                [chalk.bold('Tool Name'), chalk.bold('Description')]
            ];
            tools.forEach(tool => {
                tableData.push([
                    chalk.green(tool.name),
                    tool.description
                ]);
            });
            console.log(table(tableData, {
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
        const spinner = ora(`Calling tool: ${toolName}...`).start();
        try {
            const client = getMCPClient();
            if (!client.isConnectedToServer()) {
                spinner.info('Not connected. Attempting auto-connect...');
                const config = new CLIConfig();
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
            console.log(chalk.cyan('\n📤 Tool Result:'));
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
        const spinner = ora('Creating memory via MCP...').start();
        try {
            const client = getMCPClient();
            if (!client.isConnectedToServer()) {
                spinner.info('Not connected. Attempting auto-connect...');
                const config = new CLIConfig();
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
            console.log(chalk.green('\n✓ Memory created'));
            console.log(`ID: ${chalk.cyan(result.id)}`);
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
        const spinner = ora('Searching memories via MCP...').start();
        try {
            const client = getMCPClient();
            if (!client.isConnectedToServer()) {
                spinner.info('Not connected. Attempting auto-connect...');
                const config = new CLIConfig();
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
                console.log(chalk.yellow('\nNo memories found matching your query'));
                return;
            }
            console.log(chalk.cyan('\n🔍 Search Results:'));
            results.forEach((memory, index) => {
                console.log(`\n${chalk.bold(`${index + 1}. ${memory.title}`)}`);
                console.log(`   ID: ${chalk.gray(memory.id)}`);
                console.log(`   Type: ${chalk.blue(memory.memory_type)}`);
                console.log(`   Score: ${chalk.green((memory.relevance_score * 100).toFixed(1) + '%')}`);
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
        const config = new CLIConfig();
        if (options.preferRemote) {
            config.set('mcpPreference', 'remote');
            console.log(chalk.green('✓ Set MCP preference to remote'));
        }
        else if (options.preferLocal) {
            config.set('mcpPreference', 'local');
            console.log(chalk.green('✓ Set MCP preference to local'));
        }
        else if (options.auto) {
            config.set('mcpPreference', 'auto');
            console.log(chalk.green('✓ Set MCP preference to auto-detect'));
        }
        else {
            const current = config.get('mcpPreference') || 'auto';
            console.log(`Current MCP preference: ${chalk.cyan(current)}`);
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
        const config = new CLIConfig();
        await config.init();
        console.log(chalk.blue.bold('🔍 MCP Connection Diagnostic'));
        console.log(chalk.cyan('━'.repeat(50)));
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
        console.log(chalk.cyan('1. Authentication Status'));
        const token = config.getToken();
        const vendorKey = config.getVendorKey();
        if (!token && !vendorKey) {
            console.log(chalk.red('   ✖ No authentication credentials found'));
            console.log(chalk.gray('   → Run: lanonasis auth login'));
            console.log(chalk.gray('   → MCP requires authentication for remote access'));
        }
        else {
            try {
                const isValid = await config.validateStoredCredentials();
                diagnostics.authenticationValid = isValid;
                if (isValid) {
                    console.log(chalk.green('   ✓ Authentication credentials are valid'));
                }
                else {
                    console.log(chalk.red('   ✖ Authentication credentials are invalid'));
                    console.log(chalk.gray('   → Run: lanonasis auth login'));
                }
            }
            catch (error) {
                console.log(chalk.yellow('   ⚠ Could not validate authentication'));
                console.log(chalk.gray(`     ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        }
        // Step 2: Test endpoint availability
        console.log(chalk.cyan('\n2. Endpoint Availability'));
        const spinner1 = ora('Testing MCP endpoints...').start();
        try {
            await config.discoverServices(options.verbose);
            const services = config.get('discoveredServices');
            if (services) {
                spinner1.succeed('MCP endpoints discovered');
                diagnostics.endpointsReachable = true;
                console.log(chalk.green('   ✓ Service discovery successful'));
                if (options.verbose) {
                    console.log(chalk.gray(`     HTTP: ${services.mcp_base}`));
                    console.log(chalk.gray(`     WebSocket: ${services.mcp_ws_base}`));
                    console.log(chalk.gray(`     SSE: ${services.mcp_sse_base}`));
                }
            }
            else {
                spinner1.warn('Using fallback endpoints');
                console.log(chalk.yellow('   ⚠ Service discovery failed, using fallbacks'));
                diagnostics.endpointsReachable = true; // Fallbacks still work
            }
        }
        catch (error) {
            spinner1.fail('Endpoint discovery failed');
            console.log(chalk.red('   ✖ Cannot discover MCP endpoints'));
            console.log(chalk.gray(`     ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
        // Step 3: Test transport protocols
        console.log(chalk.cyan('\n3. Transport Protocol Tests'));
        // Test HTTP/REST endpoint
        if (diagnostics.authenticationValid) {
            const httpSpinner = ora('Testing HTTP transport...').start();
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
                console.log(chalk.green(`   ✓ HTTP/REST endpoint reachable`));
            }
            catch (error) {
                httpSpinner.fail('HTTP transport failed');
                console.log(chalk.red('   ✖ HTTP/REST endpoint failed'));
                if (options.verbose) {
                    console.log(chalk.gray(`     Error: ${error.message}`));
                }
            }
            // Test WebSocket endpoint
            const wsSpinner = ora('Testing WebSocket transport...').start();
            try {
                const startTime = Date.now();
                const wsUrl = config.getMCPServerUrl();
                // Create a test WebSocket connection
                const WebSocket = (await import('ws')).default;
                const ws = new WebSocket(wsUrl, [], {
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
                console.log(chalk.green('   ✓ WebSocket endpoint reachable'));
            }
            catch (error) {
                wsSpinner.fail('WebSocket transport failed');
                console.log(chalk.red('   ✖ WebSocket endpoint failed'));
                if (options.verbose) {
                    console.log(chalk.gray(`     Error: ${error.message}`));
                }
            }
            // Test SSE endpoint
            const sseSpinner = ora('Testing SSE transport...').start();
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
                console.log(chalk.green('   ✓ SSE endpoint reachable'));
            }
            catch (error) {
                sseSpinner.fail('SSE transport failed');
                console.log(chalk.red('   ✖ SSE endpoint failed'));
                if (options.verbose) {
                    console.log(chalk.gray(`     Error: ${error.message}`));
                }
            }
        }
        else {
            console.log(chalk.gray('   - Skipped transport tests (authentication required)'));
        }
        // Step 4: Test current MCP connection
        console.log(chalk.cyan('\n4. Current MCP Connection'));
        const client = getMCPClient();
        diagnostics.currentConnection = client.getConnectionStatus();
        if (diagnostics.currentConnection.connected) {
            console.log(chalk.green('   ✓ MCP client is connected'));
            console.log(chalk.gray(`     Mode: ${diagnostics.currentConnection.mode}`));
            console.log(chalk.gray(`     Server: ${diagnostics.currentConnection.server}`));
            if (diagnostics.currentConnection.connectionUptime) {
                const uptimeSeconds = Math.floor(diagnostics.currentConnection.connectionUptime / 1000);
                console.log(chalk.gray(`     Uptime: ${uptimeSeconds}s`));
            }
            if (diagnostics.currentConnection.lastHealthCheck) {
                const healthCheckAge = Date.now() - diagnostics.currentConnection.lastHealthCheck.getTime();
                console.log(chalk.gray(`     Last health check: ${Math.floor(healthCheckAge / 1000)}s ago`));
            }
        }
        else {
            console.log(chalk.red('   ✖ MCP client is not connected'));
            console.log(chalk.gray('   → Try: lanonasis mcp connect'));
        }
        // Step 5: Test tool availability
        console.log(chalk.cyan('\n5. Tool Availability'));
        if (diagnostics.currentConnection.connected) {
            const toolSpinner = ora('Testing MCP tools...').start();
            try {
                const tools = await client.listTools();
                diagnostics.toolsAvailable = tools.length > 0;
                toolSpinner.succeed(`Found ${tools.length} available tools`);
                console.log(chalk.green(`   ✓ ${tools.length} MCP tools available`));
                if (options.verbose && tools.length > 0) {
                    console.log(chalk.gray('     Available tools:'));
                    tools.slice(0, 5).forEach(tool => {
                        console.log(chalk.gray(`       • ${tool.name}`));
                    });
                    if (tools.length > 5) {
                        console.log(chalk.gray(`       ... and ${tools.length - 5} more`));
                    }
                }
            }
            catch (error) {
                toolSpinner.fail('Tool listing failed');
                console.log(chalk.red('   ✖ Cannot list MCP tools'));
                if (options.verbose) {
                    console.log(chalk.gray(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            }
        }
        else {
            console.log(chalk.gray('   - Skipped (not connected to MCP server)'));
        }
        // Step 6: Connection quality measurement
        console.log(chalk.cyan('\n6. Connection Quality'));
        if (Object.keys(diagnostics.connectionLatency).length > 0) {
            console.log(chalk.green('   ✓ Latency measurements:'));
            Object.entries(diagnostics.connectionLatency).forEach(([transport, latency]) => {
                const quality = latency < 100 ? 'Excellent' : latency < 300 ? 'Good' : latency < 1000 ? 'Fair' : 'Poor';
                const color = latency < 100 ? chalk.green : latency < 300 ? chalk.yellow : chalk.red;
                console.log(color(`     ${transport.toUpperCase()}: ${latency}ms (${quality})`));
            });
        }
        else {
            console.log(chalk.gray('   - No latency measurements available'));
        }
        // Summary and recommendations
        console.log(chalk.blue.bold('\n📋 MCP Diagnostic Summary'));
        console.log(chalk.cyan('━'.repeat(50)));
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
            console.log(chalk.green('✅ All MCP connection checks passed!'));
            console.log(chalk.cyan('   Your MCP connection is working correctly.'));
            if (Object.keys(diagnostics.connectionLatency).length > 0) {
                const avgLatency = Object.values(diagnostics.connectionLatency).reduce((a, b) => a + b, 0) / Object.values(diagnostics.connectionLatency).length;
                console.log(chalk.cyan(`   Average latency: ${Math.round(avgLatency)}ms`));
            }
        }
        else {
            console.log(chalk.red(`❌ Found ${issues.length} issue(s):`));
            issues.forEach(issue => {
                console.log(chalk.red(`   • ${issue}`));
            });
            console.log(chalk.yellow('\n💡 Recommended actions:'));
            recommendations.forEach(rec => {
                console.log(chalk.cyan(`   • ${rec}`));
            });
        }
        // Additional troubleshooting info
        if (issues.length > 0) {
            console.log(chalk.gray('\n🔧 Additional troubleshooting:'));
            console.log(chalk.gray('   • Try different connection modes: --mode websocket|remote|local'));
            console.log(chalk.gray('   • Check firewall settings for ports 80, 443, and WebSocket'));
            console.log(chalk.gray('   • Verify your network allows outbound HTTPS connections'));
            console.log(chalk.gray('   • Contact support if issues persist'));
        }
    });
}
