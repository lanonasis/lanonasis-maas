import chalk from 'chalk';
import inquirer from 'inquirer';
import * as path from 'path';
import { CLIConfig } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
export function configCommands(program) {
    // Generic config set command
    program
        .command('set <key> <value>')
        .description('Set configuration value')
        .action(async (key, value) => {
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
                }
                else {
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
        .action(async (key) => {
        const config = new CLIConfig();
        await config.init();
        const value = config.get(key);
        if (value !== undefined) {
            console.log(chalk.green(`${key}:`), value);
        }
        else {
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
            { key: 'mcp-server-url', description: 'Remote MCP server URL', current: config.get('mcpServerUrl') || 'https://mcp.lanonasis.com' },
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
        .action(async (url) => {
        const config = new CLIConfig();
        await config.init();
        if (!url) {
            const answer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'url',
                    message: 'API URL:',
                    default: config.getApiUrl(),
                    validate: (input) => {
                        try {
                            new URL(input);
                            return true;
                        }
                        catch {
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
                Object.entries(health.dependencies).forEach(([name, info]) => {
                    const status = info.status === 'healthy' ? chalk.green('✓') : chalk.red('✖');
                    const responseTime = info.response_time || info.latency_ms || 0;
                    console.log(`  ${status} ${name}: ${info.status} (${responseTime}ms)`);
                });
            }
        }
        catch (error) {
            console.log(chalk.red('✖ Connection failed'));
            const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorCode === 'ECONNREFUSED') {
                console.error(chalk.red('Cannot connect to API server'));
                console.log(chalk.yellow('Make sure the API server is running'));
            }
            else {
                console.error(chalk.red('Error:'), errorMessage);
            }
            process.exit(1);
        }
    });
    // Service discovery and endpoint management
    program
        .command('discover')
        .description('Discover service endpoints')
        .option('-v, --verbose', 'show detailed discovery information')
        .action(async (options) => {
        const config = new CLIConfig();
        await config.init();
        console.log(chalk.blue('🔍 Discovering service endpoints...'));
        console.log();
        try {
            await config.discoverServices(options.verbose);
            const services = config.get('discoveredServices');
            if (services) {
                console.log(chalk.green('✓ Service discovery completed'));
                console.log();
                console.log(chalk.yellow('Discovered endpoints:'));
                console.log(`  Auth: ${services.auth_base}`);
                console.log(`  Memory: ${services.memory_base}`);
                console.log(`  MCP HTTP: ${services.mcp_base}`);
                console.log(`  MCP WebSocket: ${services.mcp_ws_base}`);
                console.log(`  MCP SSE: ${services.mcp_sse_base}`);
                console.log(`  Project: ${services.project_scope}`);
            }
        }
        catch {
            console.log(chalk.red('✖ Service discovery failed'));
            console.log(chalk.gray('Using fallback endpoints'));
        }
    });
    program
        .command('endpoints')
        .description('Show current service endpoints')
        .action(async () => {
        const config = new CLIConfig();
        await config.init();
        const services = config.get('discoveredServices');
        const hasManualOverrides = config.hasManualEndpointOverrides();
        const lastDiscovery = config.get('lastServiceDiscovery');
        const lastManualUpdate = config.get('lastManualEndpointUpdate');
        console.log(chalk.blue.bold('🌐 Service Endpoints'));
        console.log();
        if (services) {
            console.log(chalk.yellow('Current endpoints:'));
            console.log(`  Auth Base:      ${chalk.white(services.auth_base)}`);
            console.log(`  Memory Base:    ${chalk.white(services.memory_base)}`);
            console.log(`  MCP HTTP:       ${chalk.white(services.mcp_base)}`);
            console.log(`  MCP WebSocket:  ${chalk.white(services.mcp_ws_base)}`);
            console.log(`  MCP SSE:        ${chalk.white(services.mcp_sse_base)}`);
            console.log(`  Project Scope:  ${chalk.white(services.project_scope)}`);
            console.log();
            if (hasManualOverrides) {
                console.log(chalk.cyan('📝 Manual overrides are active'));
                if (lastManualUpdate) {
                    const updateDate = new Date(lastManualUpdate);
                    console.log(`   Last updated: ${updateDate.toLocaleString()}`);
                }
            }
            else if (lastDiscovery) {
                const discoveryDate = new Date(lastDiscovery);
                console.log(chalk.green('🔍 Endpoints from service discovery'));
                console.log(`   Last discovered: ${discoveryDate.toLocaleString()}`);
            }
            else {
                console.log(chalk.gray('📋 Using fallback endpoints'));
            }
        }
        else {
            console.log(chalk.yellow('⚠️  No endpoints configured'));
            console.log(chalk.gray('Run: lanonasis config discover'));
        }
    });
    program
        .command('set-endpoint <type> <url>')
        .description('Set manual endpoint override (auth|memory|mcp-http|mcp-ws|mcp-sse)')
        .action(async (type, url) => {
        const config = new CLIConfig();
        await config.init();
        // Validate URL format
        try {
            new URL(url);
        }
        catch {
            console.log(chalk.red('✖ Invalid URL format'));
            process.exit(1);
        }
        // Map type to config key
        const endpointMap = {
            'auth': 'auth_base',
            'memory': 'memory_base',
            'mcp-http': 'mcp_base',
            'mcp-ws': 'mcp_ws_base',
            'mcp-sse': 'mcp_sse_base'
        };
        const configKey = endpointMap[type];
        if (!configKey) {
            console.log(chalk.red('✖ Invalid endpoint type'));
            console.log(chalk.gray('Valid types: auth, memory, mcp-http, mcp-ws, mcp-sse'));
            process.exit(1);
        }
        // Set the manual override
        const overrides = { [configKey]: url };
        await config.setManualEndpoints(overrides);
        console.log(chalk.green(`✓ ${type} endpoint set to:`), url);
        console.log(chalk.cyan('💡 Use "lanonasis config clear-overrides" to remove manual overrides'));
    });
    program
        .command('clear-overrides')
        .description('Clear manual endpoint overrides and rediscover services')
        .action(async () => {
        const config = new CLIConfig();
        await config.init();
        if (!config.hasManualEndpointOverrides()) {
            console.log(chalk.yellow('⚠️  No manual overrides to clear'));
            return;
        }
        await config.clearManualEndpointOverrides();
        console.log(chalk.green('✓ Manual endpoint overrides cleared'));
        console.log(chalk.cyan('✓ Service endpoints rediscovered'));
    });
    // Validate configuration
    program
        .command('validate')
        .description('Validate configuration and check for issues')
        .option('-v, --verbose', 'show detailed validation information')
        .option('--repair', 'automatically repair common issues')
        .action(async (options) => {
        const config = new CLIConfig();
        await config.init();
        console.log(chalk.blue.bold('🔍 Configuration Validation'));
        console.log(chalk.cyan('━'.repeat(50)));
        console.log();
        const validation = {
            configExists: false,
            configReadable: false,
            configVersion: null,
            configFormat: false,
            authenticationValid: false,
            endpointsValid: false,
            mcpConfigValid: false,
            backupExists: false,
            issues: [],
            repairs: []
        };
        // Step 1: Check config file existence and readability
        console.log(chalk.cyan('1. Configuration File'));
        try {
            validation.configExists = await config.exists();
            if (validation.configExists) {
                console.log(chalk.green('   ✓ Config file exists at'), config.getConfigPath());
                // Try to read the config
                await config.load();
                validation.configReadable = true;
                console.log(chalk.green('   ✓ Config file is readable'));
                // Check config version
                validation.configVersion = config.get('version');
                if (validation.configVersion) {
                    console.log(chalk.green('   ✓ Config version:'), validation.configVersion);
                }
                else {
                    console.log(chalk.yellow('   ⚠ Config version missing (legacy config)'));
                    validation.issues.push('Config version missing');
                    if (options.repair) {
                        await config.save(); // This will add the version
                        validation.repairs.push('Added config version');
                        console.log(chalk.cyan('   → Repaired: Added config version'));
                    }
                }
                validation.configFormat = true;
            }
            else {
                console.log(chalk.red('   ✖ Config file not found'));
                validation.issues.push('Config file does not exist');
                if (options.repair) {
                    await config.save(); // Create empty config
                    validation.repairs.push('Created config file');
                    console.log(chalk.cyan('   → Repaired: Created config file'));
                }
            }
        }
        catch (error) {
            console.log(chalk.red('   ✖ Config file is corrupted or unreadable'));
            console.log(chalk.gray(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
            validation.issues.push('Config file is corrupted');
            if (options.repair) {
                try {
                    // Try to backup the corrupted config
                    const backupPath = await config.backupConfig();
                    console.log(chalk.cyan(`   → Backed up corrupted config to: ${backupPath}`));
                    // Create new config
                    await config.clear();
                    await config.save();
                    validation.repairs.push('Recreated corrupted config file');
                    console.log(chalk.cyan('   → Repaired: Recreated config file'));
                }
                catch {
                    console.log(chalk.red('   ✖ Could not repair corrupted config'));
                }
            }
        }
        // Step 2: Validate authentication configuration
        console.log(chalk.cyan('\n2. Authentication Configuration'));
        const token = config.getToken();
        const vendorKey = config.getVendorKey();
        const authMethod = config.get('authMethod');
        if (!token && !vendorKey) {
            console.log(chalk.yellow('   ⚠ No authentication credentials configured'));
            validation.issues.push('No authentication credentials');
        }
        else {
            console.log(chalk.green('   ✓ Authentication credentials found'));
            // Validate auth method consistency
            if (vendorKey && authMethod !== 'vendor_key') {
                console.log(chalk.yellow('   ⚠ Auth method mismatch (has vendor key but method is not vendor_key)'));
                validation.issues.push('Auth method mismatch');
                if (options.repair) {
                    config.set('authMethod', 'vendor_key');
                    await config.save();
                    validation.repairs.push('Fixed auth method for vendor key');
                    console.log(chalk.cyan('   → Repaired: Set auth method to vendor_key'));
                }
            }
            else if (token && !vendorKey && authMethod !== 'jwt' && authMethod !== 'oauth') {
                console.log(chalk.yellow('   ⚠ Auth method mismatch (has token but method is not jwt/oauth)'));
                validation.issues.push('Auth method mismatch');
                if (options.repair) {
                    config.set('authMethod', 'jwt');
                    await config.save();
                    validation.repairs.push('Fixed auth method for token');
                    console.log(chalk.cyan('   → Repaired: Set auth method to jwt'));
                }
            }
            // Validate vendor key format if present
            if (vendorKey) {
                const formatValidation = config.validateVendorKeyFormat(vendorKey);
                if (formatValidation === true) {
                    console.log(chalk.green('   ✓ Vendor key format is valid'));
                }
                else {
                    console.log(chalk.red('   ✖ Vendor key format is invalid'));
                    validation.issues.push('Invalid vendor key format');
                }
            }
            // Test authentication validity
            try {
                const isValid = await config.validateStoredCredentials();
                validation.authenticationValid = isValid;
                if (isValid) {
                    console.log(chalk.green('   ✓ Authentication credentials are valid'));
                }
                else {
                    console.log(chalk.red('   ✖ Authentication credentials are invalid'));
                    validation.issues.push('Invalid authentication credentials');
                }
            }
            catch (error) {
                console.log(chalk.yellow('   ⚠ Could not validate authentication credentials'));
                if (options.verbose) {
                    console.log(chalk.gray(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            }
        }
        // Step 3: Validate service endpoints
        console.log(chalk.cyan('\n3. Service Endpoints'));
        try {
            await config.discoverServices(options.verbose);
            const services = config.get('discoveredServices');
            if (services) {
                validation.endpointsValid = true;
                console.log(chalk.green('   ✓ Service endpoints are configured'));
                // Validate endpoint URLs
                const endpoints = [
                    { name: 'Auth', url: services.auth_base },
                    { name: 'Memory', url: services.memory_base },
                    { name: 'MCP HTTP', url: services.mcp_base },
                    { name: 'MCP WebSocket', url: services.mcp_ws_base },
                    { name: 'MCP SSE', url: services.mcp_sse_base }
                ];
                for (const endpoint of endpoints) {
                    if (endpoint.url) {
                        try {
                            new URL(endpoint.url);
                            if (options.verbose) {
                                console.log(chalk.green(`     ✓ ${endpoint.name}: ${endpoint.url}`));
                            }
                        }
                        catch {
                            console.log(chalk.red(`   ✖ Invalid ${endpoint.name} URL: ${endpoint.url}`));
                            validation.issues.push(`Invalid ${endpoint.name} URL`);
                        }
                    }
                }
                // Check for manual overrides
                if (config.hasManualEndpointOverrides()) {
                    console.log(chalk.cyan('   ℹ Manual endpoint overrides are active'));
                    const lastUpdate = config.get('lastManualEndpointUpdate');
                    if (lastUpdate && options.verbose) {
                        const updateDate = new Date(lastUpdate);
                        console.log(chalk.gray(`     Last updated: ${updateDate.toLocaleString()}`));
                    }
                }
            }
            else {
                console.log(chalk.red('   ✖ Service endpoints are not configured'));
                validation.issues.push('Service endpoints not configured');
            }
        }
        catch {
            console.log(chalk.red('   ✖ Service endpoint discovery failed'));
            validation.issues.push('Service endpoint discovery failed');
            if (options.repair) {
                // Set fallback endpoints
                await config.setManualEndpoints({
                    auth_base: 'https://api.lanonasis.com',
                    memory_base: 'https://api.lanonasis.com/api/v1',
                    mcp_base: 'https://mcp.lanonasis.com/api/v1',
                    mcp_ws_base: 'wss://mcp.lanonasis.com/ws',
                    mcp_sse_base: 'https://mcp.lanonasis.com/api/v1/events'
                });
                validation.repairs.push('Set fallback service endpoints');
                console.log(chalk.cyan('   → Repaired: Set fallback service endpoints'));
            }
        }
        // Step 4: Validate MCP configuration
        console.log(chalk.cyan('\n4. MCP Configuration'));
        const mcpPreference = config.get('mcpPreference');
        // const mcpServerPath = config.get<string>('mcpServerPath');
        const mcpServerUrl = config.get('mcpServerUrl');
        if (mcpPreference) {
            if (['local', 'remote', 'auto'].includes(mcpPreference)) {
                console.log(chalk.green(`   ✓ MCP preference: ${mcpPreference}`));
                validation.mcpConfigValid = true;
            }
            else {
                console.log(chalk.red(`   ✖ Invalid MCP preference: ${mcpPreference}`));
                validation.issues.push('Invalid MCP preference');
                if (options.repair) {
                    config.set('mcpPreference', 'auto');
                    await config.save();
                    validation.repairs.push('Reset MCP preference to auto');
                    console.log(chalk.cyan('   → Repaired: Reset MCP preference to auto'));
                }
            }
        }
        else {
            console.log(chalk.yellow('   ⚠ MCP preference not set (using default: auto)'));
            if (options.repair) {
                config.set('mcpPreference', 'auto');
                await config.save();
                validation.repairs.push('Set default MCP preference');
                console.log(chalk.cyan('   → Repaired: Set MCP preference to auto'));
            }
        }
        // Validate MCP URLs if present
        if (mcpServerUrl) {
            try {
                new URL(mcpServerUrl);
                console.log(chalk.green('   ✓ MCP server URL is valid'));
            }
            catch {
                console.log(chalk.red(`   ✖ Invalid MCP server URL: ${mcpServerUrl}`));
                validation.issues.push('Invalid MCP server URL');
            }
        }
        // Step 5: Check for configuration backup
        console.log(chalk.cyan('\n5. Configuration Backup'));
        try {
            const configDir = path.dirname(config.getConfigPath());
            const fs = await import('fs/promises');
            const files = await fs.readdir(configDir);
            const backupFiles = files.filter(f => f.startsWith('config.backup.'));
            if (backupFiles.length > 0) {
                validation.backupExists = true;
                console.log(chalk.green(`   ✓ Found ${backupFiles.length} configuration backup(s)`));
                if (options.verbose) {
                    const latestBackup = backupFiles.sort().reverse()[0];
                    console.log(chalk.gray(`     Latest backup: ${latestBackup}`));
                }
            }
            else {
                console.log(chalk.yellow('   ⚠ No configuration backups found'));
                if (options.repair) {
                    const backupPath = await config.backupConfig();
                    validation.repairs.push('Created configuration backup');
                    console.log(chalk.cyan(`   → Repaired: Created backup at ${path.basename(backupPath)}`));
                }
            }
        }
        catch (error) {
            console.log(chalk.yellow('   ⚠ Could not check for backups'));
            if (options.verbose) {
                console.log(chalk.gray(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        }
        // Summary and recommendations
        console.log(chalk.blue.bold('\n📋 Configuration Validation Summary'));
        console.log(chalk.cyan('━'.repeat(50)));
        if (validation.issues.length === 0) {
            console.log(chalk.green('✅ Configuration validation passed!'));
            console.log(chalk.cyan('   Your configuration is valid and healthy.'));
        }
        else {
            console.log(chalk.red(`❌ Found ${validation.issues.length} issue(s):`));
            validation.issues.forEach(issue => {
                console.log(chalk.red(`   • ${issue}`));
            });
        }
        if (validation.repairs.length > 0) {
            console.log(chalk.yellow(`\n🔧 Applied ${validation.repairs.length} repair(s):`));
            validation.repairs.forEach(repair => {
                console.log(chalk.cyan(`   • ${repair}`));
            });
        }
        // Recommendations
        const recommendations = [];
        if (!validation.configExists && !options.repair) {
            recommendations.push('Run: lanonasis config validate --repair');
        }
        if (!validation.authenticationValid) {
            recommendations.push('Run: lanonasis auth login');
        }
        if (!validation.endpointsValid && !options.repair) {
            recommendations.push('Run: lanonasis config discover');
        }
        if (!validation.backupExists && !options.repair) {
            recommendations.push('Run: lanonasis config validate --repair (to create backup)');
        }
        if (recommendations.length > 0) {
            console.log(chalk.yellow('\n💡 Recommended actions:'));
            recommendations.forEach(rec => {
                console.log(chalk.cyan(`   • ${rec}`));
            });
        }
    });
    // Backup configuration
    program
        .command('backup')
        .description('Create a backup of current configuration')
        .action(async () => {
        const config = new CLIConfig();
        await config.init();
        try {
            const backupPath = await config.backupConfig();
            console.log(chalk.green('✓ Configuration backed up to:'));
            console.log(chalk.cyan(`  ${backupPath}`));
        }
        catch (error) {
            console.log(chalk.red('✖ Failed to create backup:'));
            console.log(chalk.gray(`  ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    });
    // Restore configuration from backup
    program
        .command('restore')
        .description('Restore configuration from backup')
        .argument('[backup-file]', 'specific backup file to restore from')
        .action(async (backupFile) => {
        const config = new CLIConfig();
        await config.init();
        try {
            const configDir = path.dirname(config.getConfigPath());
            const fs = await import('fs/promises');
            let backupPath;
            if (backupFile) {
                // Use specified backup file
                backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(configDir, backupFile);
            }
            else {
                // Find latest backup
                const files = await fs.readdir(configDir);
                const backupFiles = files.filter(f => f.startsWith('config.backup.')).sort().reverse();
                if (backupFiles.length === 0) {
                    console.log(chalk.red('✖ No backup files found'));
                    console.log(chalk.gray('  Run: lanonasis config backup'));
                    process.exit(1);
                }
                backupPath = path.join(configDir, backupFiles[0]);
                console.log(chalk.cyan(`Using latest backup: ${backupFiles[0]}`));
            }
            // Verify backup file exists
            await fs.access(backupPath);
            // Confirm restoration
            const answer = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Restore configuration from backup? This will overwrite current config.`,
                    default: false
                }
            ]);
            if (!answer.confirm) {
                console.log(chalk.yellow('Restore cancelled'));
                return;
            }
            // Create backup of current config before restoring
            const currentBackupPath = await config.backupConfig();
            console.log(chalk.cyan(`Current config backed up to: ${path.basename(currentBackupPath)}`));
            // Restore from backup
            await fs.copyFile(backupPath, config.getConfigPath());
            console.log(chalk.green('✓ Configuration restored from backup'));
            console.log(chalk.cyan('  You may need to re-authenticate if credentials were changed'));
        }
        catch (error) {
            console.log(chalk.red('✖ Failed to restore from backup:'));
            console.log(chalk.gray(`  ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    });
    // Reset configuration
    program
        .command('reset')
        .description('Reset all configuration')
        .option('-f, --force', 'skip confirmation')
        .action(async (options) => {
        if (!options.force) {
            const answer = await inquirer.prompt([
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
        // Create backup before reset
        try {
            const backupPath = await config.backupConfig();
            console.log(chalk.cyan(`Configuration backed up to: ${path.basename(backupPath)}`));
        }
        catch {
            // Ignore backup errors during reset
        }
        await config.clear();
        console.log(chalk.green('✓ Configuration reset'));
        console.log(chalk.yellow('Run'), chalk.white('lanonasis auth login'), chalk.yellow('to reconfigure'));
    });
}
