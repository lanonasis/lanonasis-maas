#!/usr/bin/env node

import { Command } from 'commander';
import { ReplEngine } from './core/repl-engine.js';
import { loadConfig } from './config/loader.js';
import chalk from 'chalk';
import {
  performOAuthLogin,
  refreshAccessToken,
  revokeToken,
  verifyToken
} from './auth/oauth-flow.js';
import {
  saveCredentials,
  clearCredentials,
  getAuthStatus,
  getValidToken,
  loadCredentials
} from './auth/credentials.js';

const program = new Command();

program
  .name('onasis-repl')
  .description('LanOnasis Interactive Memory Assistant')
  .version('0.7.0');

program
  .command('start', { isDefault: true })
  .description('Start the REPL session')
  .option('--mcp', 'Use local MCP mode', false)
  .option('--api <url>', 'Override API URL')
  .option('--token <token>', 'Authentication token')
  .option('--model <model>', 'OpenAI model to use (e.g., gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo)')
  .action(async (options) => {
    // Try to get stored token if not provided
    let authToken = options.token;
    if (!authToken) {
      authToken = await getValidToken(refreshAccessToken);
    }

    const config = await loadConfig({
      useMCP: options.mcp || false,
      apiUrl: options.api,
      authToken: authToken || undefined,
      openaiModel: options.model
    });

    const repl = new ReplEngine(config);
    await repl.start();
  });

program
  .command('login')
  .description('Authenticate with Lan Onasis using OAuth 2.1')
  .option('--auth-url <url>', 'Override auth server URL', 'https://auth.lanonasis.com')
  .option('--supabase', 'Use Supabase OAuth Server instead of Auth-Gateway')
  .action(async (options) => {
    try {
      const authBaseUrl = options.supabase
        ? 'https://ptnrwrgzrsbocgxlpvhd.supabase.co/auth/v1'
        : options.authUrl;

      const tokens = await performOAuthLogin({
        authBaseUrl,
        clientId: options.supabase ? 'lanonasis-repl-cli-supabase' : 'lanonasis-repl-cli',
        scope: options.supabase
          ? 'openid email'
          : 'memories:read memories:write mcp:connect api:access',
      });

      // Save credentials
      saveCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        auth_method: 'oauth',
        expires_at: 0, // Will be calculated
      });

      console.log(chalk.green('✓ Logged in successfully!'));
      console.log(chalk.gray(`Token expires in ${Math.floor(tokens.expires_in / 60)} minutes`));
      console.log(chalk.gray(`Scope: ${tokens.scope || 'default'}`));
      console.log(chalk.cyan('\nRun `onasis-repl start` to begin your session.\n'));
    } catch (error) {
      console.error(chalk.red('Login failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Log out and clear stored credentials')
  .option('--revoke', 'Also revoke tokens on server', false)
  .action(async (options) => {
    const credentials = loadCredentials();

    if (options.revoke && credentials) {
      console.log(chalk.cyan('Revoking tokens...'));
      try {
        await revokeToken(credentials.access_token, 'access_token');
        if (credentials.refresh_token) {
          await revokeToken(credentials.refresh_token, 'refresh_token');
        }
        console.log(chalk.green('✓ Tokens revoked'));
      } catch (error) {
        console.log(chalk.yellow('⚠ Could not revoke tokens on server'));
      }
    }

    if (clearCredentials()) {
      console.log(chalk.green('✓ Logged out successfully'));
    } else {
      console.log(chalk.yellow('No credentials to clear'));
    }
  });

program
  .command('auth-status')
  .alias('whoami')
  .description('Show authentication status')
  .option('--verify', 'Verify token with server', false)
  .action(async (options) => {
    const status = getAuthStatus();

    console.log(chalk.cyan('\n🔐 Authentication Status\n'));

    if (!status.authenticated) {
      console.log(chalk.yellow('Not authenticated'));
      console.log(chalk.gray('Run `onasis-repl login` to authenticate.\n'));
      return;
    }

    console.log(chalk.green('✓ Authenticated'));
    console.log(chalk.gray(`Method: ${status.method}`));
    console.log(chalk.gray(`Expires: ${status.expiresAt?.toLocaleString()}`));
    console.log(chalk.gray(`Scope: ${status.scope || 'default'}`));

    if (status.needsRefresh) {
      console.log(chalk.yellow('\n⚠ Token expired but can be refreshed'));
    }

    if (options.verify) {
      console.log(chalk.cyan('\nVerifying with server...'));
      const credentials = loadCredentials();
      if (credentials) {
        const isValid = await verifyToken(credentials.access_token);
        if (isValid) {
          console.log(chalk.green('✓ Token is valid on server'));
        } else {
          console.log(chalk.red('✗ Token is invalid or expired on server'));
        }
      }
    }

    console.log('');
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    const config = await loadConfig({});
    console.log(chalk.cyan('Current Configuration:'));
    // Mask sensitive values
    const safeConfig = {
      ...config,
      authToken: config.authToken ? '***' + config.authToken.slice(-4) : undefined,
      vendorKey: config.vendorKey ? '***' + config.vendorKey.slice(-4) : undefined,
      openaiApiKey: config.openaiApiKey ? '***' + config.openaiApiKey.slice(-4) : undefined,
    };
    console.log(JSON.stringify(safeConfig, null, 2));
  });

program.parse();
