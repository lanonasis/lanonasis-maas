import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { apiClient } from '../utils/api.js';
import { formatTableData, formatDate, truncateText } from '../utils/formatting.js';

const apiKeysCommand = new Command('api-keys')
  .alias('keys')
  .description('Manage API keys securely');

// ============================================================================
// PROJECT COMMANDS
// ============================================================================

const projectsCommand = new Command('projects')
  .description('Manage API key projects');

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
  .option('-v, --value <value>', 'API key value')
  .option('-t, --type <type>', 'Key type (api_key, database_url, oauth_token, etc.)')
  .option('-e, --environment <env>', 'Environment (development, staging, production)')
  .option('-p, --project-id <id>', 'Project ID')
  .option('--access-level <level>', 'Access level (public, authenticated, team, admin, enterprise)')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--expires-at <date>', 'Expiration date (ISO format)')
  .option('--rotation-frequency <days>', 'Rotation frequency in days', '90')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      let keyData: any = {
        name: options.name,
        value: options.value,
        keyType: options.type,
        environment: options.environment || 'development',
        projectId: options.projectId,
        accessLevel: options.accessLevel || 'team',
        tags: options.tags ? options.tags.split(',').map((tag: string) => tag.trim()) : [],
        expiresAt: options.expiresAt,
        rotationFrequency: parseInt(options.rotationFrequency)
      };

      if (options.interactive || !keyData.name || !keyData.value || !keyData.projectId) {
        const projects = await apiClient.get('/api-keys/projects');
        
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'API key name:',
            when: !keyData.name,
            validate: (input) => input.length > 0 || 'Name is required'
          },
          {
            type: 'password',
            name: 'value',
            message: 'API key value:',
            when: !keyData.value,
            validate: (input) => input.length > 0 || 'Value is required'
          },
          {
            type: 'list',
            name: 'keyType',
            message: 'Key type:',
            when: !keyData.keyType,
            choices: [
              'api_key',
              'database_url',
              'oauth_token',
              'certificate',
              'ssh_key',
              'webhook_secret',
              'encryption_key'
            ]
          },
          {
            type: 'list',
            name: 'environment',
            message: 'Environment:',
            choices: ['development', 'staging', 'production'],
            default: 'development'
          },
          {
            type: 'list',
            name: 'projectId',
            message: 'Select project:',
            when: !keyData.projectId && projects.length > 0,
            choices: projects.map((p: any) => ({ name: `${p.name} (${p.id})`, value: p.id }))
          },
          {
            type: 'list',
            name: 'accessLevel',
            message: 'Access level:',
            choices: ['public', 'authenticated', 'team', 'admin', 'enterprise'],
            default: 'team'
          },
          {
            type: 'input',
            name: 'tags',
            message: 'Tags (comma-separated, optional):',
            filter: (input) => input ? input.split(',').map((tag: string) => tag.trim()) : []
          },
          {
            type: 'input',
            name: 'expiresAt',
            message: 'Expiration date (YYYY-MM-DD, optional):',
            validate: (input) => {
              if (!input) return true;
              const date = new Date(input);
              return !isNaN(date.getTime()) || 'Please enter a valid date';
            },
            filter: (input) => input ? new Date(input).toISOString() : undefined
          },
          {
            type: 'number',
            name: 'rotationFrequency',
            message: 'Rotation frequency (days):',
            default: 90,
            validate: (input) => input > 0 && input <= 365 || 'Must be between 1 and 365 days'
          }
        ]);

        keyData = { ...keyData, ...answers };
      }

      const apiKey = await apiClient.post('/api-keys', keyData);
      
      console.log(chalk.green('✅ API key created successfully!'));
      console.log(chalk.blue(`Key ID: ${apiKey.id}`));
      console.log(chalk.blue(`Name: ${apiKey.name}`));
      console.log(chalk.blue(`Type: ${apiKey.keyType}`));
      console.log(chalk.blue(`Environment: ${apiKey.environment}`));
      console.log(chalk.yellow('⚠️  The key value is securely encrypted and cannot be retrieved later.'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to create API key:'), error.message);
      process.exit(1);
    }
  });

apiKeysCommand
  .command('list')
  .alias('ls')
  .description('List API keys')
  .option('-p, --project-id <id>', 'Filter by project ID')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      let url = '/api-keys';
      if (options.projectId) {
        url += `?projectId=${options.projectId}`;
      }

      const apiKeys = await apiClient.get(url);

      if (options.json) {
        console.log(JSON.stringify(apiKeys, null, 2));
        return;
      }

      if (apiKeys.length === 0) {
        console.log(chalk.yellow('No API keys found'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Name', 'Type', 'Environment', 'Status', 'Usage', 'Last Rotated'].map(h => chalk.cyan(h)),
        style: { head: [], border: [] }
      });

      apiKeys.forEach((key: any) => {
        const statusColor = key.status === 'active' ? chalk.green : 
                           key.status === 'rotating' ? chalk.yellow : chalk.red;
        
        table.push([
          truncateText(key.id, 20),
          key.name,
          key.keyType,
          key.environment,
          statusColor(key.status),
          key.usageCount.toString(),
          formatDate(key.lastRotated)
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`Total: ${apiKeys.length} API keys`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to list API keys:'), error.message);
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
      const apiKey = await apiClient.get(`/api-keys/${keyId}`);

      if (options.json) {
        console.log(JSON.stringify(apiKey, null, 2));
        return;
      }

      console.log(chalk.cyan('API Key Details:'));
      console.log(`ID: ${apiKey.id}`);
      console.log(`Name: ${apiKey.name}`);
      console.log(`Type: ${apiKey.keyType}`);
      console.log(`Environment: ${apiKey.environment}`);
      console.log(`Project ID: ${apiKey.projectId}`);
      console.log(`Access Level: ${apiKey.accessLevel}`);
      console.log(`Status: ${apiKey.status}`);
      console.log(`Usage Count: ${apiKey.usageCount}`);
      console.log(`Tags: ${apiKey.tags.join(', ') || 'None'}`);
      console.log(`Rotation Frequency: ${apiKey.rotationFrequency} days`);
      console.log(`Last Rotated: ${formatDate(apiKey.lastRotated)}`);
      console.log(`Created: ${formatDate(apiKey.createdAt)}`);
      console.log(`Updated: ${formatDate(apiKey.updatedAt)}`);
      
      if (apiKey.expiresAt) {
        console.log(`Expires: ${formatDate(apiKey.expiresAt)}`);
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to get API key:'), error.message);
      process.exit(1);
    }
  });

apiKeysCommand
  .command('update')
  .description('Update an API key')
  .argument('<keyId>', 'API key ID')
  .option('-n, --name <name>', 'New name')
  .option('-v, --value <value>', 'New value')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--rotation-frequency <days>', 'Rotation frequency in days')
  .option('--interactive', 'Interactive mode')
  .action(async (keyId, options) => {
    try {
      let updateData: any = {};

      if (options.name) updateData.name = options.name;
      if (options.value) updateData.value = options.value;
      if (options.tags) updateData.tags = options.tags.split(',').map((tag: string) => tag.trim());
      if (options.rotationFrequency) updateData.rotationFrequency = parseInt(options.rotationFrequency);

      if (options.interactive || Object.keys(updateData).length === 0) {
        const current = await apiClient.get(`/api-keys/${keyId}`);
        
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Name:',
            default: current.name,
            when: !updateData.name
          },
          {
            type: 'confirm',
            name: 'updateValue',
            message: 'Update the key value?',
            default: false,
            when: !updateData.value
          },
          {
            type: 'password',
            name: 'value',
            message: 'New key value:',
            when: (answers) => answers.updateValue
          },
          {
            type: 'input',
            name: 'tags',
            message: 'Tags (comma-separated):',
            default: current.tags.join(', '),
            filter: (input) => input.split(',').map((tag: string) => tag.trim()),
            when: !updateData.tags
          },
          {
            type: 'number',
            name: 'rotationFrequency',
            message: 'Rotation frequency (days):',
            default: current.rotationFrequency,
            validate: (input) => input > 0 && input <= 365 || 'Must be between 1 and 365 days',
            when: !updateData.rotationFrequency
          }
        ]);

        updateData = { ...updateData, ...answers };
        delete updateData.updateValue;
      }

      const updatedKey = await apiClient.put(`/api-keys/${keyId}`, updateData);
      
      console.log(chalk.green('✅ API key updated successfully!'));
      console.log(chalk.blue(`Name: ${updatedKey.name}`));
      console.log(chalk.blue(`Status: ${updatedKey.status}`));
      if (updateData.value) {
        console.log(chalk.yellow('⚠️  The key value has been updated and re-encrypted.'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to update API key:'), error.message);
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
        const apiKey = await apiClient.get(`/api-keys/${keyId}`);
        
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete "${apiKey.name}"? This action cannot be undone.`,
            default: false
          }
        ]);

        if (!confirm) {
          console.log(chalk.yellow('Operation cancelled'));
          return;
        }
      }

      await apiClient.delete(`/api-keys/${keyId}`);
      
      console.log(chalk.green('✅ API key deleted successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to delete API key:'), error.message);
      process.exit(1);
    }
  });

// ============================================================================
// MCP COMMANDS
// ============================================================================

const mcpCommand = new Command('mcp')
  .description('Manage MCP tools and access');

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
            type: 'list',
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
      
      console.log(chalk.green('✅ MCP tool registered successfully!'));
      console.log(chalk.blue(`Tool ID: ${tool.toolId}`));
      console.log(chalk.blue(`Name: ${tool.toolName}`));
      console.log(chalk.blue(`Risk Level: ${tool.riskLevel}`));
      console.log(chalk.blue(`Auto Approve: ${tool.autoApprove ? 'Yes' : 'No'}`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to register MCP tool:'), error.message);
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
        console.log(chalk.yellow('No MCP tools found'));
        return;
      }

      const table = new Table({
        head: ['Tool ID', 'Name', 'Risk Level', 'Status', 'Auto Approve', 'Created'].map(h => chalk.cyan(h)),
        style: { head: [], border: [] }
      });

      tools.forEach((tool: any) => {
        const statusColor = tool.status === 'active' ? chalk.green : 
                           tool.status === 'suspended' ? chalk.red : chalk.yellow;
        
        table.push([
          tool.toolId,
          tool.toolName,
          tool.riskLevel,
          statusColor(tool.status),
          tool.autoApprove ? 'Yes' : 'No',
          formatDate(tool.createdAt)
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`Total: ${tools.length} MCP tools`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to list MCP tools:'), error.message);
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
            type: 'list',
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
            type: 'list',
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
      
      console.log(chalk.green('✅ Access request created successfully!'));
      console.log(chalk.blue(`Request ID: ${response.requestId}`));
      console.log(chalk.blue(`Status: ${response.status}`));
      console.log(chalk.yellow('💡 Check the status with: memory api-keys analytics usage'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to create access request:'), error.message);
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
        const successColor = entry.success ? chalk.green('✓') : chalk.red('✗');
        
        table.push([
          truncateText(entry.keyId || '-', 20),
          entry.operation,
          truncateText(entry.toolId || '-', 15),
          successColor,
          formatDate(entry.timestamp)
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`Total: ${analytics.length} events`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to get usage analytics:'), error.message);
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
        console.log(chalk.yellow('No security events found'));
        return;
      }

      const table = new Table({
        head: ['Event Type', 'Severity', 'Description', 'Resolved', 'Timestamp'].map(h => chalk.cyan(h)),
        style: { head: [], border: [] }
      });

      events.forEach((event: any) => {
        const severityColor = event.severity === 'critical' ? chalk.red :
                             event.severity === 'high' ? chalk.magenta :
                             event.severity === 'medium' ? chalk.yellow : chalk.green;
        
        table.push([
          event.eventType,
          severityColor(event.severity.toUpperCase()),
          truncateText(event.description, 40),
          event.resolved ? chalk.green('✓') : chalk.yellow('Pending'),
          formatDate(event.timestamp)
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`Total: ${events.length} security events`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to get security events:'), error.message);
      process.exit(1);
    }
  });

// Add subcommands
apiKeysCommand.addCommand(projectsCommand);
apiKeysCommand.addCommand(mcpCommand);
apiKeysCommand.addCommand(analyticsCommand);

export default apiKeysCommand;