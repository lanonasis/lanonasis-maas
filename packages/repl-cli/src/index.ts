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
  .option('--lonasis', 'Login with Lonasis (Supabase OAuth via auth.connectionpoint.tech)')
  .option('--otp', 'Passwordless login with OTP (magic link)')
  .action(async (options) => {
    try {
      // Determine auth method and configuration
      if (options.otp) {
        // OTP/Magic Link flow
        console.log(chalk.cyan('\n🔐 Passwordless Login (OTP)\n'));

        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const email = await new Promise<string>((resolve) => {
          rl.question(chalk.yellow('Enter your email: '), (answer) => {
            resolve(answer.trim());
          });
        });

        if (!email || !email.includes('@')) {
          console.error(chalk.red('Invalid email address'));
          rl.close();
          process.exit(1);
        }

        console.log(chalk.cyan(`\nSending OTP to ${email}...`));

        // Request OTP (email code, not magic link - user will enter code manually)
        const otpResponse = await fetch('https://auth.lanonasis.com/v1/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, platform: 'cli' }),
        });

        if (!otpResponse.ok) {
          const error = await otpResponse.json().catch(() => ({}));
          throw new Error(error.message || 'Failed to send OTP');
        }

        console.log(chalk.green('✓ OTP sent! Check your email.'));

        const otp = await new Promise<string>((resolve) => {
          rl.question(chalk.yellow('\nEnter the OTP code: '), (answer) => {
            resolve(answer.trim());
          });
        });

        rl.close();

        // Verify OTP and get tokens
        console.log(chalk.cyan('Verifying OTP...'));

        const verifyResponse = await fetch('https://auth.lanonasis.com/v1/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token: otp, type: 'email' }),
        });

        if (!verifyResponse.ok) {
          const error = await verifyResponse.json().catch(() => ({}));
          throw new Error(error.message || 'Invalid OTP');
        }

        const tokens = await verifyResponse.json();

        // Save credentials
        saveCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type || 'Bearer',
          expires_in: tokens.expires_in || 3600,
          scope: tokens.scope || 'default',
          auth_method: 'magic_link',
          expires_at: 0,
        });

        console.log(chalk.green('\n✓ Logged in successfully with OTP!'));
        console.log(chalk.cyan('\nRun `onasis-repl start` to begin your session.\n'));
        return;
      }

      // OAuth flow (default or --lonasis)
      // For --lonasis, use Supabase's direct OAuth endpoint (not the custom frontend)
      const authBaseUrl = options.lonasis
        ? 'https://ptnrwrgzrsbocgxlpvhd.supabase.co/auth/v1'
        : options.authUrl;

      const clientId = options.lonasis
        ? '1acd9726-92a8-49ad-a3ed-fd6240a4ef2c'  // Supabase OAuth client UUID
        : 'lanonasis-repl-cli';  // Auth Gateway client

      // Note: Don't include 'openid' scope for Supabase OAuth when using HS256 signing
      // ID tokens require RS256/ES256. We only need access tokens for the CLI.
      const scope = options.lonasis
        ? 'email profile'
        : 'memories:read memories:write mcp:connect api:access';

      if (options.lonasis) {
        console.log(chalk.cyan('\n🔐 Login with Lonasis (Supabase OAuth)\n'));
        console.log(chalk.gray('Using Supabase direct OAuth endpoint\n'));
      }

      const tokens = await performOAuthLogin({
        authBaseUrl,
        clientId,
        scope,
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
