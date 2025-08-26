import chalk from 'chalk';
import { CLIConfig } from '../utils/config.js';
import { apiClient } from '../utils/api.js';

// Color scheme
const colors = {
  primary: chalk.blue.bold,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.cyan,
  accent: chalk.magenta,
  muted: chalk.gray,
  highlight: chalk.white.bold
};

export interface CompletionData {
  commands: Array<{
    name: string;
    description: string;
    aliases?: string[];
    subcommands?: Array<{
      name: string;
      description: string;
      options?: Array<{
        name: string;
        description: string;
        type: 'string' | 'boolean' | 'number' | 'choice';
        choices?: string[];
        required?: boolean;
      }>;
    }>;
  }>;
  globalOptions: Array<{
    name: string;
    description: string;
    type: 'string' | 'boolean' | 'number' | 'choice';
    choices?: string[];
  }>;
  contextualData: {
    memoryTypes: string[];
    outputFormats: string[];
    sortOptions: string[];
    authMethods: string[];
  };
}

export async function generateCompletionData(): Promise<CompletionData> {
  const config = new CLIConfig();
  await config.init();

  // Dynamic data that might come from API or config
  let memoryTypes = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];
  let topics: string[] = [];
  
  try {
    // Try to fetch dynamic data if authenticated
    if (await config.isAuthenticated()) {
      const topicsData = await apiClient.getTopics();
      topics = topicsData.map(t => t.name);
    }
  } catch {
    // Ignore errors in completion generation
  }

  const completionData: CompletionData = {
    commands: [
      {
        name: 'init',
        description: 'Initialize CLI configuration',
        subcommands: []
      },
      {
        name: 'auth',
        aliases: ['login'],
        description: 'Authentication commands',
        subcommands: [
          {
            name: 'login',
            description: 'Login to your account',
            options: [
              { name: '--email', description: 'Email address', type: 'string' },
              { name: '--password', description: 'Password', type: 'string' },
              { name: '--vendor-key', description: 'Vendor key (pk_xxx.sk_xxx)', type: 'string' },
              { name: '--oauth', description: 'Use OAuth flow', type: 'boolean' }
            ]
          },
          {
            name: 'logout',
            description: 'Logout from your account',
            options: []
          },
          {
            name: 'status',
            description: 'Show authentication status',
            options: []
          }
        ]
      },
      {
        name: 'memory',
        aliases: ['mem'],
        description: 'Memory management commands',
        subcommands: [
          {
            name: 'list',
            description: 'List memories',
            options: [
              { name: '--limit', description: 'Number of results', type: 'number' },
              { name: '--offset', description: 'Results offset', type: 'number' },
              { name: '--memory-type', description: 'Filter by memory type', type: 'choice', choices: memoryTypes },
              { name: '--sort-by', description: 'Sort field', type: 'choice', choices: ['created_at', 'updated_at', 'last_accessed', 'access_count'] },
              { name: '--sort-order', description: 'Sort order', type: 'choice', choices: ['asc', 'desc'] },
              { name: '--tags', description: 'Filter by tags', type: 'string' }
            ]
          },
          {
            name: 'create',
            description: 'Create a new memory',
            options: [
              { name: '--title', description: 'Memory title', type: 'string', required: true },
              { name: '--content', description: 'Memory content', type: 'string', required: true },
              { name: '--memory-type', description: 'Memory type', type: 'choice', choices: memoryTypes },
              { name: '--tags', description: 'Comma-separated tags', type: 'string' },
              { name: '--topic-id', description: 'Topic ID', type: 'string' }
            ]
          },
          {
            name: 'get',
            description: 'Get a specific memory',
            options: [
              { name: 'id', description: 'Memory ID', type: 'string', required: true }
            ]
          },
          {
            name: 'update',
            description: 'Update an existing memory',
            options: [
              { name: 'id', description: 'Memory ID', type: 'string', required: true },
              { name: '--title', description: 'Memory title', type: 'string' },
              { name: '--content', description: 'Memory content', type: 'string' },
              { name: '--memory-type', description: 'Memory type', type: 'choice', choices: memoryTypes },
              { name: '--tags', description: 'Comma-separated tags', type: 'string' }
            ]
          },
          {
            name: 'delete',
            description: 'Delete a memory',
            options: [
              { name: 'id', description: 'Memory ID', type: 'string', required: true }
            ]
          },
          {
            name: 'search',
            description: 'Search memories',
            options: [
              { name: 'query', description: 'Search query', type: 'string', required: true },
              { name: '--memory-types', description: 'Filter by memory types', type: 'string' },
              { name: '--limit', description: 'Number of results', type: 'number' },
              { name: '--threshold', description: 'Relevance threshold', type: 'number' }
            ]
          },
          {
            name: 'stats',
            description: 'Show memory statistics',
            options: []
          },
          {
            name: 'bulk-delete',
            description: 'Delete multiple memories',
            options: [
              { name: '--ids', description: 'Comma-separated memory IDs', type: 'string', required: true }
            ]
          }
        ]
      },
      {
        name: 'topic',
        aliases: ['topics'],
        description: 'Topic management commands',
        subcommands: [
          {
            name: 'list',
            description: 'List topics',
            options: []
          },
          {
            name: 'create',
            description: 'Create a new topic',
            options: [
              { name: '--name', description: 'Topic name', type: 'string', required: true },
              { name: '--description', description: 'Topic description', type: 'string' },
              { name: '--color', description: 'Topic color', type: 'string' },
              { name: '--icon', description: 'Topic icon', type: 'string' }
            ]
          },
          {
            name: 'get',
            description: 'Get a specific topic',
            options: [
              { name: 'id', description: 'Topic ID', type: 'string', required: true }
            ]
          },
          {
            name: 'update',
            description: 'Update an existing topic',
            options: [
              { name: 'id', description: 'Topic ID', type: 'string', required: true },
              { name: '--name', description: 'Topic name', type: 'string' },
              { name: '--description', description: 'Topic description', type: 'string' },
              { name: '--color', description: 'Topic color', type: 'string' }
            ]
          },
          {
            name: 'delete',
            description: 'Delete a topic',
            options: [
              { name: 'id', description: 'Topic ID', type: 'string', required: true }
            ]
          }
        ]
      },
      {
        name: 'config',
        description: 'Configuration management',
        subcommands: [
          {
            name: 'get',
            description: 'Get configuration value',
            options: [
              { name: 'key', description: 'Configuration key', type: 'string', required: true }
            ]
          },
          {
            name: 'set',
            description: 'Set configuration value',
            options: [
              { name: 'key', description: 'Configuration key', type: 'string', required: true },
              { name: 'value', description: 'Configuration value', type: 'string', required: true }
            ]
          },
          {
            name: 'list',
            description: 'List all configuration',
            options: []
          },
          {
            name: 'reset',
            description: 'Reset configuration',
            options: [
              { name: '--confirm', description: 'Confirm reset', type: 'boolean' }
            ]
          }
        ]
      },
      {
        name: 'api-keys',
        description: 'API key management',
        subcommands: [
          {
            name: 'list',
            description: 'List API keys',
            options: []
          },
          {
            name: 'create',
            description: 'Create a new API key',
            options: [
              { name: '--name', description: 'API key name', type: 'string', required: true },
              { name: '--scope', description: 'API key scope', type: 'string' },
              { name: '--expires', description: 'Expiration date', type: 'string' }
            ]
          },
          {
            name: 'revoke',
            description: 'Revoke an API key',
            options: [
              { name: 'id', description: 'API key ID', type: 'string', required: true }
            ]
          },
          {
            name: 'rotate',
            description: 'Rotate an API key',
            options: [
              { name: 'id', description: 'API key ID', type: 'string', required: true }
            ]
          }
        ]
      },
      {
        name: 'mcp',
        description: 'Model Context Protocol commands',
        subcommands: [
          {
            name: 'status',
            description: 'Show MCP server status',
            options: []
          },
          {
            name: 'connect',
            description: 'Connect to MCP server',
            options: [
              { name: '--remote', description: 'Use remote server', type: 'boolean' },
              { name: '--local', description: 'Use local server', type: 'boolean' }
            ]
          },
          {
            name: 'disconnect',
            description: 'Disconnect from MCP server',
            options: []
          },
          {
            name: 'servers',
            description: 'List MCP servers',
            options: []
          },
          {
            name: 'tools',
            description: 'List available tools',
            options: []
          },
          {
            name: 'resources',
            description: 'List available resources',
            options: []
          }
        ]
      },
      {
        name: 'dashboard',
        description: 'Dashboard management',
        subcommands: [
          {
            name: 'status',
            description: 'Check dashboard status',
            options: []
          },
          {
            name: 'logs',
            description: 'View dashboard logs',
            options: []
          },
          {
            name: 'open',
            description: 'Open dashboard in browser',
            options: []
          }
        ]
      },
      {
        name: 'status',
        description: 'Show overall system status',
        subcommands: []
      },
      {
        name: 'health',
        aliases: ['check'],
        description: 'Comprehensive system health check',
        subcommands: []
      }
    ],
    globalOptions: [
      { name: '--help', description: 'Show help information', type: 'boolean' },
      { name: '--version', description: 'Show version information', type: 'boolean' },
      { name: '--verbose', description: 'Enable verbose logging', type: 'boolean' },
      { name: '--output', description: 'Output format', type: 'choice', choices: ['table', 'json', 'yaml', 'csv'] },
      { name: '--api-url', description: 'Override API URL', type: 'string' },
      { name: '--no-mcp', description: 'Disable MCP and use direct API', type: 'boolean' }
    ],
    contextualData: {
      memoryTypes,
      outputFormats: ['table', 'json', 'yaml', 'csv'],
      sortOptions: ['created_at', 'updated_at', 'last_accessed', 'access_count'],
      authMethods: ['vendor_key', 'oauth', 'credentials']
    }
  };

  return completionData;
}

export async function completionCommand(): Promise<void> {
  try {
    const data = await generateCompletionData();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(chalk.red('✖ Failed to generate completion data:'), 
      error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export async function installCompletionsCommand(): Promise<void> {
  console.log(chalk.blue.bold('🔧 Installing Shell Completions'));
  console.log(colors.info('═'.repeat(40)));
  console.log();
  
  console.log(chalk.yellow('📋 Installation Instructions:'));
  console.log();
  
  console.log(chalk.white('Bash:'));
  console.log(chalk.gray('  # Add to ~/.bashrc or ~/.bash_profile:'));
  console.log(chalk.cyan('  source <(lanonasis --completion bash)'));
  console.log();
  
  console.log(chalk.white('Zsh:'));
  console.log(chalk.gray('  # Add to ~/.zshrc:'));
  console.log(chalk.cyan('  source <(lanonasis --completion zsh)'));
  console.log(chalk.gray('  # Or for Oh My Zsh, create ~/.oh-my-zsh/completions/_lanonasis'));
  console.log();
  
  console.log(chalk.white('Fish:'));
  console.log(chalk.gray('  # Add to ~/.config/fish/config.fish:'));
  console.log(chalk.cyan('  lanonasis --completion fish | source'));
  console.log(chalk.gray('  # Or save to ~/.config/fish/completions/lanonasis.fish'));
  console.log();
  
  console.log(colors.info('💡 Completions support all command aliases:'));
  console.log(chalk.gray('   • lanonasis, onasis, memory, maas'));
  console.log();
  
  console.log(colors.success('✅ Run the appropriate command above for your shell'));
}