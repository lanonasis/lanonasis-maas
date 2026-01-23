import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import open from 'open';
import crypto from 'crypto';
import http from 'http';
import url from 'url';
import axios from 'axios';
import { apiClient } from '../utils/api.js';
import { CLIConfig } from '../utils/config.js';

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

// Type definitions for command options
interface LoginOptions {
  email?: string;
  password?: string;
  vendorKey?: string;
  useWebAuth?: boolean;
}

interface RegistrationAnswers {
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
}

interface LoginAnswers {
  email: string;
  password: string;
}

interface RegisterPromptAnswer {
  register: boolean;
}

// Helper function to handle authentication delays
async function handleAuthDelay(config: CLIConfig): Promise<void> {
  if (config.shouldDelayAuth()) {
    const delayMs = config.getAuthDelayMs();
    const failureCount = config.getFailureCount();
    const lastFailure = config.getLastAuthFailure();

    console.log();
    console.log(chalk.yellow(`⚠️  Multiple authentication failures detected (${failureCount} attempts)`));
    if (lastFailure) {
      const lastFailureDate = new Date(lastFailure);
      console.log(chalk.gray(`Last failure: ${lastFailureDate.toLocaleString()}`));
    }
    console.log(chalk.yellow(`Waiting ${Math.round(delayMs / 1000)} seconds before retry...`));
    console.log(chalk.gray('This delay helps prevent account lockouts and reduces server load.'));

    // Show countdown
    const spinner = ora(`Waiting ${Math.round(delayMs / 1000)} seconds...`).start();
    await new Promise(resolve => setTimeout(resolve, delayMs));
    spinner.succeed('Ready to retry authentication');
    console.log();
  }
}

// Enhanced authentication failure handler
async function handleAuthenticationFailure(error: any, config: CLIConfig, authMethod: 'vendor_key' | 'jwt' | 'oauth' = 'jwt'): Promise<void> {
  // Increment failure count
  await config.incrementFailureCount();
  const failureCount = config.getFailureCount();

  // Determine error type and provide specific guidance
  const errorType = categorizeAuthError(error);

  console.log();
  console.log(chalk.red('✖ Authentication failed'));

  switch (errorType) {
    case 'invalid_credentials':
      console.log(chalk.red('Invalid credentials provided'));
      if (authMethod === 'vendor_key') {
        console.log(chalk.gray('• Verify the vendor key matches the value shown in your dashboard'));
        console.log(chalk.gray('• Confirm the key is active and has not been revoked'));
        console.log(chalk.gray('• Ensure you copied the entire key without extra spaces'));
      } else {
        console.log(chalk.gray('• Double-check your email and password'));
        console.log(chalk.gray('• Passwords are case-sensitive'));
        console.log(chalk.gray('• Consider resetting your password if needed'));
      }
      break;

    case 'network_error':
      console.log(chalk.red('Network connection failed'));
      console.log(chalk.gray('• Check your internet connection'));
      console.log(chalk.gray('• Verify you can access https://auth.lanonasis.com'));
      console.log(chalk.gray('• Try again in a few moments'));
      if (failureCount >= 2) {
        console.log(chalk.gray('• Consider using a different network if issues persist'));
      }
      break;

    case 'server_error':
      console.log(chalk.red('Server temporarily unavailable'));
      console.log(chalk.gray('• The authentication service may be experiencing issues'));
      console.log(chalk.gray('• Please try again in a few minutes'));
      console.log(chalk.gray('• Check https://status.lanonasis.com for service status'));
      break;

    case 'rate_limited':
      console.log(chalk.red('Too many authentication attempts'));
      console.log(chalk.gray('• Please wait before trying again'));
      console.log(chalk.gray('• Rate limiting helps protect your account'));
      console.log(chalk.gray('• Consider using a vendor key for automated access'));
      break;

    case 'expired_token':
      console.log(chalk.red('Authentication token has expired'));
      console.log(chalk.gray('• Please log in again to refresh your session'));
      console.log(chalk.gray('• Consider using a vendor key for longer-term access'));
      await config.clearInvalidCredentials();
      break;

    default:
      console.log(chalk.red(`Unexpected error: ${sanitizeErrorMessage(error.message || 'Unknown error')}`));
      console.log(chalk.gray('• Please try again'));
      console.log(chalk.gray('• If the problem persists, contact support'));
  }

  // Progressive guidance for repeated failures
  if (failureCount >= 3) {
    console.log();
    console.log(chalk.yellow('💡 Multiple failures detected. Recovery options:'));

    if (authMethod === 'vendor_key') {
      console.log(chalk.cyan('• Generate a new vendor key from your dashboard'));
      console.log(chalk.cyan('• Try: lanonasis auth logout && lanonasis auth login'));
      console.log(chalk.cyan('• Switch to browser login: lanonasis auth login (choose Browser Login)'));
    } else {
      console.log(chalk.cyan('• Reset your password if you\'re unsure'));
      console.log(chalk.cyan('• Try vendor key authentication instead'));
      console.log(chalk.cyan('• Clear stored config: lanonasis auth logout'));
    }

    if (failureCount >= 5) {
      console.log(chalk.yellow('• Consider contacting support if issues persist'));
      console.log(chalk.gray('• Include error details and your email address'));
    }
  }
}

// Categorize authentication errors for specific handling
function categorizeAuthError(error: any): 'invalid_credentials' | 'network_error' | 'server_error' | 'rate_limited' | 'expired_token' | 'unknown' {
  if (!error) return 'unknown';

  // Check HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;
    switch (status) {
      case 401:
        // Check if it's specifically an expired token
        if (error.response.data?.error?.includes('expired') || error.response.data?.message?.includes('expired')) {
          return 'expired_token';
        }
        return 'invalid_credentials';
      case 403:
        return 'invalid_credentials';
      case 429:
        return 'rate_limited';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'server_error';
    }
  }

  // Check error codes for network issues
  if (error.code) {
    switch (error.code) {
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
      case 'ECONNRESET':
      case 'ETIMEDOUT':
      case 'ENETUNREACH':
        return 'network_error';
    }
  }

  // Check error messages
  const message = error.message?.toLowerCase() || '';
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    return 'network_error';
  }
  if (message.includes('invalid') || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'invalid_credentials';
  }
  if (message.includes('expired')) {
    return 'expired_token';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'rate_limited';
  }

  return 'unknown';
}


// ============================================
// OAuth2 PKCE Helper Functions
// ============================================

/**
 * Generate PKCE code verifier and challenge for OAuth2
 */
function generatePKCE(): { verifier: string; challenge: string } {
  // Generate random verifier (43-128 chars, base64url)
  const verifier = crypto.randomBytes(32).toString('base64url');
  
  // Generate challenge: base64url(sha256(verifier))
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  
  return { verifier, challenge };
}

/**
 * Sanitize error messages to prevent command injection
 */
function sanitizeErrorMessage(message: string): string {
  if (typeof message !== 'string') return 'Unknown error';
  
  // Remove potential command injection characters
  return message
    .replace(/[;&|`$()]/g, '') // Remove shell metacharacters
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .trim();
}

/**
 * Start local HTTP server to catch OAuth2 callback
 */
function createCallbackServer(port: number = 8888): Promise<{ code: string; state?: string }> {
  return new Promise((resolve, reject) => {
    // Sanitize HTML to prevent XSS
    function sanitizeHtml(str: string): string {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
    
    const server = http.createServer((req, res) => {
      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      const parsedUrl = url.parse(req.url!, true);
      
      if (parsedUrl.pathname === '/callback') {
        const { code, state, error, error_description } = parsedUrl.query;
        
        // Send response to browser
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Authentication Failed</title></head>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>❌ Authentication Failed</h1>
                <p>${sanitizeHtml(String(error_description || error))}</p>
                <p style="color: gray;">You can close this window.</p>
              </body>
            </html>
          `);
          reject(new Error(`OAuth error: ${error_description || error}`));
        } else if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Authentication Successful</title></head>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>✅ Authentication Successful</h1>
                <p>You can close this window and return to the CLI.</p>
                <script>setTimeout(() => window.close(), 2000);</script>
              </body>
            </html>
          `);
          resolve({ code: code as string, state: state as string });
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid callback');
          reject(new Error('No authorization code received'));
        }
        
        // Close server after handling request
        server.close();
      }
    });
    
    server.listen(port, () => {
      console.log(chalk.gray(`   Local callback server listening on port ${port}`));
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timeout - please try again'));
    }, 300000);
  });
}

/**
 * Exchange authorization code for OAuth2 tokens
 */
async function exchangeCodeForTokens(
  code: string,
  verifier: string,
  authBase: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const tokenEndpoint = `${authBase}/oauth/token`;
  
  try {
    // Use axios directly to have full control over error handling
    const response = await axios.post(tokenEndpoint, {
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: 'lanonasis-cli',
      redirect_uri: redirectUri
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    return response.data;
  } catch (error: any) {
    // Extract detailed error information from axios error response
    if (error.response) {
      const errorData = error.response.data || {};
      const status = error.response.status;
      const errorMessage = errorData.error_description || errorData.error || error.message || `Request failed with status code ${status}`;
      const details = errorData.details;
      
      const enhancedError: any = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.status = status;
      enhancedError.details = details;
      enhancedError.errorData = errorData;
      throw enhancedError;
    }
    // If it's not an axios error, just rethrow
    throw error;
  }
}

/**
 * Refresh OAuth2 access token using refresh token
 * @internal Used for token refresh flows
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function refreshOAuth2Token(config: CLIConfig): Promise<boolean> {
  const refreshToken = config.get<string>('refresh_token');
  if (!refreshToken) {
    return false;
  }

  try {
    const authBase = config.getDiscoveredApiUrl();
    const response = await apiClient.post(`${authBase}/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'lanonasis-cli'
    });

    await config.setToken(response.access_token);
    if (response.refresh_token) {
      await config.set('refresh_token', response.refresh_token);
    }
    await config.set('token_expires_at', Date.now() + (response.expires_in * 1000));

    return true;
  } catch {
    console.error(chalk.yellow('⚠️  Token refresh failed, please re-authenticate'));
    return false;
  }
}


export async function diagnoseCommand(): Promise<void> {
  const config = new CLIConfig();
  await config.init();

  console.log(chalk.blue.bold('🔍 Authentication Diagnostic'));
  console.log(colors.info('━'.repeat(50)));
  console.log();

  const diagnostics = {
    configExists: false,
    hasCredentials: false,
    credentialType: 'none' as 'none' | 'vendor_key' | 'jwt' | 'oauth',
    credentialsValid: false,
    tokenExpired: false,
    authFailures: 0,
    lastFailure: null as string | null,
    endpointsReachable: false,
    serviceDiscovery: false,
    deviceId: null as string | null
  };

  // Step 1: Check if config exists
  console.log(chalk.cyan('1. Configuration File'));
  try {
    const configExists = await config.exists();
    diagnostics.configExists = configExists;

    if (configExists) {
      console.log(chalk.green('   ✓ Config file exists at'), config.getConfigPath());
    } else {
      console.log(chalk.red('   ✖ Config file not found at'), config.getConfigPath());
      console.log(chalk.gray('   → Run: lanonasis auth login'));
    }
  } catch (error) {
    console.log(chalk.red('   ✖ Error checking config:'), error instanceof Error ? error.message : 'Unknown error');
  }

  // Step 2: Check stored credentials
  console.log(chalk.cyan('\n2. Stored Credentials'));
  const token = config.getToken();
  const vendorKey = await config.getVendorKeyAsync();
  const authMethod = config.get<string>('authMethod');

  if (vendorKey) {
    diagnostics.hasCredentials = true;
    diagnostics.credentialType = 'vendor_key';
    console.log(chalk.green('   ✓ Vendor key found'));

    // Validate vendor key presence
    const formatValidation = config.validateVendorKeyFormat(vendorKey);
    if (formatValidation !== true) {
      console.log(chalk.red(`   ✖ Vendor key issue: ${formatValidation}`));
    }
  } else if (token) {
    diagnostics.hasCredentials = true;
    diagnostics.credentialType = authMethod === 'oauth' ? 'oauth' : 'jwt';
    console.log(chalk.green(`   ✓ ${diagnostics.credentialType.toUpperCase()} token found`));

    // Check token expiry
    try {
      const isAuth = await config.isAuthenticated();
      if (!isAuth) {
        diagnostics.tokenExpired = true;
        console.log(chalk.red('   ✖ Token is expired'));
      } else {
        console.log(chalk.green('   ✓ Token is not expired'));
      }
    } catch (error) {
      console.log(chalk.yellow('   ⚠ Could not validate token expiry'));
      if (process.env.CLI_VERBOSE === 'true' && error instanceof Error) {
        console.log(chalk.gray(`     ${error.message}`));
      }
    }
  } else {
    console.log(chalk.red('   ✖ No credentials found'));
    console.log(chalk.gray('   → Run: lanonasis auth login'));
  }

  // Step 3: Check authentication failures
  console.log(chalk.cyan('\n3. Authentication History'));
  diagnostics.authFailures = config.getFailureCount();
  diagnostics.lastFailure = config.getLastAuthFailure() ?? null;

  if (diagnostics.authFailures === 0) {
    console.log(chalk.green('   ✓ No recent authentication failures'));
  } else {
    console.log(chalk.yellow(`   ⚠ ${diagnostics.authFailures} recent authentication failures`));
    if (diagnostics.lastFailure) {
      const lastFailureDate = new Date(diagnostics.lastFailure);
      console.log(chalk.gray(`     Last failure: ${lastFailureDate.toLocaleString()}`));
    }

    if (config.shouldDelayAuth()) {
      const delayMs = config.getAuthDelayMs();
      console.log(chalk.yellow(`   ⚠ Authentication delay active: ${Math.round(delayMs / 1000)}s`));
    }
  }

  // Step 4: Test credential validation against server
  console.log(chalk.cyan('\n4. Server Validation'));
  if (diagnostics.hasCredentials) {
    const spinner = ora('Testing credentials against server...').start();
    try {
      const isValid = await config.validateStoredCredentials();
      diagnostics.credentialsValid = isValid;

      if (isValid) {
        spinner.succeed('Credentials are valid');
        console.log(chalk.green('   ✓ Server authentication successful'));
      } else {
        spinner.fail('Credentials are invalid');
        console.log(chalk.red('   ✖ Server rejected credentials'));
        console.log(chalk.gray('   → Try: lanonasis auth login'));
      }
    } catch (error) {
      spinner.fail('Server validation failed');
      console.log(chalk.red('   ✖ Could not validate with server:'));
      console.log(chalk.gray(`     ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  } else {
    console.log(chalk.gray('   - Skipped (no credentials to validate)'));
  }

  // Step 5: Test endpoint connectivity
  console.log(chalk.cyan('\n5. Endpoint Connectivity'));
  const spinner2 = ora('Testing authentication endpoints...').start();
  try {
    await config.discoverServices();
    diagnostics.serviceDiscovery = true;

    const services = config.get('discoveredServices');
    if (services) {
      spinner2.succeed('Authentication endpoints reachable');
      console.log(chalk.green('   ✓ Service discovery successful'));
      console.log(chalk.gray(`     Auth endpoint: ${(services as any).auth_base}`));
      diagnostics.endpointsReachable = true;
    } else {
      spinner2.warn('Using fallback endpoints');
      console.log(chalk.yellow('   ⚠ Service discovery failed, using fallbacks'));
      diagnostics.endpointsReachable = true; // Fallbacks still work
    }
  } catch (error) {
    spinner2.fail('Endpoint connectivity failed');
    console.log(chalk.red('   ✖ Cannot reach authentication endpoints'));
    console.log(chalk.gray(`     ${error instanceof Error ? error.message : 'Unknown error'}`));
    console.log(chalk.gray('   → Check internet connection'));
  }

  // Step 6: Device identification
  console.log(chalk.cyan('\n6. Device Information'));
  try {
    const deviceId = await config.getDeviceId();
    diagnostics.deviceId = deviceId;
    console.log(chalk.green('   ✓ Device ID:'), chalk.gray(deviceId));
  } catch (error) {
    console.log(chalk.yellow('   ⚠ Could not get device ID'));
    if (process.env.CLI_VERBOSE === 'true' && error instanceof Error) {
      console.log(chalk.gray(`     ${error.message}`));
    }
  }

  // Summary and recommendations
  console.log(chalk.blue.bold('\n📋 Diagnostic Summary'));
  console.log(colors.info('━'.repeat(50)));

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!diagnostics.configExists) {
    issues.push('No configuration file found');
    recommendations.push('Run: lanonasis auth login');
  }

  if (!diagnostics.hasCredentials) {
    issues.push('No authentication credentials stored');
    recommendations.push('Run: lanonasis auth login --vendor-key <your-key>');
  }

  if (diagnostics.hasCredentials && !diagnostics.credentialsValid) {
    issues.push('Stored credentials are invalid');
    recommendations.push('Run: lanonasis auth logout && lanonasis auth login');
  }

  if (diagnostics.tokenExpired) {
    issues.push('Authentication token has expired');
    recommendations.push('Run: lanonasis auth login');
  }

  if (diagnostics.authFailures >= 3) {
    issues.push(`Multiple authentication failures (${diagnostics.authFailures})`);
    recommendations.push('Wait for delay period, then try: lanonasis auth login');
  }

  if (!diagnostics.endpointsReachable) {
    issues.push('Cannot reach authentication endpoints');
    recommendations.push('Check internet connection and firewall settings');
  }

  if (issues.length === 0) {
    console.log(chalk.green('✅ All authentication checks passed!'));
    console.log(chalk.cyan('   Your authentication is working correctly.'));
  } else {
    console.log(chalk.red(`❌ Found ${issues.length} issue(s):`));
    issues.forEach(issue => {
      console.log(chalk.red(`   • ${issue}`));
    });

    console.log(chalk.yellow('\n💡 Recommended actions:'));
    recommendations.forEach(rec => {
      console.log(chalk.cyan(`   • ${rec}`));
    });
  }

  // Additional troubleshooting info
  if (diagnostics.authFailures > 0 || !diagnostics.credentialsValid) {
    console.log(chalk.gray('\n🔧 Additional troubleshooting:'));
    console.log(chalk.gray('   • Verify the vendor key matches the value shown in your dashboard'));
    console.log(chalk.gray('   • Check if your key is active in the dashboard'));
    console.log(chalk.gray('   • Try browser authentication: lanonasis auth login (choose Browser Login)'));
    console.log(chalk.gray('   • Contact support if issues persist'));
  }
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  const config = new CLIConfig();
  await config.init();

  console.log(chalk.blue.bold('🔐 Onasis-Core Golden Contract Authentication'));
  console.log(colors.info('━'.repeat(50)));
  console.log();

  // Debug: Check options
  if (process.env.CLI_VERBOSE === 'true') {
    console.log('Debug - Login options:', {
      hasEmail: !!options.email,
      hasPassword: !!options.password,
      hasVendorKey: !!options.vendorKey
    });
  }

  // Enhanced authentication flow - check for vendor key first
  if (options.vendorKey) {
    await handleVendorKeyAuth(options.vendorKey, config);
    return;
  }

  // Check for email/password for direct credentials flow
  if (options.email && options.password) {
    await handleCredentialsFlow(options, config);
    return;
  }

  // Show authentication options
  const authChoice = await inquirer.prompt<{ method: 'vendor' | 'oauth' | 'credentials' }>([
    {
      type: 'list',
      name: 'method',
      message: 'Choose authentication method:',
      choices: [
        {
          name: '🔑 Vendor Key (Recommended for API access)',
          value: 'vendor'
        },
        {
          name: '🌐 Browser Login (Get token from web page)',
          value: 'oauth'
        },
        {
          name: '⚙️  Username/Password (Direct credentials)',
          value: 'credentials'
        }
      ]
    }
  ]);

  switch (authChoice.method) {
    case 'vendor':
      await handleVendorKeyFlow(config);
      break;
    case 'oauth':
      await handleOAuthFlow(config);
      break;
    case 'credentials':
      await handleCredentialsFlow(options, config);
      break;
  }
}

async function handleVendorKeyAuth(vendorKey: string, config: CLIConfig): Promise<void> {
  // Check for authentication delay before attempting
  await handleAuthDelay(config);

  const spinner = ora('Validating vendor key...').start();

  try {
    await config.setVendorKey(vendorKey);

    // Test the vendor key with a health check
    await apiClient.get('/health');

    spinner.succeed('Vendor key authentication successful');

    console.log();
    console.log(chalk.green('✓ Authenticated with vendor key'));
    console.log(colors.info('Ready to use Onasis-Core services'));

  } catch (error: unknown) {
    spinner.fail('Vendor key validation failed');

    // Use enhanced error handling
    await handleAuthenticationFailure(error, config, 'vendor_key');

    process.exit(1);
  }
}

async function handleVendorKeyFlow(config: CLIConfig): Promise<void> {
  console.log();
  console.log(chalk.yellow('🔑 Vendor Key Authentication'));
  console.log(chalk.gray('Vendor keys provide secure API access for automation and integrations.'));
  console.log();

  // Enhanced guidance for obtaining vendor keys
  console.log(chalk.cyan('📋 How to get your vendor key:'));
  console.log(chalk.gray('1. Visit your Lanonasis dashboard at https://dashboard.lanonasis.com'));
  console.log(chalk.gray('2. Navigate to Settings → API Keys'));
  console.log(chalk.gray('3. Click "Generate New Key" and copy the full key value'));
  console.log();

  const { vendorKey } = await inquirer.prompt<{ vendorKey: string }>([
    {
      type: 'password',
      name: 'vendorKey',
      message: 'Enter your vendor key:',
      mask: '*',
      validate: (input: string) => {
        return config.validateVendorKeyFormat(input);
      }
    }
  ]);

  await handleVendorKeyAuth(vendorKey, config);
}

async function handleOAuthFlow(config: CLIConfig): Promise<void> {
  console.log();
  console.log(chalk.yellow('🌐 Browser-Based OAuth2 Authentication'));
  console.log(chalk.gray('Secure authentication using OAuth2 with PKCE'));
  console.log();

  const { openBrowser } = await inquirer.prompt<{ openBrowser: boolean }>([
    {
      type: 'confirm',
      name: 'openBrowser',
      message: 'Open browser for OAuth2 authentication?',
      default: true
    }
  ]);

  if (!openBrowser) {
    console.log(chalk.yellow('⚠️  Authentication cancelled'));
    return;
  }

  try {
    // Generate PKCE challenge
    const pkce = generatePKCE();
    console.log(chalk.gray('   ✓ Generated PKCE challenge'));

    // Start local callback server
    const callbackPort = 8888;
    const callbackPromise = createCallbackServer(callbackPort);
    console.log(chalk.gray(`   ✓ Started local callback server on port ${callbackPort}`));

    // Build OAuth2 authorization URL
    const authBase = config.getDiscoveredApiUrl();
    const redirectUri = `http://localhost:${callbackPort}/callback`;
    const authUrl = new URL(`${authBase}/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', 'lanonasis-cli');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'read write offline_access');
    authUrl.searchParams.set('code_challenge', pkce.challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', crypto.randomBytes(16).toString('hex'));

    console.log();
    console.log(colors.info('Opening browser for authentication...'));
    await open(authUrl.toString());

    console.log(colors.info('Waiting for authentication in browser...'));
    console.log(colors.muted(`If browser doesn't open, visit: ${authUrl.toString()}`));
    console.log();

    // Wait for callback
    const spinner = ora('Waiting for authorization...').start();
    const { code } = await callbackPromise;
    spinner.succeed('Authorization code received');

    // Exchange code for tokens
    spinner.text = 'Exchanging code for access tokens...';
    spinner.start();
    
    // Debug logging in verbose mode
    if (process.env.CLI_VERBOSE === 'true') {
      console.log(chalk.dim(`   Code length: ${code.length}`));
      console.log(chalk.dim(`   Verifier length: ${pkce.verifier.length}`));
      console.log(chalk.dim(`   Redirect URI: ${redirectUri}`));
      console.log(chalk.dim(`   Token endpoint: ${authBase}/oauth/token`));
    }
    
    const tokens = await exchangeCodeForTokens(code, pkce.verifier, authBase, redirectUri);
    spinner.succeed('Access tokens received');

    // Store OAuth tokens - these are already valid auth-gateway tokens from /oauth/token
    // No need for additional exchange since /oauth/token returns auth-gateway's own tokens
    await config.setToken(tokens.access_token);
    await config.set('refresh_token', tokens.refresh_token);
    await config.set('token_expires_at', Date.now() + (tokens.expires_in * 1000));
    await config.set('authMethod', 'oauth');

    // The OAuth access token from auth-gateway works as the API token for all services
    // Store it as the vendor key equivalent for MCP and API access
    spinner.text = 'Configuring unified access...';
    spinner.start();

    // Use the OAuth access token directly - it's already an auth-gateway token
    await config.setVendorKey(tokens.access_token);
    spinner.succeed('Unified authentication configured');

    console.log();
    console.log(chalk.green('✓ OAuth2 authentication successful'));
    console.log(colors.info('You can now use all Lanonasis services'));
    console.log(chalk.gray('✓ MCP, API, and CLI access configured'));

    process.exit(0);

  } catch (error: any) {
    console.error(chalk.red('✖ OAuth2 authentication failed'));
    
    // Display detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.gray(`   ${errorMessage}`));
    
    // Show validation details if available
    if (error.details) {
      console.error(chalk.yellow('\n   Validation errors:'));
      for (const [field, messages] of Object.entries(error.details)) {
        const msgArray = Array.isArray(messages) ? messages : [messages];
        msgArray.forEach((msg: string) => {
          console.error(chalk.gray(`     • ${field}: ${msg}`));
        });
      }
    }
    
    // Show error data if available
    if (error.errorData) {
      const errorData = error.errorData;
      if (errorData.error) {
        console.error(chalk.yellow(`\n   Error: ${errorData.error}`));
      }
      if (errorData.error_description) {
        console.error(chalk.gray(`   ${errorData.error_description}`));
      }
      // Show details if not already shown above
      if (!error.details && errorData.details) {
        console.error(chalk.yellow('\n   Details:'));
        console.error(chalk.gray(JSON.stringify(errorData.details, null, 2)));
      }
    }
    
    // Show full error response in verbose mode
    if (process.env.CLI_VERBOSE === 'true') {
      if (error.response?.data) {
        console.error(chalk.dim('\n   Full error response:'));
        console.error(chalk.dim(JSON.stringify(error.response.data, null, 2)));
      }
      if (error.response?.config) {
        console.error(chalk.dim('\n   Request config:'));
        console.error(chalk.dim(JSON.stringify({
          url: error.response.config.url,
          method: error.response.config.method,
          data: error.response.config.data
        }, null, 2)));
      }
    }
    
    process.exit(1);
  }
}



async function handleCredentialsFlow(options: LoginOptions, config: CLIConfig): Promise<void> {
  console.log();
  console.log(chalk.yellow('⚙️  Username/Password Authentication'));
  console.log();

  // Check for authentication delay before attempting
  await handleAuthDelay(config);

  let { email, password } = options;

  // Get credentials if not provided
  if (!email || !password) {
    const answers = await inquirer.prompt<LoginAnswers>([
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        default: email,
        validate: (input: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Please enter a valid email address';
        }
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        validate: (input: string) => input.length > 0 || 'Password is required'
      }
    ]);

    email = answers.email;
    password = answers.password;
  }

  const spinner = ora('Authenticating...').start();

  try {
    const response = await apiClient.login(email, password);

    if (process.env.CLI_VERBOSE === 'true') {
      console.log(chalk.dim('   Login response:'), JSON.stringify(response, null, 2));
    }

    // The auth-gateway login endpoint already returns the correct token format
    // No need to exchange - this token works with all services (MCP, API, CLI)
    const authToken = response.token || (response as any).access_token;

    if (!authToken) {
      throw new Error('No token received from login response');
    }

    if (process.env.CLI_VERBOSE === 'true') {
      console.log(chalk.dim(`   JWT received (length: ${authToken.length})`));
    }

    // Store JWT token for API authentication
    await config.setToken(authToken);
    await config.set('authMethod', 'jwt');

    spinner.succeed('Login successful');

    console.log();
    console.log(chalk.green('✓ Authenticated successfully'));
    console.log(`Welcome, ${response.user.email}!`);
    if (response.user.role) {
      console.log(`Role: ${response.user.role}`);
    }
    console.log(chalk.gray('✓ API and MCP access configured'));
    console.log(chalk.dim('Your JWT token works with all services: API, MCP, CLI.'));


  } catch (error: unknown) {
    spinner.fail('Login failed');

    // Use enhanced error handling
    await handleAuthenticationFailure(error, config, 'jwt');

    // For 401 errors, offer registration option
    const errorResponse = error && typeof error === 'object' && 'response' in error ? (error as Record<string, unknown>).response : null;
    if (errorResponse && typeof errorResponse === 'object' && 'status' in errorResponse && errorResponse.status === 401) {
      console.log();
      const answer = await inquirer.prompt<RegisterPromptAnswer>([
        {
          type: 'confirm',
          name: 'register',
          message: 'Would you like to create a new account?',
          default: false
        }
      ]);

      if (answer.register) {
        await registerFlow(email);
        return; // Don't exit if registration succeeds
      }
    }

    process.exit(1);
  }
}

async function registerFlow(defaultEmail?: string): Promise<void> {
  console.log();
  console.log(chalk.blue.bold('📝 Create New Account'));
  console.log();

  const answers = await inquirer.prompt<RegistrationAnswers>([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
      default: defaultEmail,
      validate: (input: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input) || 'Please enter a valid email address';
      }
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password (min 8 characters):',
      mask: '*',
      validate: (input: string) => input.length >= 8 || 'Password must be at least 8 characters'
    },
    {
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm password:',
      mask: '*',
      validate: (input: string, answers?: RegistrationAnswers) => {
        return input === answers?.password || 'Passwords do not match';
      }
    },
    {
      type: 'input',
      name: 'organizationName',
      message: 'Organization name (optional):',
      default: ''
    }
  ]);

  const spinner = ora('Creating account...').start();

  try {
    const response = await apiClient.register(
      answers.email,
      answers.password,
      answers.organizationName || undefined
    );

    const config = new CLIConfig();
    await config.setToken(response.token);

    spinner.succeed('Account created successfully');

    console.log();
    console.log(chalk.green('✓ Account created and authenticated'));
    console.log(`Welcome to MaaS, ${response.user.email}!`);
    if (answers.organizationName) {
      console.log(`Organization: ${answers.organizationName}`);
    }
    console.log(`Plan: ${response.user.plan || 'free'}`);

  } catch (error: unknown) {
    spinner.fail('Registration failed');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✖ Registration failed:'), errorMessage);
    process.exit(1);
  }
}
