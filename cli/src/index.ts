#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';

import { initCommand } from './commands/init.js';
import { loginCommand } from './commands/auth.js';
import { memoryCommands } from './commands/memory.js';
import { topicCommands } from './commands/topics.js';
import { configCommands } from './commands/config.js';
import { orgCommands } from './commands/organization.js';
import { mcpCommands } from './commands/mcp.js';
import apiKeysCommand from './commands/api-keys.js';
import { CLIConfig } from './utils/config.js';
import { getMCPClient } from './utils/mcp-client.js';

// Load environment variables
config();

const program = new Command();

// CLI Configuration
const cliConfig = new CLIConfig();

program
  .name('memory')
  .alias('maas')
  .description('Enterprise Memory as a Service (MaaS) CLI with MCP Integration')
  .version('1.0.0')
  .option('-v, --verbose', 'enable verbose logging')
  .option('--api-url <url>', 'override API URL')
  .option('--output <format>', 'output format (json, table, yaml)', 'table')
  .option('--no-mcp', 'disable MCP and use direct API')
  .hook('preAction', async (thisCommand, actionCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      process.env.CLI_VERBOSE = 'true';
    }
    if (opts.apiUrl) {
      process.env.MEMORY_API_URL = opts.apiUrl;
    }
    process.env.CLI_OUTPUT_FORMAT = opts.output;
    
    // Auto-initialize MCP unless disabled
    if (opts.mcp !== false && !['init', 'auth', 'login', 'mcp'].includes(actionCommand.name())) {
      try {
        const client = getMCPClient();
        if (!client.isConnectedToServer()) {
          const useRemote = await cliConfig.isAuthenticated();
          await client.connect({ useRemote });
          if (process.env.CLI_VERBOSE === 'true') {
            console.log(chalk.gray(`MCP connected (${useRemote ? 'remote' : 'local'})`));
          }
        }
      } catch (error) {
        if (process.env.CLI_VERBOSE === 'true') {
          console.log(chalk.yellow('MCP auto-connect failed, using direct API'));
        }
      }
    }
  });

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('✖ Unexpected error:'), error.message);
  if (process.env.CLI_VERBOSE === 'true') {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('✖ Unhandled promise rejection:'), reason);
  if (process.env.CLI_VERBOSE === 'true') {
    console.error(promise);
  }
  process.exit(1);
});

// Welcome message for first-time users
const showWelcome = () => {
  console.log(chalk.blue.bold('🧠 Memory as a Service (MaaS) CLI'));
  console.log(chalk.gray('Enterprise-grade memory management for AI applications'));
  console.log();
  console.log(chalk.yellow('Get started:'));
  console.log(chalk.white('  memory init     # Initialize CLI configuration'));
  console.log(chalk.white('  memory login    # Authenticate with Supabase account'));
  console.log(chalk.white('  memory --help   # Show all available commands'));
  console.log();
};

// Check if user is authenticated for protected commands
const requireAuth = (command: Command) => {
  command.hook('preAction', async () => {
    const isAuthenticated = await cliConfig.isAuthenticated();
    if (!isAuthenticated) {
      console.error(chalk.red('✖ Authentication required'));
      console.log(chalk.yellow('Please run:'), chalk.white('memory login'));
      process.exit(1);
    }
  });
};

// Initialize command (no auth required)
program
  .command('init')
  .description('Initialize CLI configuration')
  .option('-f, --force', 'overwrite existing configuration')
  .action(initCommand);

// Authentication commands (no auth required)
const authCmd = program
  .command('auth')
  .alias('login')
  .description('Authentication commands');

authCmd
  .command('login')
  .description('Login to your MaaS account')
  .option('-e, --email <email>', 'email address')
  .option('-p, --password <password>', 'password')
  .action(loginCommand);

authCmd
  .command('logout')
  .description('Logout from your account')
  .action(async () => {
    await cliConfig.logout();
    console.log(chalk.green('✓ Logged out successfully'));
  });

authCmd
  .command('status')
  .description('Show authentication status')
  .action(async () => {
    const isAuth = await cliConfig.isAuthenticated();
    const user = await cliConfig.getCurrentUser();
    
    if (isAuth && user) {
      console.log(chalk.green('✓ Authenticated'));
      console.log(`Email: ${user.email}`);
      console.log(`Organization: ${user.organization_id}`);
      console.log(`Plan: ${user.plan}`);
    } else {
      console.log(chalk.red('✖ Not authenticated'));
      console.log(chalk.yellow('Run:'), chalk.white('memory login'));
    }
  });

// MCP Commands (primary interface)
mcpCommands(program);

// Memory commands (require auth) - now MCP-powered by default
const memoryCmd = program
  .command('memory')
  .alias('mem')
  .description('Memory management commands');

requireAuth(memoryCmd);
memoryCommands(memoryCmd);

// Note: Memory commands are now MCP-powered when available

// Topic commands (require auth)
const topicCmd = program
  .command('topic')
  .alias('topics')
  .description('Topic management commands');

requireAuth(topicCmd);
topicCommands(topicCmd);

// Configuration commands (require auth)
const configCmd = program
  .command('config')
  .description('Configuration management');

requireAuth(configCmd);
configCommands(configCmd);

// Organization commands (require auth)
const orgCmd = program
  .command('org')
  .alias('organization')
  .description('Organization management');

requireAuth(orgCmd);
orgCommands(orgCmd);

// API Key management commands (require auth)
requireAuth(apiKeysCommand);
program.addCommand(apiKeysCommand);

// Global commands that don't require auth
program
  .command('status')
  .description('Show overall system status')
  .action(async () => {
    const isAuth = await cliConfig.isAuthenticated();
    const apiUrl = cliConfig.getApiUrl();
    
    console.log(chalk.blue.bold('MaaS CLI Status'));
    console.log(`API URL: ${apiUrl}`);
    console.log(`Authenticated: ${isAuth ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (isAuth) {
      const user = await cliConfig.getCurrentUser();
      if (user) {
        console.log(`User: ${user.email}`);
        console.log(`Plan: ${user.plan}`);
      }
    }
  });

program
  .command('docs')
  .description('Open documentation in browser')
  .action(() => {
    const url = 'https://docs.seyederick.com/memory-service';
    console.log(chalk.blue(`Opening documentation: ${url}`));
    
    // Try to open in browser
    import('open').then(open => {
      open.default(url).catch(() => {
        console.log(chalk.yellow('Could not open browser automatically.'));
        console.log(chalk.white(`Please visit: ${url}`));
      });
    }).catch(() => {
      console.log(chalk.white(`Please visit: ${url}`));
    });
  });

// Help customization
program.configureHelp({
  formatHelp: (cmd, helper) => {
    const term = helper.termWidth || 80;
    const helpWidth = Math.min(term - 2, 80);
    
    let help = chalk.blue.bold('🧠 Memory as a Service CLI\n\n');
    help += helper.commandUsage(cmd) + '\n\n';
    
    if (cmd.description()) {
      help += chalk.yellow('Description:\n');
      help += `  ${cmd.description()}\n\n`;
    }
    
    const commands = helper.visibleCommands(cmd);
    if (commands.length > 0) {
      help += chalk.yellow('Commands:\n');
      const maxNameLength = Math.max(...commands.map(c => c.name().length));
      commands.forEach(c => {
        const name = c.name().padEnd(maxNameLength);
        help += `  ${chalk.white(name)}  ${c.description()}\n`;
      });
      help += '\n';
    }
    
    const options = helper.visibleOptions(cmd);
    if (options.length > 0) {
      help += chalk.yellow('Options:\n');
      options.forEach(option => {
        help += `  ${option.flags.padEnd(20)}  ${option.description}\n`;
      });
      help += '\n';
    }
    
    help += chalk.gray('For more help on a specific command, run: memory <command> --help\n');
    help += chalk.gray('Documentation: https://docs.seyederick.com/memory-service\n');
    
    return help;
  }
});

// Parse CLI arguments
async function main() {
  // Show welcome message if no arguments provided
  if (process.argv.length <= 2) {
    showWelcome();
    return;
  }
  
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('✖ Error:'), error.message);
      if (process.env.CLI_VERBOSE === 'true') {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main();