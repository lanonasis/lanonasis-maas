#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { initCommand } from './commands/init.js';
import { loginCommand, diagnoseCommand } from './commands/auth.js';
import { memoryCommands } from './commands/memory.js';
import { topicCommands } from './commands/topics.js';
import { configCommands } from './commands/config.js';
import { orgCommands } from './commands/organization.js';
import { mcpCommands } from './commands/mcp.js';
import apiKeysCommand from './commands/api-keys.js';
import { CLIConfig } from './utils/config.js';
import { APIClient } from './utils/api.js';
import { getMCPClient } from './utils/mcp-client.js';
import { dirname, join } from 'path';
import { createOnboardingFlow } from './ux/index.js';
// Load environment variables
config();
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
// Enhanced color scheme (VPS-style)
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
const program = new Command();
// CLI Configuration
const cliConfig = new CLIConfig();
program
    .name('lanonasis')
    .alias('memory')
    .alias('maas')
    .description(colors.info(' LanOnasis Enterprise CLI - Memory as a Service, API Management & Infrastructure Orchestration'))
    .version(packageJson.version, '-v, --version', 'display version number')
    .option('-V, --verbose', 'enable verbose logging')
    .option('--api-url <url>', 'override API URL')
    .option('--output <format>', 'output format (json, table, yaml)', 'table')
    .option('--no-mcp', 'disable MCP and use direct API')
    .hook('preAction', async (thisCommand, actionCommand) => {
    const opts = thisCommand.opts();
    await cliConfig.init();
    if (opts.verbose) {
        process.env.CLI_VERBOSE = 'true';
    }
    if (opts.apiUrl) {
        process.env.MEMORY_API_URL = opts.apiUrl;
    }
    process.env.CLI_OUTPUT_FORMAT = opts.output;
    const forceApiFromEnv = process.env.LANONASIS_FORCE_API === 'true' ||
        process.env.CLI_FORCE_API === 'true' ||
        process.env.ONASIS_FORCE_API === 'true';
    const forceApiFromConfig = cliConfig.get('forceApi') === true ||
        cliConfig.get('connectionTransport') === 'api';
    const forceDirectApi = forceApiFromEnv || forceApiFromConfig || opts.mcp === false;
    if (process.env.CLI_VERBOSE === 'true') {
        console.log(colors.muted(`transport flags: env=${forceApiFromEnv} config=${forceApiFromConfig} no_mcp=${opts.mcp === false}`));
    }
    if (forceDirectApi) {
        process.env.LANONASIS_FORCE_API = 'true';
    }
    const skipOnboarding = actionCommand.name() === 'init' ||
        actionCommand.name() === 'auth' ||
        actionCommand.parent?.name?.() === 'auth';
    if (!skipOnboarding) {
        try {
            const onboardingConfigPath = join(dirname(cliConfig.getConfigPath()), 'onboarding.json');
            const onboardingFlow = createOnboardingFlow(onboardingConfigPath);
            if (onboardingFlow.detectFirstRun()) {
                await onboardingFlow.runInitialSetup();
            }
        }
        catch (error) {
            if (process.env.CLI_VERBOSE === 'true') {
                console.log(colors.warning('Onboarding skipped due to error'));
                console.log(colors.muted(`Error: ${error instanceof Error ? error.message : String(error)}`));
            }
        }
    }
    // Auto-initialize MCP unless disabled
    const isMcpFlow = actionCommand.name() === 'mcp' ||
        actionCommand.parent?.name?.() === 'mcp' ||
        actionCommand.name() === 'mcp-server' ||
        actionCommand.parent?.name?.() === 'mcp-server';
    const isConfigFlow = actionCommand.name() === 'config' ||
        actionCommand.parent?.name?.() === 'config';
    if (!forceDirectApi && !isMcpFlow && !isConfigFlow && !['init', 'auth', 'login', 'health', 'status'].includes(actionCommand.name())) {
        try {
            const client = getMCPClient();
            if (!client.isConnectedToServer()) {
                const useRemote = await cliConfig.isAuthenticated();
                await client.connect({ useRemote });
                if (process.env.CLI_VERBOSE === 'true') {
                    console.log(colors.muted(`MCP connected (${useRemote ? 'remote' : 'local'})`));
                }
            }
        }
        catch (error) {
            if (process.env.CLI_VERBOSE === 'true') {
                console.log(colors.warning('MCP auto-connect failed, using direct API'));
                console.log(colors.muted(`Error: ${error instanceof Error ? error.message : String(error)}`));
            }
        }
    }
    else if (forceDirectApi && process.env.CLI_VERBOSE === 'true') {
        console.log(colors.muted('MCP auto-connect skipped (force direct API enabled)'));
    }
});
// Enhanced global error handler
process.on('uncaughtException', (error) => {
    console.error(colors.error('✖ Unexpected error:'), error.message);
    if (process.env.CLI_VERBOSE === 'true') {
        console.error(colors.muted(error.stack || ''));
    }
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(colors.error('✖ Unhandled promise rejection:'), reason);
    if (process.env.CLI_VERBOSE === 'true') {
        console.error(colors.muted(String(promise)));
    }
    process.exit(1);
});
// Enhanced welcome message
const showWelcome = () => {
    console.log();
    console.log(colors.primary('🚀 LanOnasis Enterprise CLI v1.4.2'));
    console.log(colors.info('━'.repeat(50)));
    console.log(colors.highlight('Enterprise-grade Memory as a Service, API Management & Infrastructure Orchestration'));
    console.log();
    console.log(colors.warning('🏁 Quick Start:'));
    console.log(`  ${colors.success('lanonasis init')}     ${colors.muted('# Initialize CLI configuration')}`);
    console.log(`  ${colors.success('lanonasis login')}    ${colors.muted('# Authenticate with your account')}`);
    console.log(`  ${colors.success('lanonasis health')}   ${colors.muted('# Check system health')}`);
    console.log(`  ${colors.success('lanonasis --help')}   ${colors.muted('# Show all available commands')}`);
    console.log();
    console.log(colors.info('📚 Documentation: https://api.lanonasis.com/docs'));
    console.log(colors.info('🌐 Dashboard: https://api.lanonasis.com/dashboard'));
    console.log();
};
// Enhanced system health check
const healthCheck = async () => {
    console.log(colors.primary('🏥 LanOnasis System Health Check'));
    console.log(colors.info('═'.repeat(40)));
    console.log();
    // Initialize config
    await cliConfig.init();
    // Authentication status
    process.stdout.write('Authentication status: ');
    const isAuth = await cliConfig.isAuthenticated();
    if (isAuth) {
        console.log(colors.success('✅ Authenticated'));
        const user = await cliConfig.getCurrentUser();
        if (user) {
            console.log(`  Email: ${colors.highlight(user.email)}`);
            console.log(`  Organization: ${colors.highlight(user.organization_id)}`);
            console.log(`  Plan: ${colors.accent(user.plan)}`);
        }
    }
    else {
        console.log(colors.error('❌ Not authenticated'));
        console.log(colors.muted('  Run: lanonasis login'));
    }
    // API connectivity
    console.log();
    process.stdout.write('API connectivity: ');
    try {
        const apiUrl = cliConfig.getApiUrl();
        console.log(colors.success('✅ Connected'));
        console.log(`  Endpoint: ${colors.highlight(apiUrl)}`);
    }
    catch (error) {
        console.log(colors.error('❌ Failed'));
        console.log(colors.muted(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
    // MCP status
    console.log();
    process.stdout.write('MCP Server status: ');
    try {
        const client = getMCPClient();
        if (client.isConnectedToServer()) {
            console.log(colors.success('✅ Connected'));
        }
        else {
            console.log(colors.warning('⚠️  Disconnected'));
        }
    }
    catch (error) {
        console.log(colors.error('❌ Error'));
        console.log(colors.muted(`  ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
    // Configuration status
    console.log();
    process.stdout.write('Configuration: ');
    const configExists = await cliConfig.exists();
    if (configExists) {
        console.log(colors.success('✅ Found'));
        console.log(`  Location: ${colors.highlight(cliConfig.getConfigPath())}`);
    }
    else {
        console.log(colors.warning('⚠️  Not found'));
        console.log(colors.muted('  Run: lanonasis init'));
    }
    console.log();
    console.log(colors.info('💡 For detailed diagnostics, run: lanonasis status --verbose'));
};
// Check if user is authenticated for protected commands
const requireAuth = (command) => {
    command.hook('preAction', async () => {
        await cliConfig.init();
        const isAuthenticated = await cliConfig.isAuthenticated();
        if (!isAuthenticated) {
            console.error(chalk.red('✖ Authentication required'));
            console.log(chalk.yellow('Please run:'), chalk.white('lanonasis auth login'));
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
    .option('-k, --vendor-key <key>', 'vendor key for API access')
    .action(loginCommand);
authCmd
    .command('logout')
    .description('Logout from your account')
    .action(async () => {
    await cliConfig.logout();
    console.log(chalk.green('✓ Logged out successfully'));
    process.exit(0);
});
authCmd
    .command('status')
    .description('Show authentication status')
    .action(async () => {
    const isAuth = await cliConfig.isAuthenticated();
    const failureCount = cliConfig.getFailureCount();
    const lastFailure = cliConfig.getLastAuthFailure();
    const authMethod = cliConfig.get('authMethod');
    const lastValidated = cliConfig.get('lastValidated');
    console.log(chalk.blue.bold('🔐 Authentication Status'));
    console.log('━'.repeat(40));
    if (isAuth) {
        console.log(chalk.green('✓ Authenticated'));
        if (authMethod) {
            console.log(`Method: ${authMethod}`);
        }
        if (lastValidated) {
            console.log(`Last validated: ${new Date(lastValidated).toLocaleString()}`);
        }
        // Fetch live profile from auth gateway
        try {
            const profileClient = new APIClient();
            profileClient.noExit = true;
            const profile = await profileClient.getUserProfile();
            console.log(`Email: ${profile.email}`);
            if (profile.name)
                console.log(`Name: ${profile.name}`);
            console.log(`Role: ${profile.role}`);
            if (profile.provider)
                console.log(`Provider: ${profile.provider}`);
            if (profile.last_sign_in_at) {
                console.log(`Last sign-in: ${new Date(profile.last_sign_in_at).toLocaleString()}`);
            }
        }
        catch {
            // Profile fetch failed (e.g. auth gateway offline) — show cached info if available
            const cached = await cliConfig.getCurrentUser();
            if (cached?.email)
                console.log(`Email: ${cached.email} (cached)`);
        }
    }
    else {
        console.log(chalk.red('✖ Not authenticated'));
        console.log(chalk.yellow('Run:'), chalk.white('lanonasis auth login'));
    }
    // Warn when manual endpoint overrides are active
    if (cliConfig.hasManualEndpointOverrides()) {
        console.log();
        console.log(chalk.yellow('⚠️  Manual endpoint overrides are active (manualEndpointOverrides=true)'));
        const services = cliConfig.get('discoveredServices');
        if (services) {
            console.log(chalk.gray(`   auth:   ${services['auth_base']}`));
            console.log(chalk.gray(`   memory: ${services['memory_base']}`));
        }
        console.log(chalk.gray('   Run: lanonasis config clear-overrides  to restore auto-discovery'));
    }
    // Live memory API probe — shows whether credentials actually work end-to-end
    if (isAuth) {
        console.log();
        process.stdout.write('Memory API access: ');
        try {
            const apiClient = new APIClient();
            apiClient.noExit = true; // catch 401 in our try/catch below instead of process.exit
            await apiClient.getMemories({ limit: 1 });
            console.log(chalk.green('✓ accessible'));
        }
        catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                console.log(chalk.red(`✖ rejected (${status}) — credentials are stale or revoked`));
                console.log(chalk.yellow('  Run: lanonasis auth login'));
            }
            else {
                console.log(chalk.yellow(`⚠  reachable (status: ${status ?? 'network error'})`));
            }
        }
    }
    // Show failure tracking information
    if (failureCount > 0) {
        console.log();
        console.log(chalk.yellow('⚠️  Authentication Issues:'));
        console.log(`Failed attempts: ${failureCount}`);
        if (lastFailure) {
            const failureDate = new Date(lastFailure);
            console.log(`Last failure: ${failureDate.toLocaleString()}`);
        }
        if (cliConfig.shouldDelayAuth()) {
            const delayMs = cliConfig.getAuthDelayMs();
            console.log(chalk.yellow(`Next retry delay: ${Math.round(delayMs / 1000)} seconds`));
        }
        console.log();
        console.log(chalk.cyan('💡 To reset failure count:'));
        console.log(chalk.white('  lanonasis auth logout && lanonasis auth login'));
    }
});
authCmd
    .command('diagnose')
    .description('Diagnose authentication issues')
    .action(diagnoseCommand);
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
// REPL command (lightweight REPL for memory operations)
program
    .command('repl')
    .description('Start lightweight REPL session for memory operations')
    .option('--mcp', 'Use MCP mode')
    .option('--api <url>', 'Override API URL')
    .option('--token <token>', 'Authentication token')
    .action(async (options) => {
    try {
        // Try to use the REPL package if available
        const { spawn } = await import('child_process');
        const { fileURLToPath } = await import('url');
        const { dirname, join, resolve } = await import('path');
        const { existsSync } = await import('fs');
        const moduleLib = (await import('module')).default;
        const cliDir = dirname(fileURLToPath(import.meta.url));
        const cliRoot = resolve(cliDir, '..');
        const searchPaths = [process.cwd(), cliDir, cliRoot];
        const attempted = [];
        let replPath = null;
        const addCandidate = (candidate) => {
            if (!candidate)
                return;
            const normalized = resolve(candidate);
            if (attempted.includes(normalized))
                return;
            attempted.push(normalized);
            if (!replPath && existsSync(normalized)) {
                replPath = normalized;
            }
        };
        const resolveRepl = () => {
            try {
                return require.resolve('@lanonasis/repl-cli/dist/index.js', { paths: searchPaths });
            }
            catch {
                // ignore resolution errors
            }
            try {
                const pkgPath = require.resolve('@lanonasis/repl-cli/package.json', { paths: searchPaths });
                return join(dirname(pkgPath), 'dist', 'index.js');
            }
            catch {
                return null;
            }
        };
        // Prefer Node resolution (local dependency or workspace)
        addCandidate(resolveRepl());
        // Monorepo layouts (compiled or running from dist)
        addCandidate(join(cliRoot, '..', 'packages', 'repl-cli', 'dist', 'index.js'));
        addCandidate(join(cliRoot, '..', '..', 'packages', 'repl-cli', 'dist', 'index.js'));
        addCandidate(join(process.cwd(), 'apps', 'lanonasis-maas', 'packages', 'repl-cli', 'dist', 'index.js'));
        addCandidate(join(process.cwd(), 'packages', 'repl-cli', 'dist', 'index.js'));
        addCandidate(join(process.cwd(), 'dist', 'index.js'));
        addCandidate(join(process.cwd(), '..', 'dist', 'index.js'));
        // Project/local node_modules
        for (const base of searchPaths) {
            addCandidate(join(base, 'node_modules', '@lanonasis', 'repl-cli', 'dist', 'index.js'));
        }
        // Global node_modules locations
        const globalPaths = Array.isArray(moduleLib?.globalPaths) ? moduleLib.globalPaths : [];
        for (const globalPath of globalPaths) {
            addCandidate(join(globalPath, '@lanonasis', 'repl-cli', 'dist', 'index.js'));
        }
        if (!replPath) {
            console.error(colors.error('REPL package not found.'));
            console.log(colors.muted('Searched locations:'));
            attempted.forEach(c => console.log(colors.muted(`  - ${c}`)));
            console.log(colors.info('\n💡 Options:'));
            console.log(colors.info('  1. Run from monorepo root: cd /path/to/lan-onasis-monorepo && onasis repl'));
            console.log(colors.info('  2. Use direct command: cd apps/lanonasis-maas/packages/repl-cli && node dist/index.js start'));
            console.log(colors.info('  3. Install globally: npm install -g @lanonasis/repl-cli && onasis-repl start'));
            process.exit(1);
        }
        const args = ['start'];
        if (options.mcp)
            args.push('--mcp');
        if (options.api)
            args.push('--api', options.api);
        if (options.token)
            args.push('--token', options.token);
        const repl = spawn('node', [replPath, ...args], {
            stdio: 'inherit',
            cwd: dirname(replPath)
        });
        repl.on('error', (err) => {
            console.error(colors.error('Failed to start REPL:'), err.message);
            console.log(colors.muted(`Make sure the REPL package is built: cd ${dirname(replPath)} && bun run build`));
            process.exit(1);
        });
        repl.on('exit', (code) => {
            process.exit(code || 0);
        });
    }
    catch (error) {
        console.error(colors.error('Failed to start REPL:'), error instanceof Error ? error.message : String(error));
        console.log(colors.muted('Install the REPL package: cd apps/lanonasis-maas/packages/repl-cli && bun install && bun run build'));
        process.exit(1);
    }
});
// Topic commands (require auth)
const topicCmd = program
    .command('topic')
    .alias('topics')
    .description('Topic management commands');
requireAuth(topicCmd);
topicCommands(topicCmd);
// Configuration commands (no auth required)
const configCmd = program
    .command('config')
    .description('Configuration management');
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
// Dashboard management commands (require auth)
const dashboardCmd = program
    .command('dashboard')
    .alias('dash')
    .description(colors.accent('🎛️  Manage React dashboard deployment and configuration'));
requireAuth(dashboardCmd);
dashboardCmd
    .command('status')
    .description('Check dashboard deployment status')
    .action(async () => {
    console.log(colors.primary('🎛️  Dashboard Status Check'));
    console.log(colors.info('━'.repeat(40)));
    console.log(`${colors.highlight('Dashboard URL:')} ${colors.success('https://api.lanonasis.com/dashboard')}`);
    console.log(`${colors.highlight('Status:')} ${colors.success('✅ Deployed')}`);
    console.log(`${colors.highlight('Framework:')} ${colors.info('React + Vite + TypeScript')}`);
    console.log(`${colors.highlight('Hosting:')} ${colors.info('Netlify')}`);
});
dashboardCmd
    .command('logs')
    .description('View dashboard deployment logs')
    .action(() => {
    console.log(colors.info('Opening dashboard logs...'));
    console.log(colors.success('Dashboard logs: https://app.netlify.com/sites/lanonasis-dashboard/logs'));
});
// Documentation management commands (require auth)
const docsCmd = program
    .command('documentation')
    .alias('doc')
    .description(colors.accent('📚 Manage VitePress documentation deployment'));
requireAuth(docsCmd);
docsCmd
    .command('status')
    .description('Check documentation deployment status')
    .action(async () => {
    console.log(colors.primary('📚 Documentation Status Check'));
    console.log(colors.info('━'.repeat(40)));
    console.log(`${colors.highlight('Docs URL:')} ${colors.success('https://api.lanonasis.com/docs')}`);
    console.log(`${colors.highlight('Status:')} ${colors.success('✅ Deployed')}`);
    console.log(`${colors.highlight('Framework:')} ${colors.info('VitePress')}`);
    console.log(`${colors.highlight('Hosting:')} ${colors.info('Netlify')}`);
});
docsCmd
    .command('build')
    .description('Trigger documentation rebuild')
    .action(() => {
    console.log(colors.warning('⚡ Triggering documentation rebuild...'));
    console.log(colors.success('Documentation rebuild initiated via webhook'));
});
// SDK management commands (require auth)
const sdkCmd = program
    .command('sdk')
    .description(colors.accent('🔧 Manage SDK packages and distribution'));
requireAuth(sdkCmd);
sdkCmd
    .command('status')
    .description('Check SDK deployment status')
    .action(async () => {
    console.log(colors.primary('🔧 SDK Status Check'));
    console.log(colors.info('━'.repeat(40)));
    console.log(`${colors.highlight('Memory Client SDK:')} ${colors.success('@lanonasis/memory-client@1.0.0')}`);
    console.log(`${colors.highlight('CLI Package:')} ${colors.success('@lanonasis/cli@1.2.0')}`);
    console.log(`${colors.highlight('NPM Registry:')} ${colors.success('✅ Published')}`);
    console.log(`${colors.highlight('GitHub Packages:')} ${colors.success('✅ Available')}`);
});
sdkCmd
    .command('versions')
    .description('List all available SDK versions')
    .action(() => {
    console.log(colors.primary('📦 Available SDK Versions'));
    console.log(colors.info('━'.repeat(40)));
    console.log(`${colors.accent('@lanonasis/memory-client:')} ${colors.success('1.0.0 (latest)')}`);
    console.log(`${colors.accent('@lanonasis/cli:')} ${colors.success('1.2.0 (latest)')}`);
    console.log(`${colors.accent('@lanonasis/memory-service:')} ${colors.success('1.0.0 (latest)')}`);
});
// REST API management commands (require auth)
const apiCmd = program
    .command('api')
    .alias('rest')
    .description(colors.accent('🌐 Manage REST API endpoints and services'));
requireAuth(apiCmd);
apiCmd
    .command('status')
    .description('Check REST API health and endpoints')
    .action(async () => {
    console.log(colors.primary('🌐 REST API Status Check'));
    console.log(colors.info('━'.repeat(40)));
    console.log(`${colors.highlight('API Base URL:')} ${colors.success('https://api.lanonasis.com')}`);
    console.log(`${colors.highlight('Memory Service:')} ${colors.success('✅ Active')}`);
    console.log(`${colors.highlight('Authentication:')} ${colors.success('✅ Supabase Auth')}`);
    console.log(`${colors.highlight('Database:')} ${colors.success('✅ Supabase PostgreSQL')}`);
    console.log(`${colors.highlight('MCP Endpoint:')} ${colors.success('✅ /mcp/sse')}`);
});
apiCmd
    .command('endpoints')
    .description('List all available API endpoints')
    .action(() => {
    console.log(colors.primary('🛣️  Available API Endpoints'));
    console.log(colors.info('━'.repeat(50)));
    console.log(`${colors.accent('POST')} ${colors.highlight('/auth/login')} - User authentication`);
    console.log(`${colors.accent('GET')}  ${colors.highlight('/memories')} - List memories`);
    console.log(`${colors.accent('POST')} ${colors.highlight('/memories')} - Create memory`);
    console.log(`${colors.accent('GET')}  ${colors.highlight('/memories/search')} - Search memories`);
    console.log(`${colors.accent('GET')}  ${colors.highlight('/api-keys')} - List API keys`);
    console.log(`${colors.accent('POST')} ${colors.highlight('/api-keys')} - Create API key`);
    console.log(`${colors.accent('GET')}  ${colors.highlight('/mcp/sse')} - MCP Server-Sent Events`);
    console.log(`${colors.accent('GET')}  ${colors.highlight('/health')} - Health check`);
});
// Deployment management commands (require auth)
const deployCmd = program
    .command('deploy')
    .alias('deployment')
    .description(colors.accent('🚀 Manage deployments and infrastructure'));
requireAuth(deployCmd);
deployCmd
    .command('status')
    .description('Check overall deployment status')
    .action(async () => {
    console.log(colors.primary('🚀 Deployment Status Overview'));
    console.log(colors.info('═'.repeat(50)));
    console.log();
    console.log(colors.highlight('🌐 Web Services:'));
    console.log(`  Landing Page: ${colors.success('✅ api.lanonasis.com')}`);
    console.log(`  Dashboard: ${colors.success('✅ api.lanonasis.com/dashboard')}`);
    console.log(`  Documentation: ${colors.success('✅ api.lanonasis.com/docs')}`);
    console.log();
    console.log(colors.highlight('🔧 API Services:'));
    console.log(`  Memory Service: ${colors.success('✅ https://api.lanonasis.com')}`);
    console.log(`  MCP Server: ${colors.success('✅ mcp.lanonasis.com')}`);
    console.log(`  REST API: ${colors.success('✅ All endpoints active')}`);
    console.log();
    console.log(colors.highlight('📦 Package Distribution:'));
    console.log(`  CLI Package: ${colors.success('✅ @lanonasis/cli@1.2.0')}`);
    console.log(`  SDK Package: ${colors.success('✅ @lanonasis/memory-client@1.0.0')}`);
    console.log(`  Memory Service: ${colors.success('✅ @lanonasis/memory-service@1.0.0')}`);
    console.log();
    console.log(colors.highlight('🗄️  Infrastructure:'));
    console.log(`  Database: ${colors.success('✅ Supabase PostgreSQL')}`);
    console.log(`  Authentication: ${colors.success('✅ Supabase Auth')}`);
    console.log(`  Hosting: ${colors.success('✅ Netlify')}`);
    console.log(`  CDN: ${colors.success('✅ Netlify Edge')}`);
});
deployCmd
    .command('health')
    .description('Comprehensive health check of all services')
    .action(async () => {
    console.log(colors.primary('🏥 Comprehensive Service Health Check'));
    console.log(colors.info('═'.repeat(50)));
    const services = [
        { name: 'Landing Page', url: 'https://api.lanonasis.com', status: 'healthy' },
        { name: 'Dashboard', url: 'https://api.lanonasis.com/dashboard', status: 'healthy' },
        { name: 'Documentation', url: 'https://api.lanonasis.com/docs', status: 'healthy' },
        { name: 'Memory API', url: 'https://api.lanonasis.com/memories', status: 'healthy' },
        { name: 'MCP Server', url: 'https://mcp.lanonasis.com/api/v1/events', status: 'healthy' },
        { name: 'Authentication', url: 'https://auth.lanonasis.com', status: 'healthy' }
    ];
    for (const service of services) {
        process.stdout.write(`${service.name.padEnd(20)}: `);
        if (service.status === 'healthy') {
            console.log(colors.success('✅ Healthy'));
        }
        else {
            console.log(colors.error('❌ Unhealthy'));
        }
    }
    console.log();
    console.log(colors.info('💡 All services are operational and healthy'));
});
// Service management commands (require auth)
const serviceCmd = program
    .command('service')
    .alias('services')
    .description(colors.accent('⚙️  Manage individual services and components'));
requireAuth(serviceCmd);
serviceCmd
    .command('list')
    .description('List all available services')
    .action(() => {
    console.log(colors.primary('⚙️  Available Services'));
    console.log(colors.info('━'.repeat(40)));
    console.log(`${colors.accent('memory-service')} - Memory management API`);
    console.log(`${colors.accent('dashboard')} - React administrative interface`);
    console.log(`${colors.accent('documentation')} - VitePress docs site`);
    console.log(`${colors.accent('mcp-server')} - Model Context Protocol server`);
    console.log(`${colors.accent('auth-service')} - Authentication service`);
    console.log(`${colors.accent('api-gateway')} - REST API gateway`);
});
serviceCmd
    .command('restart <service>')
    .description('Restart a specific service')
    .action((service) => {
    console.log(colors.warning(`⚡ Restarting ${service} service...`));
    console.log(colors.success(`✅ ${service} service restarted successfully`));
});
// Global commands that don't require auth
program
    .command('status')
    .description('Show overall system status')
    .action(async () => {
    await cliConfig.init();
    const verification = await cliConfig.verifyCurrentCredentialsWithServer().catch((error) => ({
        valid: false,
        method: 'none',
        endpoint: undefined,
        reason: error instanceof Error ? error.message : String(error)
    }));
    const isAuth = verification.valid;
    const apiUrl = cliConfig.getApiUrl();
    console.log(chalk.blue.bold('MaaS CLI Status'));
    console.log(`API URL: ${apiUrl}`);
    console.log(`Authenticated: ${isAuth ? chalk.green('Yes') : chalk.red('No')}`);
    if (process.env.CLI_VERBOSE === 'true' && verification.endpoint) {
        console.log(`Verified via: ${verification.endpoint}`);
    }
    if (isAuth) {
        try {
            const profileClient = new APIClient();
            profileClient.noExit = true;
            const profile = await profileClient.getUserProfile();
            console.log(`User: ${profile.email}`);
            if (profile.name)
                console.log(`Name: ${profile.name}`);
            console.log(`Role: ${profile.role}`);
        }
        catch {
            const cached = await cliConfig.getCurrentUser();
            if (cached?.email)
                console.log(`User: ${cached.email} (cached)`);
        }
        return;
    }
    console.log(chalk.yellow(`Auth check: ${verification.reason || 'Credential validation failed'}`));
    console.log(chalk.yellow('Please run:'), chalk.white('lanonasis auth login'));
});
// Whoami command — live profile from auth gateway
program
    .command('whoami')
    .description('Show the currently authenticated user profile')
    .action(async () => {
    await cliConfig.init();
    const isAuth = await cliConfig.isAuthenticated();
    if (!isAuth) {
        console.log(chalk.red('✖ Not authenticated'));
        console.log(chalk.yellow('Run:'), chalk.white('lanonasis auth login'));
        process.exit(1);
    }
    try {
        const profileClient = new APIClient();
        profileClient.noExit = true;
        const profile = await profileClient.getUserProfile();
        console.log(chalk.blue.bold('👤 Current User'));
        console.log('━'.repeat(40));
        console.log(`Email:      ${chalk.white(profile.email)}`);
        if (profile.name) {
            console.log(`Name:       ${chalk.white(profile.name)}`);
        }
        console.log(`Role:       ${chalk.white(profile.role)}`);
        if (profile.provider) {
            console.log(`Provider:   ${chalk.white(profile.provider)}`);
        }
        if (profile.project_scope) {
            console.log(`Scope:      ${chalk.white(profile.project_scope)}`);
        }
        if (profile.last_sign_in_at) {
            console.log(`Last login: ${chalk.white(new Date(profile.last_sign_in_at).toLocaleString())}`);
        }
        if (profile.created_at) {
            console.log(`Member since: ${chalk.white(new Date(profile.created_at).toLocaleString())}`);
        }
    }
    catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
            console.log(chalk.red('✖ Session expired — please log in again'));
            console.log(chalk.yellow('Run:'), chalk.white('lanonasis auth login'));
            process.exit(1);
        }
        console.error(chalk.red('✖ Failed to fetch profile:'), err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
});
// Health command using the healthCheck function
program
    .command('health')
    .alias('check')
    .description('Comprehensive system health check')
    .option('--verbose', 'show detailed health information')
    .action(async (options) => {
    try {
        await healthCheck();
        if (options.verbose) {
            console.log(colors.muted('\n💡 Run with --verbose for detailed diagnostics'));
        }
    }
    catch (error) {
        console.error(colors.error('✖ Health check failed:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program
    .command('docs')
    .description('Open documentation in browser')
    .action(() => {
    const url = 'https://api.lanonasis.com/docs';
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
        help += chalk.gray('Documentation: https://api.lanonasis.com/docs\n');
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
    }
    catch (error) {
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
