#!/usr/bin/env node

import { Command } from 'commander';
import { ReplEngine } from './core/repl-engine.js';
import { loadConfig } from './config/loader.js';
import chalk from 'chalk';
import { MagicLinkFlow } from '@lanonasis/oauth-client';
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

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get version from package.json to ensure consistency
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');
let version = '0.9.0';
try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  version = packageJson.version || version;
} catch {
  // Fallback to hardcoded version if package.json can't be read
}

program
  .name('onasis-repl')
  .description('LanOnasis Interactive Memory Assistant')
  .version(version, '-v, --version', 'output the version number');

program
  .command('start', { isDefault: true })
  .description('Start the REPL session')
  .option('--mcp', 'Use local MCP mode', false)
  .option('--api <url>', 'Override API URL')
  .option('--ai-router <url>', 'Override AI router URL')
  .option('--token <token>', 'Authentication token')
  .option('--model <model>', 'Model label/override (default: L-Zero)')
  .action(async (options) => {
    // Try to get stored token if not provided
    let authToken = options.token;
    if (!authToken) {
      authToken = await getValidToken(refreshAccessToken);
    }

    const config = await loadConfig({
      useMCP: options.mcp || false,
      apiUrl: options.api,
      aiRouterUrl: options.aiRouter,
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
  .option('--callback-port <port>', 'OAuth callback port', '8899')
  .option('--no-open', 'Do not auto-open browser')
  .option('--lonasis', 'Login with Lonasis (Supabase OAuth via auth.connectionpoint.tech)')
  .option('--otp', 'Passwordless login with OTP (magic link)')
  .action(async (options) => {
    try {
      // Determine auth method and configuration
      if (options.otp) {
        // OTP/Magic Link flow using oauth-client SDK
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

        if (!MagicLinkFlow.isValidEmail(email)) {
          console.error(chalk.red('Invalid email address'));
          rl.close();
          process.exit(1);
        }

        // Initialize MagicLinkFlow from oauth-client SDK
        const magicLinkFlow = new MagicLinkFlow({
          clientId: 'lanonasis-repl-cli',
          authBaseUrl: options.authUrl,
          platform: 'cli',
        });

        console.log(chalk.cyan(`\nSending OTP to ${email}...`));

        // Request OTP using SDK
        await magicLinkFlow.requestOTP(email);

        console.log(chalk.green('✓ OTP sent! Check your email.'));

        const otp = await new Promise<string>((resolve) => {
          rl.question(chalk.yellow('\nEnter the 6-digit OTP code: '), (answer) => {
            resolve(answer.trim());
          });
        });

        rl.close();

        if (!MagicLinkFlow.isValidOTPCode(otp)) {
          throw new Error('Invalid OTP format. Must be 6 digits.');
        }

        // Verify OTP and get tokens using SDK
        console.log(chalk.cyan('Verifying OTP...'));
        const tokens = await magicLinkFlow.verifyOTP(email, otp);

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
        if (tokens.user?.email) {
          console.log(chalk.gray(`Authenticated as: ${tokens.user.email}`));
        }
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
        callbackPort: Number(options.callbackPort) || 8899,
        openBrowser: options.open !== false,
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
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red('Login failed:'), message);
      if (message.includes('Error sending magic link email')) {
        console.log(chalk.yellow('\nOTP delivery failed at auth backend.'));
        console.log(chalk.gray('Verify SMTP/provider settings in auth service, then retry.'));
        console.log(chalk.gray('As fallback, use: onasis-repl login --auth-url https://auth.lanonasis.com'));
      }
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
      aiRouterAuthToken: config.aiRouterAuthToken ? '***' + config.aiRouterAuthToken.slice(-4) : undefined,
    };
    console.log(JSON.stringify(safeConfig, null, 2));
  });

program.parse();
