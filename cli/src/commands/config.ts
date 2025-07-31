import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { CLIConfig } from '../utils/config.js';
import { apiClient } from '../utils/api.js';

// Type definitions for command options and answers
interface UrlPromptAnswer {
  url: string;
}

interface ResetConfirmAnswer {
  confirm: boolean;
}

interface ResetOptions {
  force?: boolean;
}

interface DependencyInfo {
  status: string;
  response_time?: number;
  latency_ms?: number;
}

export function configCommands(program: Command): void {
  // Generic config set command
  program
    .command('set <key> <value>')
    .description('Set configuration value')
    .action(async (key: string, value: string) => {
      const config = new CLIConfig();
      await config.init();

      // Handle special cases
      switch (key) {
        case 'api-url':
          await config.setApiUrl(value);
          console.log(chalk.green('✓ API URL updated:'), value);
          break;
        
        case 'ai-integration':
          if (value === 'claude-mcp') {
            config.set('mcpEnabled', true);
            config.set('aiIntegration', 'claude-mcp');
            console.log(chalk.green('✓ AI integration set to Claude MCP'));
            console.log(chalk.cyan('  MCP will be automatically initialized for memory operations'));
            console.log(chalk.cyan('  Run "lanonasis mcp-server init" to test the connection'));
          } else {
            console.log(chalk.yellow('⚠️  Unknown AI integration:'), value);
            console.log(chalk.gray('  Currently supported: claude-mcp'));
          }
          break;
        
        case 'mcp-use-remote':
          config.set('mcpUseRemote', value === 'true');
          console.log(chalk.green('✓ MCP remote mode:'), value === 'true' ? 'enabled' : 'disabled');
          break;
        
        case 'mcp-server-path':
          config.set('mcpServerPath', value);
          console.log(chalk.green('✓ MCP server path updated:'), value);
          break;
        
        case 'mcp-server-url':
          config.set('mcpServerUrl', value);
          console.log(chalk.green('✓ MCP server URL updated:'), value);
          break;
        
        default:
          // Generic config set
          config.set(key, value);
          console.log(chalk.green(`✓ ${key} set to:`), value);
      }
    });

  // Generic config get command
  program
    .command('get <key>')
    .description('Get configuration value')
    .action(async (key: string) => {
      const config = new CLIConfig();
      await config.init();
      
      const value = config.get(key);
      if (value !== undefined) {
        console.log(chalk.green(`${key}:`), value);
      } else {
        console.log(chalk.yellow(`⚠️  ${key} is not set`));
      }
    });

  // Show current configuration
  program
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      const config = new CLIConfig();
      await config.init();

      console.log(chalk.blue.bold('⚙️  Current Configuration'));
      console.log();
      console.log(chalk.green('API URL:'), config.getApiUrl());
      console.log(chalk.green('Config Path:'), config.getConfigPath());
      
      const isAuth = await config.isAuthenticated();
      console.log(chalk.green('Authenticated:'), isAuth ? chalk.green('Yes') : chalk.red('No'));
      
      if (isAuth) {
        const user = await config.getCurrentUser();
        if (user) {
          console.log(chalk.green('User:'), user.email);
          console.log(chalk.green('Organization:'), user.organization_id);
          console.log(chalk.green('Role:'), user.role);
          console.log(chalk.green('Plan:'), user.plan);
        }
      }
    });

  // List all configuration options
  program
    .command('list')
    .description('List all configuration options')
    .action(async () => {
      const config = new CLIConfig();
      await config.init();

      console.log(chalk.blue.bold('📋 Configuration Options'));
      console.log();
      
      const configOptions = [
        { key: 'api-url', description: 'API endpoint URL', current: config.getApiUrl() },
        { key: 'ai-integration', description: 'AI integration mode', current: config.get('aiIntegration') || 'none' },
        { key: 'mcp-use-remote', description: 'Use remote MCP server', current: config.get('mcpUseRemote') || false },
        { key: 'mcp-server-path', description: 'Local MCP server path', current: config.get('mcpServerPath') || 'default' },
        { key: 'mcp-server-url', description: 'Remote MCP server URL', current: config.get('mcpServerUrl') || 'https://api.lanonasis.com' },
        { key: 'mcpEnabled', description: 'MCP integration enabled', current: config.get('mcpEnabled') || false }
      ];

      configOptions.forEach(opt => {
        console.log(chalk.green(opt.key.padEnd(20)), chalk.gray(opt.description.padEnd(30)), chalk.yellow(String(opt.current)));
      });

      console.log();
      console.log(chalk.gray('Use "lanonasis config set <key> <value>" to update any option'));
    });

  // Set API URL
  program
    .command('set-url')
    .description('Set API URL')
    .argument('[url]', 'API URL')
    .action(async (url: string | undefined) => {
      const config = new CLIConfig();
      await config.init();

      if (!url) {
        const answer = await inquirer.prompt<UrlPromptAnswer>([
          {
            type: 'input',
            name: 'url',
            message: 'API URL:',
            default: config.getApiUrl(),
            validate: (input: string) => {
              try {
                new URL(input);
                return true;
              } catch {
                return 'Please enter a valid URL';
              }
            }
          }
        ]);
        url = answer.url;
      }

      await config.setApiUrl(url);
      console.log(chalk.green('✓ API URL updated:'), url);
    });

  // Test connection
  program
    .command('test')
    .description('Test connection to API')
    .action(async () => {
      const config = new CLIConfig();
      await config.init();

      console.log(chalk.blue('🔌 Testing connection...'));
      console.log(chalk.gray(`API URL: ${config.getApiUrl()}`));
      console.log();

      try {
        const health = await apiClient.getHealth();
        
        console.log(chalk.green('✓ Connection successful'));
        console.log(`Status: ${health.status}`);
        console.log(`Version: ${health.version}`);
        
        if (health.dependencies) {
          console.log();
          console.log(chalk.yellow('Dependencies:'));
          Object.entries(health.dependencies).forEach(([name, info]: [string, DependencyInfo]) => {
            const status = info.status === 'healthy' ? chalk.green('✓') : chalk.red('✖');
            const responseTime = info.response_time || info.latency_ms || 0;
            console.log(`  ${status} ${name}: ${info.status} (${responseTime}ms)`);
          });
        }
        
      } catch (error: unknown) {
        console.log(chalk.red('✖ Connection failed'));
        const errorCode = error && typeof error === 'object' && 'code' in error ? (error as Record<string, unknown>).code : null;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorCode === 'ECONNREFUSED') {
          console.error(chalk.red('Cannot connect to API server'));
          console.log(chalk.yellow('Make sure the API server is running'));
        } else {
          console.error(chalk.red('Error:'), errorMessage);
        }
        
        process.exit(1);
      }
    });

  // Reset configuration
  program
    .command('reset')
    .description('Reset all configuration')
    .option('-f, --force', 'skip confirmation')
    .action(async (options: ResetOptions) => {
      if (!options.force) {
        const answer = await inquirer.prompt<ResetConfirmAnswer>([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset all configuration? This will log you out.',
            default: false
          }
        ]);

        if (!answer.confirm) {
          console.log(chalk.yellow('Reset cancelled'));
          return;
        }
      }

      const config = new CLIConfig();
      await config.clear();
      
      console.log(chalk.green('✓ Configuration reset'));
      console.log(chalk.yellow('Run'), chalk.white('memory init'), chalk.yellow('to reconfigure'));
    });
}