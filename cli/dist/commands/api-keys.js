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
const PROJECTS_API_BASE = '/api/v1/projects';
const VALID_ACCESS_LEVELS = ['public', 'authenticated', 'team', 'admin', 'enterprise'];
const VALID_KEY_CONTEXTS = ['personal', 'team', 'enterprise'];
function unwrapApiResponse(response) {
    if (response && typeof response === 'object' && 'data' in response) {
        return response.data ?? response;
    }
    return response;
}
function parseScopes(scopes) {
    if (!scopes) {
        return undefined;
    }
    const parsed = scopes
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean);
    return parsed.length > 0 ? parsed : undefined;
}
function parseKeyContext(keyContext) {
    if (!keyContext) {
        return undefined;
    }
    const normalized = keyContext.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }
    if (VALID_KEY_CONTEXTS.includes(normalized)) {
        return normalized;
    }
    throw new Error('Invalid key context. Allowed: personal, team, enterprise');
}
function exitUnsupported(feature, guidance) {
    console.error(colors.error(`✖ ${feature} is not exposed by the current auth-gateway API.`));
    for (const line of guidance) {
        console.error(colors.muted(`  • ${line}`));
    }
    process.exit(1);
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
        let projectData = {
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
        const projectRes = await apiClient.post(PROJECTS_API_BASE, projectData);
        const project = unwrapApiResponse(projectRes);
        console.log(chalk.green('✅ Project created successfully!'));
        console.log(chalk.blue(`Project ID: ${project.id}`));
        console.log(chalk.blue(`Name: ${project.name}`));
        if (project.description) {
            console.log(chalk.blue(`Description: ${project.description}`));
        }
    }
    catch (error) {
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
        const projects = unwrapApiResponse(await apiClient.get(PROJECTS_API_BASE));
        if (options.json) {
            console.log(JSON.stringify(projects, null, 2));
            return;
        }
        if (!Array.isArray(projects) || projects.length === 0) {
            console.log(chalk.yellow('No projects found'));
            return;
        }
        const table = new Table({
            head: ['ID', 'Name', 'Description', 'Owner', 'Created'].map(h => chalk.cyan(h)),
            style: { head: [], border: [] }
        });
        projects.forEach((project) => {
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
    }
    catch (error) {
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
    .option('--key-context <context>', 'Optional memory context (personal, team, enterprise)')
    .option('--expires-in-days <days>', 'Expiration in days (default: 365)', '365')
    .option('--scopes <scopes>', 'Comma-separated scopes (optional)')
    .option('--interactive', 'Interactive mode')
    .action(async (options) => {
    try {
        const accessLevel = (options.accessLevel || 'team').toLowerCase();
        const keyContext = parseKeyContext(options.keyContext);
        const expiresInDays = parseInt(options.expiresInDays, 10);
        if (!VALID_ACCESS_LEVELS.includes(accessLevel)) {
            throw new Error('Invalid access level. Allowed: public, authenticated, team, admin, enterprise');
        }
        if (!Number.isInteger(expiresInDays) || expiresInDays <= 0 || expiresInDays > 3650) {
            throw new Error('expires-in-days must be a positive integer up to 3650');
        }
        let keyData = {
            name: options.name,
            access_level: accessLevel,
            key_context: keyContext,
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
                    type: 'select',
                    name: 'key_context',
                    message: 'Memory context:',
                    choices: [
                        { name: 'legacy / unbounded (default)', value: '' },
                        ...VALID_KEY_CONTEXTS.map((context) => ({ name: context, value: context })),
                    ],
                    default: keyData.key_context || ''
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
                key_context: parseKeyContext(typeof answers.key_context === 'string' ? answers.key_context : undefined) ?? keyData.key_context,
                description: typeof answers.description === 'string'
                    ? answers.description.trim() || undefined
                    : keyData.description,
                scopes: parseScopes(typeof answers.scopes === 'string' ? answers.scopes : undefined) ?? keyData.scopes
            };
        }
        const apiKey = unwrapApiResponse(await apiClient.post(AUTH_API_KEYS_BASE, keyData));
        console.log(colors.success('🔐 API key created successfully!'));
        console.log(colors.info('━'.repeat(50)));
        console.log(`${colors.highlight('Key ID:')} ${colors.primary(apiKey.id)}`);
        console.log(`${colors.highlight('Name:')} ${colors.accent(apiKey.name)}`);
        console.log(`${colors.highlight('Access Level:')} ${colors.info(apiKey.access_level || keyData.access_level)}`);
        console.log(`${colors.highlight('Key Context:')} ${colors.info(apiKey.key_context || keyData.key_context || 'legacy')}`);
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
        }
        else {
            console.log(colors.warning('⚠️  Key value was not returned. If newly created, it cannot be retrieved later.'));
        }
    }
    catch (error) {
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
        const apiKeys = unwrapApiResponse(await apiClient.get(`${AUTH_API_KEYS_BASE}${query}`));
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
            head: ['ID', 'Name', 'Access', 'Context', 'Permissions', 'Service', 'Status', 'Expires'].map(h => colors.accent(h)),
            style: { head: [], border: [] }
        });
        apiKeys.forEach((key) => {
            const statusColor = key.is_active ? colors.success : colors.error;
            table.push([
                truncateText(key.id, 20),
                key.name,
                key.access_level,
                key.key_context || 'legacy',
                truncateText((key.permissions || []).join(', ') || 'legacy:full_access', 28),
                key.service || 'all',
                statusColor(key.is_active ? 'active' : 'inactive'),
                key.expires_at ? formatDate(key.expires_at) : colors.muted('Never')
            ]);
        });
        console.log(table.toString());
        console.log(colors.info('═'.repeat(80)));
        console.log(colors.muted(`🔢 Total: ${colors.highlight(apiKeys.length)} API keys`));
    }
    catch (error) {
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
        const apiKey = unwrapApiResponse(await apiClient.get(`${AUTH_API_KEYS_BASE}/${keyId}`));
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
        console.log(`${colors.highlight('Key Context:')} ${colors.info(apiKey.key_context || 'legacy')}`);
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
    }
    catch (error) {
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
        let updateData = {};
        if (options.name)
            updateData.name = options.name;
        if (options.description !== undefined)
            updateData.description = options.description.trim() || null;
        if (options.accessLevel) {
            const accessLevel = options.accessLevel.toLowerCase();
            if (!VALID_ACCESS_LEVELS.includes(accessLevel)) {
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
        if (options.clearExpiry)
            updateData.clear_expiry = true;
        if (options.scopes)
            updateData.scopes = parseScopes(options.scopes);
        if (options.interactive || Object.keys(updateData).length === 0) {
            const current = unwrapApiResponse(await apiClient.get(`${AUTH_API_KEYS_BASE}/${keyId}`));
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
        const updatedKey = unwrapApiResponse(await apiClient.put(`${AUTH_API_KEYS_BASE}/${keyId}`, updateData));
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
    }
    catch (error) {
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
            const apiKey = unwrapApiResponse(await apiClient.get(`${AUTH_API_KEYS_BASE}/${keyId}`));
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
    }
    catch (error) {
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
    void options;
    exitUnsupported('MCP tool registration', [
        'No /api/v1/auth/api-keys/mcp/* routes exist on the current auth-gateway.',
        'Use API key service scoping instead: lanonasis api-keys create or update plus /service-scopes support on the gateway.',
        'Manage MCP-specific workflows from the dashboard until dedicated routes are exposed.',
    ]);
});
mcpCommand
    .command('list-tools')
    .description('List registered MCP tools')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
    void options;
    exitUnsupported('MCP tool listing', [
        'No /api/v1/auth/api-keys/mcp/* routes exist on the current auth-gateway.',
        'The current gateway exposes configured external services at /api/v1/auth/api-keys/services/configured.',
    ]);
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
    void options;
    exitUnsupported('MCP access requests', [
        'No /api/v1/auth/api-keys/mcp/* routes exist on the current auth-gateway.',
        'Use platform API keys plus service scoping for current gateway-backed access control.',
    ]);
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
    void options;
    exitUnsupported('API key usage analytics', [
        'No /api/v1/auth/api-keys/analytics/* routes exist on the current auth-gateway.',
        'Use dashboard reporting or direct platform logs until analytics endpoints are exposed.',
    ]);
});
analyticsCommand
    .command('security-events')
    .description('View security events')
    .option('--severity <level>', 'Filter by severity (low, medium, high, critical)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
    void options;
    exitUnsupported('API key security event analytics', [
        'No /api/v1/auth/api-keys/analytics/* routes exist on the current auth-gateway.',
        'Use dashboard security reporting until gateway analytics endpoints are exposed.',
    ]);
});
// Add subcommands
apiKeysCommand.addCommand(projectsCommand);
apiKeysCommand.addCommand(mcpCommand);
apiKeysCommand.addCommand(analyticsCommand);
export default apiKeysCommand;
