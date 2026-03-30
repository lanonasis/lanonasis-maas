import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { apiClient } from '../utils/api.js';
import { formatDate, truncateText } from '../utils/formatting.js';

// Enhanced VPS-style color scheme
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

const AUTH_API_KEYS_BASE = '/api/v1/auth/api-keys';
const VALID_ACCESS_LEVELS = ['public', 'authenticated', 'team', 'admin', 'enterprise'] as const;

interface PlatformApiKey {
  id: string;
  name: string;
  description?: string | null;
  key?: string;
  user_id: string;
  access_level: string;
  permissions: string[];
  service: string;
  service_scopes?: Array<{
    service_key: string;
    allowed_actions?: string[];
    max_calls_per_minute?: number;
    max_calls_per_day?: number;
  }>;
  expires_at?: string | null;
  last_used_at?: string | null;
  created_at: string;
  is_active: boolean;
}

function unwrapApiResponse<T>(response: T | { data?: T }): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data?: T }).data ?? (response as T);
  }
  return response as T;
}

function parseScopes(scopes?: string): string[] | undefined {
  if (!scopes) {
    return undefined;
  }

  const parsed = scopes
    .split(',')
    .map((scope: string) => scope.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : undefined;
}

const apiKeysCommand = new Command('api-keys')
  .alias('keys')
  .description(colors.info('🔐 Manage API keys securely with enterprise-grade encryption'));

// ============================================================================
// PROJECT COMMANDS
// ============================================================================

const projectsCommand = new Command('projects')
  .description(colors.accent('📁 Manage API key projects and organization'));

projectsCommand
  .command('create')
  .description('Create a new API key project')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --description [description]', 'Project description')
  .option('-o, --organization-id <id>', 'Organization ID')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      let projectData: any = {
        name: options.name,
        description: options.description,
        organizationId: options.organizationId
      };

      if (options.interactive || !projectData.name || !projectData.organizationId) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            when: !projectData.name,
            validate: (input) => input.length > 0 || 'Project name is required'
          },
          {
            type: 'input',
            name: 'description',
            message: 'Project description (optional):',
            when: !projectData.description
          },
          {
            type: 'input',
            name: 'organizationId',
            message: 'Organization ID:',
            when: !projectData.organizationId,
            validate: (input) => {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              return uuidRegex.test(input) || 'Please enter a valid UUID';
            }
          }
        ]);

        projectData = { ...projectData, ...answers };
      }

      const project = await apiClient.post('/api-keys/projects', projectData);
      
      console.log(chalk.green('✅ Project created successfully!'));
      console.log(chalk.blue(`Project ID: ${project.id}`));
      console.log(chalk.blue(`Name: ${project.name}`));
      if (project.description) {
        console.log(chalk.blue(`Description: ${project.description}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to create project:'), error.message);
      process.exit(1);
    }
  });

projectsCommand
  .command('list')
  .alias('ls')
  .description('List all API key projects')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const projects = await apiClient.get('/api-keys/projects');

      if (options.json) {
        console.log(JSON.stringify(projects, null, 2));
        return;
      }

      if (projects.length === 0) {
        console.log(chalk.yellow('No projects found'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Name', 'Description', 'Owner', 'Created'].map(h => chalk.cyan(h)),
        style: { head: [], border: [] }
      });

      projects.forEach((project: any) => {
        table.push([
          truncateText(project.id, 20),
          project.name,
          truncateText(project.description || '-', 30),
          truncateText(project.ownerId, 20),
          formatDate(project.createdAt)
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`Total: ${projects.length} projects`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to list projects:'), error.message);
      process.exit(1);
    }
  });

// ============================================================================
// API KEY COMMANDS
// ============================================================================

apiKeysCommand
  .command('create')
  .description('Create a new API key')
  .option('-n, --name <name>', 'API key name')
  .option('-d, --description <description>', 'API key description (optional)')
  .option('--access-level <level>', 'Access level (public, authenticated, team, admin, enterprise)', 'team')
  .option('--expires-in-days <days>', 'Expiration in days (default: 365)', '365')
  .option('--scopes <scopes>', 'Comma-separated scopes (optional)')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      const accessLevel = (options.accessLevel || 'team').toLowerCase();
      const expiresInDays = parseInt(options.expiresInDays, 10);

      if (!VALID_ACCESS_LEVELS.includes(accessLevel as typeof VALID_ACCESS_LEVELS[number])) {
        throw new Error('Invalid access level. Allowed: public, authenticated, team, admin, enterprise');
      }
      if (!Number.isInteger(expiresInDays) || expiresInDays <= 0 || expiresInDays > 3650) {
        throw new Error('expires-in-days must be a positive integer up to 3650');
      }

      let keyData: any = {
        name: options.name,
        access_level: accessLevel,
        expires_in_days: expiresInDays,
        description: options.description?.trim() || undefined,
        scopes: parseScopes(options.scopes)
      };

      if (options.interactive || !keyData.name) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'API key name:',
            when: !keyData.name,
            validate: (input) => input.length > 0 || 'Name is required'
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description (optional):',
            default: keyData.description || ''
          },
          {
            type: 'select',
            name: 'access_level',
            message: 'Access level:',
            choices: VALID_ACCESS_LEVELS,
            default: keyData.access_level
          },
          {
            type: 'number',
            name: 'expires_in_days',
            message: 'Expires in days:',
            default: keyData.expires_in_days,
            validate: (input) => Number.isInteger(input) && input > 0 && input <= 3650 || 'Must be between 1 and 3650 days'
          },
          {
            type: 'input',
            name: 'scopes',
            message: 'Scopes (comma-separated, optional):',
            default: (keyData.scopes || []).join(', ')
          }
        ]);

        keyData = {
          ...keyData,
          ...answers,
          description: typeof answers.description === 'string'
            ? answers.description.trim() || undefined
            : keyData.description,
          scopes: parseScopes(typeof answers.scopes === 'string' ? answers.scopes : undefined) ?? keyData.scopes
        };
      }

      const apiKey = unwrapApiResponse<PlatformApiKey>(await apiClient.post(AUTH_API_KEYS_BASE, keyData));
      
      console.log(colors.success('🔐 API key created successfully!'));
      console.log(colors.info('━'.repeat(50)));
      console.log(`${colors.highlight('Key ID:')} ${colors.primary(apiKey.id)}`);
      console.log(`${colors.highlight('Name:')} ${colors.accent(apiKey.name)}`);
      console.log(`${colors.highlight('Access Level:')} ${colors.info(apiKey.access_level || keyData.access_level)}`);
      console.log(`${colors.highlight('Permissions:')} ${colors.muted((apiKey.permissions || keyData.scopes || []).join(', ') || 'legacy:full_access')}`);
      if (apiKey.expires_at) {
        console.log(`${colors.highlight('Expires At:')} ${colors.warning(formatDate(apiKey.expires_at))}`);
      }
      if (keyData.description) {
        console.log(`${colors.highlight('Description:')} ${colors.muted(keyData.description)}`);
      }
      console.log(colors.info('━'.repeat(50)));
      if (apiKey.key) {
        console.log(`${colors.highlight('API Key:')} ${colors.primary(apiKey.key)}`);
        console.log(colors.warning('⚠️  Save this key now. It will not be shown again.'));
      } else {
        console.log(colors.warning('⚠️  Key value was not returned. If newly created, it cannot be retrieved later.'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to create API key:'), colors.muted(errorMessage));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('list')
  .alias('ls')
  .description('List API keys')
  .option('--all', 'Include inactive keys')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const query = options.all ? '?active_only=false' : '';
      const apiKeys = unwrapApiResponse<PlatformApiKey[]>(await apiClient.get(`${AUTH_API_KEYS_BASE}${query}`));

      if (options.json) {
        console.log(JSON.stringify(apiKeys, null, 2));
        return;
      }

      if (apiKeys.length === 0) {
        console.log(colors.warning('⚠️  No API keys found'));
        console.log(colors.muted('Run: lanonasis api-keys create'));
        return;
      }

      console.log(colors.primary('🔐 API Key Management'));
      console.log(colors.info('═'.repeat(80)));

      const table = new Table({
        head: ['ID', 'Name', 'Access', 'Permissions', 'Service', 'Status', 'Expires'].map(h => colors.accent(h)),
        style: { head: [], border: [] }
      });

      apiKeys.forEach((key) => {
        const statusColor = key.is_active ? colors.success : colors.error;
        
        table.push([
          truncateText(key.id, 20),
          key.name,
          key.access_level,
          truncateText((key.permissions || []).join(', ') || 'legacy:full_access', 28),
          key.service || 'all',
          statusColor(key.is_active ? 'active' : 'inactive'),
          key.expires_at ? formatDate(key.expires_at) : colors.muted('Never')
        ]);
      });

      console.log(table.toString());
      console.log(colors.info('═'.repeat(80)));
      console.log(colors.muted(`🔢 Total: ${colors.highlight(apiKeys.length)} API keys`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to list API keys:'), colors.muted(errorMessage));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('get')
  .description('Get details of a specific API key')
  .argument('<keyId>', 'API key ID')
  .option('--json', 'Output as JSON')
  .action(async (keyId, options) => {
    try {
      const apiKey = unwrapApiResponse<PlatformApiKey>(await apiClient.get(`${AUTH_API_KEYS_BASE}/${keyId}`));

      if (options.json) {
        console.log(JSON.stringify(apiKey, null, 2));
        return;
      }

      console.log(colors.primary('🔍 API Key Details'));
      console.log(colors.info('═'.repeat(60)));
      console.log(`${colors.highlight('ID:')} ${colors.primary(apiKey.id)}`);
      console.log(`${colors.highlight('Name:')} ${colors.accent(apiKey.name)}`);
      if (apiKey.description) {
        console.log(`${colors.highlight('Description:')} ${colors.muted(apiKey.description)}`);
      }
      console.log(`${colors.highlight('Access Level:')} ${colors.warning(apiKey.access_level)}`);
      console.log(`${colors.highlight('Permissions:')} ${colors.muted((apiKey.permissions || []).join(', ') || 'legacy:full_access')}`);
      console.log(`${colors.highlight('Service Scope:')} ${colors.info(apiKey.service || 'all')}`);
      
      const statusColor = apiKey.is_active ? colors.success : colors.error;
      console.log(`${colors.highlight('Status:')} ${statusColor(apiKey.is_active ? 'active' : 'inactive')}`);
      
      if (apiKey.last_used_at) {
        console.log(`${colors.highlight('Last Used:')} ${colors.muted(formatDate(apiKey.last_used_at))}`);
      }
      console.log(`${colors.highlight('Created:')} ${colors.muted(formatDate(apiKey.created_at))}`);
      
      if (apiKey.expires_at) {
        console.log(`${colors.highlight('Expires:')} ${colors.warning(formatDate(apiKey.expires_at))}`);
      }
      console.log(colors.info('═'.repeat(60)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to get API key details:'), colors.muted(errorMessage));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('update')
  .description('Update an API key')
  .argument('<keyId>', 'API key ID')
  .option('-n, --name <name>', 'New name')
  .option('-d, --description <description>', 'New description')
  .option('--access-level <level>', 'New access level')
  .option('--expires-in-days <days>', 'Set a new expiry in days')
  .option('--clear-expiry', 'Remove the current expiry')
  .option('--scopes <scopes>', 'Replace scopes with a comma-separated list')
  .option('--interactive', 'Interactive mode')
  .action(async (keyId, options) => {
    try {
      let updateData: any = {};

      if (options.name) updateData.name = options.name;
      if (options.description !== undefined) updateData.description = options.description.trim() || null;
      if (options.accessLevel) {
        const accessLevel = options.accessLevel.toLowerCase();
        if (!VALID_ACCESS_LEVELS.includes(accessLevel as typeof VALID_ACCESS_LEVELS[number])) {
          throw new Error('Invalid access level. Allowed: public, authenticated, team, admin, enterprise');
        }
        updateData.access_level = accessLevel;
      }
      if (options.expiresInDays) {
        const expiresInDays = parseInt(options.expiresInDays, 10);
        if (!Number.isInteger(expiresInDays) || expiresInDays <= 0 || expiresInDays > 3650) {
          throw new Error('expires-in-days must be a positive integer up to 3650');
        }
        updateData.expires_in_days = expiresInDays;
      }
      if (options.clearExpiry) updateData.clear_expiry = true;
      if (options.scopes) updateData.scopes = parseScopes(options.scopes);

      if (options.interactive || Object.keys(updateData).length === 0) {
        const current = unwrapApiResponse<PlatformApiKey>(await apiClient.get(`${AUTH_API_KEYS_BASE}/${keyId}`));
        
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Name:',
            default: current.name,
            when: !updateData.name
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description (optional):',
            default: current.description || '',
            when: !updateData.description
          },
          {
            type: 'select',
            name: 'access_level',
            message: 'Access level:',
            choices: VALID_ACCESS_LEVELS,
            default: current.access_level,
            when: !updateData.access_level
          },
          {
            type: 'confirm',
            name: 'changeExpiry',
            message: 'Change expiry?',
            default: false,
            when: updateData.expires_in_days === undefined && !updateData.clear_expiry
          },
          {
            type: 'number',
            name: 'expires_in_days',
            message: 'Expires in days:',
            default: current.expires_at ? 365 : 365,
            when: (answers) => answers.changeExpiry === true && updateData.expires_in_days === undefined && !updateData.clear_expiry,
            validate: (input) => Number.isInteger(input) && input > 0 && input <= 3650 || 'Must be between 1 and 3650 days'
          },
          {
            type: 'confirm',
            name: 'clear_expiry',
            message: 'Clear expiry instead?',
            default: false,
            when: (answers) => answers.changeExpiry === true && updateData.expires_in_days === undefined && !updateData.clear_expiry && Boolean(current.expires_at)
          },
          {
            type: 'input',
            name: 'scopes',
            message: 'Scopes (comma-separated, optional):',
            default: (current.permissions || []).join(', '),
            when: !updateData.scopes
          }
        ]);

        updateData = {
          ...updateData,
          ...answers,
          description: typeof answers.description === 'string'
            ? answers.description.trim() || null
            : updateData.description,
          scopes: parseScopes(typeof answers.scopes === 'string' ? answers.scopes : undefined) ?? updateData.scopes
        };

        delete updateData.changeExpiry;
      }

      if (Object.keys(updateData).length === 0) {
        console.log(colors.warning('🚫 Nothing to update'));
        return;
      }

      const updatedKey = unwrapApiResponse<PlatformApiKey>(await apiClient.put(`${AUTH_API_KEYS_BASE}/${keyId}`, updateData));
      
      console.log(colors.success('🔄 API key updated successfully!'));
      console.log(colors.info('━'.repeat(40)));
      console.log(`${colors.highlight('Name:')} ${colors.accent(updatedKey.name)}`);
      if (updatedKey.description || updateData.description) {
        console.log(`${colors.highlight('Description:')} ${colors.muted(updatedKey.description || updateData.description)}`);
      }
      console.log(`${colors.highlight('Access Level:')} ${colors.info(updatedKey.access_level)}`);
      console.log(`${colors.highlight('Permissions:')} ${colors.muted((updatedKey.permissions || []).join(', ') || 'legacy:full_access')}`);
      console.log(`${colors.highlight('Expires:')} ${updatedKey.expires_at ? colors.warning(formatDate(updatedKey.expires_at)) : colors.muted('Never')}`);
      console.log(colors.info('━'.repeat(40)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to update API key:'), colors.muted(errorMessage));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('delete')
  .alias('rm')
  .description('Delete an API key')
  .argument('<keyId>', 'API key ID')
  .option('-f, --force', 'Skip confirmation')
  .action(async (keyId, options) => {
    try {
      if (!options.force) {
        const apiKey = unwrapApiResponse<PlatformApiKey>(await apiClient.get(`${AUTH_API_KEYS_BASE}/${keyId}`));
        
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete "${apiKey.name}"? This action cannot be undone.`,
            default: false
          }
        ]);

        if (!confirm) {
          console.log(colors.warning('🚫 Operation cancelled'));
          return;
        }
      }

      await apiClient.delete(`${AUTH_API_KEYS_BASE}/${keyId}`);
      
      console.log(colors.success('🗑️  API key deleted successfully!'));
    } catch (error) {
      console.error(colors.error('✖ Failed to delete API key:'), colors.muted(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// MCP COMMANDS
// ============================================================================

const mcpCommand = new Command('mcp')
  .description(colors.accent('🤖 Model Context Protocol (MCP) - Secure AI agent access'));

mcpCommand
  .command('register-tool')
  .description('Register a new MCP tool')
  .option('--tool-id <id>', 'Tool ID')
  .option('--tool-name <name>', 'Tool name')
  .option('--organization-id <id>', 'Organization ID')
  .option('--keys <keys>', 'Comma-separated list of accessible key names')
  .option('--environments <envs>', 'Comma-separated list of environments')
  .option('--max-sessions <num>', 'Maximum concurrent sessions', '3')
  .option('--max-duration <seconds>', 'Maximum session duration in seconds', '900')
  .option('--webhook-url <url>', 'Webhook URL for notifications')
  .option('--auto-approve', 'Enable auto-approval for low-risk requests')
  .option('--risk-level <level>', 'Risk level (low, medium, high, critical)', 'medium')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      let toolData: any = {
        toolId: options.toolId,
        toolName: options.toolName,
        organizationId: options.organizationId,
        permissions: {
          keys: options.keys ? options.keys.split(',').map((k: string) => k.trim()) : [],
          environments: options.environments ? options.environments.split(',').map((e: string) => e.trim()) : ['development'],
          maxConcurrentSessions: parseInt(options.maxSessions),
          maxSessionDuration: parseInt(options.maxDuration)
        },
        webhookUrl: options.webhookUrl,
        autoApprove: options.autoApprove || false,
        riskLevel: options.riskLevel
      };

      if (options.interactive || !toolData.toolId || !toolData.toolName || !toolData.organizationId) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'toolId',
            message: 'Tool ID:',
            when: !toolData.toolId,
            validate: (input) => input.length > 0 || 'Tool ID is required'
          },
          {
            type: 'input',
            name: 'toolName',
            message: 'Tool name:',
            when: !toolData.toolName,
            validate: (input) => input.length > 0 || 'Tool name is required'
          },
          {
            type: 'input',
            name: 'organizationId',
            message: 'Organization ID:',
            when: !toolData.organizationId,
            validate: (input) => {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              return uuidRegex.test(input) || 'Please enter a valid UUID';
            }
          },
          {
            type: 'input',
            name: 'keys',
            message: 'Accessible key names (comma-separated):',
            filter: (input) => input.split(',').map((k: string) => k.trim()),
            when: toolData.permissions.keys.length === 0
          },
          {
            type: 'checkbox',
            name: 'environments',
            message: 'Accessible environments:',
            choices: ['development', 'staging', 'production'],
            default: ['development']
          },
          {
            type: 'number',
            name: 'maxConcurrentSessions',
            message: 'Maximum concurrent sessions:',
            default: 3,
            validate: (input) => input > 0 && input <= 10 || 'Must be between 1 and 10'
          },
          {
            type: 'number',
            name: 'maxSessionDuration',
            message: 'Maximum session duration (seconds):',
            default: 900,
            validate: (input) => input >= 60 && input <= 3600 || 'Must be between 60 and 3600 seconds'
          },
          {
            type: 'input',
            name: 'webhookUrl',
            message: 'Webhook URL (optional):'
          },
          {
            type: 'confirm',
            name: 'autoApprove',
            message: 'Enable auto-approval?',
            default: false
          },
          {
            type: 'select',
            name: 'riskLevel',
            message: 'Risk level:',
            choices: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
          }
        ]);

        if (answers.keys) toolData.permissions.keys = answers.keys;
        if (answers.environments) toolData.permissions.environments = answers.environments;
        if (answers.maxConcurrentSessions) toolData.permissions.maxConcurrentSessions = answers.maxConcurrentSessions;
        if (answers.maxSessionDuration) toolData.permissions.maxSessionDuration = answers.maxSessionDuration;
        
        toolData = { ...toolData, ...answers };
        delete toolData.keys;
        delete toolData.environments;
        delete toolData.maxConcurrentSessions;
        delete toolData.maxSessionDuration;
      }

      const tool = await apiClient.post('/api-keys/mcp/tools', toolData);
      
      console.log(colors.success('🤖 MCP tool registered successfully!'));
      console.log(colors.info('━'.repeat(50)));
      console.log(`${colors.highlight('Tool ID:')} ${colors.primary(tool.toolId)}`);
      console.log(`${colors.highlight('Name:')} ${colors.accent(tool.toolName)}`);
      console.log(`${colors.highlight('Risk Level:')} ${colors.warning(tool.riskLevel)}`);
      console.log(`${colors.highlight('Auto Approve:')} ${tool.autoApprove ? colors.success('Yes') : colors.error('No')}`);
      console.log(colors.info('━'.repeat(50)));
    } catch (error) {
      console.error(colors.error('✖ Failed to register MCP tool:'), colors.muted(error.message));
      process.exit(1);
    }
  });

mcpCommand
  .command('list-tools')
  .description('List registered MCP tools')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const tools = await apiClient.get('/api-keys/mcp/tools');

      if (options.json) {
        console.log(JSON.stringify(tools, null, 2));
        return;
      }

      if (tools.length === 0) {
        console.log(colors.warning('⚠️  No MCP tools found'));
        console.log(colors.muted('Run: lanonasis api-keys mcp register-tool'));
        return;
      }

      console.log(colors.primary('🤖 Registered MCP Tools'));
      console.log(colors.info('═'.repeat(80)));

      const table = new Table({
        head: ['Tool ID', 'Name', 'Risk Level', 'Status', 'Auto Approve', 'Created'].map(h => colors.accent(h)),
        style: { head: [], border: [] }
      });

      tools.forEach((tool: any) => {
        const statusColor = tool.status === 'active' ? colors.success :
                           tool.status === 'suspended' ? colors.error : colors.warning;
        
        table.push([
          tool.toolId,
          tool.toolName,
          tool.riskLevel,
          statusColor(tool.status),
          tool.autoApprove ? colors.success('Yes') : colors.error('No'),
          formatDate(tool.createdAt)
        ]);
      });

      console.log(table.toString());
      console.log(colors.info('═'.repeat(80)));
      console.log(colors.muted(`🤖 Total: ${colors.highlight(tools.length)} MCP tools`));
    } catch (error) {
      console.error(colors.error('✖ Failed to list MCP tools:'), colors.muted(error.message));
      process.exit(1);
    }
  });

mcpCommand
  .command('request-access')
  .description('Request access to API keys via MCP')
  .option('--tool-id <id>', 'Tool ID')
  .option('--organization-id <id>', 'Organization ID')
  .option('--keys <keys>', 'Comma-separated list of key names')
  .option('--environment <env>', 'Environment (development, staging, production)')
  .option('--justification <text>', 'Justification for access')
  .option('--duration <seconds>', 'Estimated duration in seconds', '900')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      let requestData: any = {
        toolId: options.toolId,
        organizationId: options.organizationId,
        keyNames: options.keys ? options.keys.split(',').map((k: string) => k.trim()) : [],
        environment: options.environment,
        justification: options.justification,
        estimatedDuration: parseInt(options.duration),
        context: {}
      };

      if (options.interactive || !requestData.toolId || !requestData.organizationId || 
          requestData.keyNames.length === 0 || !requestData.environment || !requestData.justification) {
        
        const tools = await apiClient.get('/api-keys/mcp/tools');
        
        const answers = await inquirer.prompt([
          {
            type: 'select',
            name: 'toolId',
            message: 'Select MCP tool:',
            when: !requestData.toolId && tools.length > 0,
            choices: tools.map((t: any) => ({ name: `${t.toolName} (${t.toolId})`, value: t.toolId }))
          },
          {
            type: 'input',
            name: 'organizationId',
            message: 'Organization ID:',
            when: !requestData.organizationId,
            validate: (input) => {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              return uuidRegex.test(input) || 'Please enter a valid UUID';
            }
          },
          {
            type: 'input',
            name: 'keyNames',
            message: 'Key names to access (comma-separated):',
            when: requestData.keyNames.length === 0,
            filter: (input) => input.split(',').map((k: string) => k.trim()),
            validate: (input) => input.length > 0 || 'At least one key name is required'
          },
          {
            type: 'select',
            name: 'environment',
            message: 'Environment:',
            when: !requestData.environment,
            choices: ['development', 'staging', 'production']
          },
          {
            type: 'input',
            name: 'justification',
            message: 'Justification for access:',
            when: !requestData.justification,
            validate: (input) => input.length > 0 || 'Justification is required'
          },
          {
            type: 'number',
            name: 'estimatedDuration',
            message: 'Estimated duration (seconds):',
            default: 900,
            validate: (input) => input >= 60 && input <= 3600 || 'Must be between 60 and 3600 seconds'
          }
        ]);

        requestData = { ...requestData, ...answers };
      }

      const response = await apiClient.post('/api-keys/mcp/request-access', requestData);
      
      console.log(colors.success('🔐 Access request created successfully!'));
      console.log(colors.info('━'.repeat(50)));
      console.log(`${colors.highlight('Request ID:')} ${colors.primary(response.requestId)}`);
      console.log(`${colors.highlight('Status:')} ${colors.accent(response.status)}`);
      console.log(colors.info('━'.repeat(50)));
      console.log(colors.warning('💡 Check the status with: lanonasis api-keys analytics usage'));
    } catch (error) {
      console.error(colors.error('✖ Failed to create access request:'), colors.muted(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// ANALYTICS COMMANDS
// ============================================================================

const analyticsCommand = new Command('analytics')
  .description('View API key usage analytics and security events');

analyticsCommand
  .command('usage')
  .description('View usage analytics')
  .option('--key-id <id>', 'Filter by specific API key')
  .option('--days <days>', 'Number of days to look back', '30')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      let url = '/api-keys/analytics/usage';
      const params = new URLSearchParams();
      
      if (options.keyId) params.append('keyId', options.keyId);
      if (options.days) params.append('days', options.days);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const analytics = await apiClient.get(url);

      if (options.json) {
        console.log(JSON.stringify(analytics, null, 2));
        return;
      }

      if (analytics.length === 0) {
        console.log(chalk.yellow('No usage data found'));
        return;
      }

      const table = new Table({
        head: ['Key ID', 'Operation', 'Tool ID', 'Success', 'Timestamp'].map(h => chalk.cyan(h)),
        style: { head: [], border: [] }
      });

      analytics.forEach((entry: any) => {
        const successColor = entry.success ? colors.success('✓') : colors.error('✗');
        
        table.push([
          truncateText(entry.keyId || '-', 20),
          entry.operation,
          truncateText(entry.toolId || '-', 15),
          successColor,
          formatDate(entry.timestamp)
        ]);
      });

      console.log(table.toString());
      console.log(colors.info('═'.repeat(80)));
      console.log(colors.muted(`📈 Total: ${colors.highlight(analytics.length)} events`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to get usage analytics:'), colors.muted(errorMessage));
      process.exit(1);
    }
  });

analyticsCommand
  .command('security-events')
  .description('View security events')
  .option('--severity <level>', 'Filter by severity (low, medium, high, critical)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      let url = '/api-keys/analytics/security-events';
      if (options.severity) {
        url += `?severity=${options.severity}`;
      }

      const events = await apiClient.get(url);

      if (options.json) {
        console.log(JSON.stringify(events, null, 2));
        return;
      }

      if (events.length === 0) {
        console.log(colors.success('✅ No security events found'));
        return;
      }

      console.log(colors.primary('🛡️  Security Events Monitor'));
      console.log(colors.info('═'.repeat(80)));

      const table = new Table({
        head: ['Event Type', 'Severity', 'Description', 'Resolved', 'Timestamp'].map(h => colors.accent(h)),
        style: { head: [], border: [] }
      });

      events.forEach((event: any) => {
        const severityColor = event.severity === 'critical' ? colors.error :
                             event.severity === 'high' ? colors.accent :
                             event.severity === 'medium' ? colors.warning : colors.success;
        
        table.push([
          event.eventType,
          severityColor(event.severity.toUpperCase()),
          truncateText(event.description, 40),
          event.resolved ? colors.success('✓') : colors.warning('Pending'),
          formatDate(event.timestamp)
        ]);
      });

      console.log(table.toString());
      console.log(colors.info('═'.repeat(80)));
      console.log(colors.muted(`🛡️  Total: ${colors.highlight(events.length)} security events`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to get security events:'), colors.muted(errorMessage));
      process.exit(1);
    }
  });

// Add subcommands
apiKeysCommand.addCommand(projectsCommand);
apiKeysCommand.addCommand(mcpCommand);
apiKeysCommand.addCommand(analyticsCommand);

export default apiKeysCommand;
