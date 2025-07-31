import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { getMCPClient } from '../utils/mcp-client.js';
import { CLIConfig } from '../utils/config.js';
import { formatOutput } from '../utils/formatting.js';

export function mcpCommands(program: Command) {
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
        console.log('  Your memory operations will use api.lanonasis.com');
        console.log('  with real-time SSE updates enabled');
      } else {
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
        } else {
          spinner.fail('Failed to auto-connect to MCP');
        }
      } catch (error) {
        spinner.fail('MCP auto-connect failed');
      }
    });

  // Connect command
  mcp.command('connect')
    .description('Connect to MCP server (local or remote)')
    .option('-l, --local', 'Connect to local MCP server')
    .option('-r, --remote', 'Connect to remote MCP server (api.lanonasis.com)')
    .option('-s, --server <path>', 'Local MCP server path')
    .option('-u, --url <url>', 'Remote MCP server URL')
    .action(async (options) => {
      const spinner = ora('Connecting to MCP server...').start();
      const config = new CLIConfig();
      
      try {
        // Determine connection mode
        let useRemote = options.remote;
        if (!options.local && !options.remote) {
          // Default to remote if authenticated, otherwise local
          useRemote = !!config.get('token');
        }
        
        // Save preference
        config.set('mcpUseRemote', useRemote);
        if (options.server) {
          config.set('mcpServerPath', options.server);
        }
        if (options.url) {
          config.set('mcpServerUrl', options.url);
        }
        
        const client = getMCPClient();
        const connected = await client.connect({
          useRemote,
          serverPath: options.server,
          serverUrl: options.url
        });
        
        if (connected) {
          spinner.succeed(chalk.green(`Connected to ${useRemote ? 'remote' : 'local'} MCP server`));
          
          if (useRemote) {
            console.log(chalk.cyan('ℹ️  Using remote MCP via api.lanonasis.com'));
            console.log(chalk.cyan('📡 SSE endpoint active for real-time updates'));
          }
        } else {
          spinner.fail('Failed to connect to MCP server');
        }
      } catch (error) {
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
      } catch (error) {
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
          } catch (error) {
            spinner.fail('Invalid JSON arguments');
            process.exit(1);
          }
        }
        
        const result = await client.callTool(toolName, args);
        spinner.succeed(`Tool ${toolName} executed successfully`);
        
        console.log(chalk.cyan('\n📤 Tool Result:'));
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
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
          tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : []
        });
        
        spinner.succeed('Memory created successfully');
        
        console.log(chalk.green('\n✓ Memory created'));
        console.log(`ID: ${chalk.cyan(result.id)}`);
        console.log(`Title: ${result.title}`);
        console.log(`Type: ${result.memory_type}`);
      } catch (error) {
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
        results.forEach((memory: any, index: number) => {
          console.log(`\n${chalk.bold(`${index + 1}. ${memory.title}`)}`);
          console.log(`   ID: ${chalk.gray(memory.id)}`);
          console.log(`   Type: ${chalk.blue(memory.memory_type)}`);
          console.log(`   Score: ${chalk.green((memory.relevance_score * 100).toFixed(1) + '%')}`);
          console.log(`   Content: ${memory.content.substring(0, 100)}...`);
        });
      } catch (error) {
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
      } else if (options.preferLocal) {
        config.set('mcpPreference', 'local');
        console.log(chalk.green('✓ Set MCP preference to local'));
      } else if (options.auto) {
        config.set('mcpPreference', 'auto');
        console.log(chalk.green('✓ Set MCP preference to auto-detect'));
      } else {
        const current = config.get('mcpPreference') || 'auto';
        console.log(`Current MCP preference: ${chalk.cyan(current)}`);
        console.log('\nOptions:');
        console.log('  --prefer-remote : Use remote MCP server (api.lanonasis.com)');
        console.log('  --prefer-local  : Use local MCP server');
        console.log('  --auto          : Auto-detect based on authentication');
      }
    });
}