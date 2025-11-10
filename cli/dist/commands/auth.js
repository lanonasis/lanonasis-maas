"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnoseCommand = diagnoseCommand;
exports.loginCommand = loginCommand;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const open_1 = __importDefault(require("open"));
const crypto_1 = __importDefault(require("crypto"));
const http_1 = __importDefault(require("http"));
const url_1 = __importDefault(require("url"));
const api_js_1 = require("../utils/api.js");
const config_js_1 = require("../utils/config.js");
// Color scheme
const colors = {
    primary: chalk_1.default.blue.bold,
    success: chalk_1.default.green,
    warning: chalk_1.default.yellow,
    error: chalk_1.default.red,
    info: chalk_1.default.cyan,
    accent: chalk_1.default.magenta,
    muted: chalk_1.default.gray,
    highlight: chalk_1.default.white.bold
};
// Helper function to handle authentication delays
async function handleAuthDelay(config) {
    if (config.shouldDelayAuth()) {
        const delayMs = config.getAuthDelayMs();
        const failureCount = config.getFailureCount();
        const lastFailure = config.getLastAuthFailure();
        console.log();
        console.log(chalk_1.default.yellow(`⚠️  Multiple authentication failures detected (${failureCount} attempts)`));
        if (lastFailure) {
            const lastFailureDate = new Date(lastFailure);
            console.log(chalk_1.default.gray(`Last failure: ${lastFailureDate.toLocaleString()}`));
        }
        console.log(chalk_1.default.yellow(`Waiting ${Math.round(delayMs / 1000)} seconds before retry...`));
        console.log(chalk_1.default.gray('This delay helps prevent account lockouts and reduces server load.'));
        // Show countdown
        const spinner = (0, ora_1.default)(`Waiting ${Math.round(delayMs / 1000)} seconds...`).start();
        await new Promise(resolve => setTimeout(resolve, delayMs));
        spinner.succeed('Ready to retry authentication');
        console.log();
    }
}
// Enhanced authentication failure handler
async function handleAuthenticationFailure(error, config, authMethod = 'jwt') {
    // Increment failure count
    await config.incrementFailureCount();
    const failureCount = config.getFailureCount();
    // Determine error type and provide specific guidance
    const errorType = categorizeAuthError(error);
    console.log();
    console.log(chalk_1.default.red('✖ Authentication failed'));
    switch (errorType) {
        case 'invalid_credentials':
            console.log(chalk_1.default.red('Invalid credentials provided'));
            if (authMethod === 'vendor_key') {
                console.log(chalk_1.default.gray('• Verify the vendor key matches the value shown in your dashboard'));
                console.log(chalk_1.default.gray('• Confirm the key is active and has not been revoked'));
                console.log(chalk_1.default.gray('• Ensure you copied the entire key without extra spaces'));
            }
            else {
                console.log(chalk_1.default.gray('• Double-check your email and password'));
                console.log(chalk_1.default.gray('• Passwords are case-sensitive'));
                console.log(chalk_1.default.gray('• Consider resetting your password if needed'));
            }
            break;
        case 'network_error':
            console.log(chalk_1.default.red('Network connection failed'));
            console.log(chalk_1.default.gray('• Check your internet connection'));
            console.log(chalk_1.default.gray('• Verify you can access https://auth.lanonasis.com'));
            console.log(chalk_1.default.gray('• Try again in a few moments'));
            if (failureCount >= 2) {
                console.log(chalk_1.default.gray('• Consider using a different network if issues persist'));
            }
            break;
        case 'server_error':
            console.log(chalk_1.default.red('Server temporarily unavailable'));
            console.log(chalk_1.default.gray('• The authentication service may be experiencing issues'));
            console.log(chalk_1.default.gray('• Please try again in a few minutes'));
            console.log(chalk_1.default.gray('• Check https://status.lanonasis.com for service status'));
            break;
        case 'rate_limited':
            console.log(chalk_1.default.red('Too many authentication attempts'));
            console.log(chalk_1.default.gray('• Please wait before trying again'));
            console.log(chalk_1.default.gray('• Rate limiting helps protect your account'));
            console.log(chalk_1.default.gray('• Consider using a vendor key for automated access'));
            break;
        case 'expired_token':
            console.log(chalk_1.default.red('Authentication token has expired'));
            console.log(chalk_1.default.gray('• Please log in again to refresh your session'));
            console.log(chalk_1.default.gray('• Consider using a vendor key for longer-term access'));
            await config.clearInvalidCredentials();
            break;
        default:
            console.log(chalk_1.default.red(`Unexpected error: ${error.message || 'Unknown error'}`));
            console.log(chalk_1.default.gray('• Please try again'));
            console.log(chalk_1.default.gray('• If the problem persists, contact support'));
    }
    // Progressive guidance for repeated failures
    if (failureCount >= 3) {
        console.log();
        console.log(chalk_1.default.yellow('💡 Multiple failures detected. Recovery options:'));
        if (authMethod === 'vendor_key') {
            console.log(chalk_1.default.cyan('• Generate a new vendor key from your dashboard'));
            console.log(chalk_1.default.cyan('• Try: lanonasis auth logout && lanonasis auth login'));
            console.log(chalk_1.default.cyan('• Switch to browser login: lanonasis auth login (choose Browser Login)'));
        }
        else {
            console.log(chalk_1.default.cyan('• Reset your password if you\'re unsure'));
            console.log(chalk_1.default.cyan('• Try vendor key authentication instead'));
            console.log(chalk_1.default.cyan('• Clear stored config: lanonasis auth logout'));
        }
        if (failureCount >= 5) {
            console.log(chalk_1.default.yellow('• Consider contacting support if issues persist'));
            console.log(chalk_1.default.gray('• Include error details and your email address'));
        }
    }
}
// Categorize authentication errors for specific handling
function categorizeAuthError(error) {
    if (!error)
        return 'unknown';
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
function generatePKCE() {
    // Generate random verifier (43-128 chars, base64url)
    const verifier = crypto_1.default.randomBytes(32).toString('base64url');
    // Generate challenge: base64url(sha256(verifier))
    const challenge = crypto_1.default
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
    return { verifier, challenge };
}
/**
 * Start local HTTP server to catch OAuth2 callback
 */
function createCallbackServer(port = 8888) {
    return new Promise((resolve, reject) => {
        const server = http_1.default.createServer((req, res) => {
            const parsedUrl = url_1.default.parse(req.url, true);
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
                <p>${error_description || error}</p>
                <p style="color: gray;">You can close this window.</p>
              </body>
            </html>
          `);
                    reject(new Error(`OAuth error: ${error_description || error}`));
                }
                else if (code) {
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
                    resolve({ code: code, state: state });
                }
                else {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid callback');
                    reject(new Error('No authorization code received'));
                }
                // Close server after handling request
                server.close();
            }
        });
        server.listen(port, () => {
            console.log(chalk_1.default.gray(`   Local callback server listening on port ${port}`));
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
async function exchangeCodeForTokens(code, verifier, authBase) {
    const tokenEndpoint = `${authBase}/oauth/token`;
    const response = await api_js_1.apiClient.post(tokenEndpoint, {
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        client_id: 'lanonasis-cli',
        redirect_uri: 'http://localhost:8888/callback'
    });
    return response;
}
/**
 * Refresh OAuth2 access token using refresh token
 */
async function refreshOAuth2Token(config) {
    const refreshToken = config.get('refresh_token');
    if (!refreshToken) {
        return false;
    }
    try {
        const authBase = config.getDiscoveredApiUrl();
        const response = await api_js_1.apiClient.post(`${authBase}/oauth/token`, {
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
    }
    catch (error) {
        console.error(chalk_1.default.yellow('⚠️  Token refresh failed, please re-authenticate'));
        return false;
    }
}
async function diagnoseCommand() {
    const config = new config_js_1.CLIConfig();
    await config.init();
    console.log(chalk_1.default.blue.bold('🔍 Authentication Diagnostic'));
    console.log(colors.info('━'.repeat(50)));
    console.log();
    const diagnostics = {
        configExists: false,
        hasCredentials: false,
        credentialType: 'none',
        credentialsValid: false,
        tokenExpired: false,
        authFailures: 0,
        lastFailure: null,
        endpointsReachable: false,
        serviceDiscovery: false,
        deviceId: null
    };
    // Step 1: Check if config exists
    console.log(chalk_1.default.cyan('1. Configuration File'));
    try {
        const configExists = await config.exists();
        diagnostics.configExists = configExists;
        if (configExists) {
            console.log(chalk_1.default.green('   ✓ Config file exists at'), config.getConfigPath());
        }
        else {
            console.log(chalk_1.default.red('   ✖ Config file not found at'), config.getConfigPath());
            console.log(chalk_1.default.gray('   → Run: lanonasis auth login'));
        }
    }
    catch (error) {
        console.log(chalk_1.default.red('   ✖ Error checking config:'), error instanceof Error ? error.message : 'Unknown error');
    }
    // Step 2: Check stored credentials
    console.log(chalk_1.default.cyan('\n2. Stored Credentials'));
    const token = config.getToken();
    const vendorKey = config.getVendorKey();
    const authMethod = config.get('authMethod');
    if (vendorKey) {
        diagnostics.hasCredentials = true;
        diagnostics.credentialType = 'vendor_key';
        console.log(chalk_1.default.green('   ✓ Vendor key found'));
        // Validate vendor key presence
        const formatValidation = config.validateVendorKeyFormat(vendorKey);
        if (formatValidation !== true) {
            console.log(chalk_1.default.red(`   ✖ Vendor key issue: ${formatValidation}`));
        }
    }
    else if (token) {
        diagnostics.hasCredentials = true;
        diagnostics.credentialType = authMethod === 'oauth' ? 'oauth' : 'jwt';
        console.log(chalk_1.default.green(`   ✓ ${diagnostics.credentialType.toUpperCase()} token found`));
        // Check token expiry
        try {
            const isAuth = await config.isAuthenticated();
            if (!isAuth) {
                diagnostics.tokenExpired = true;
                console.log(chalk_1.default.red('   ✖ Token is expired'));
            }
            else {
                console.log(chalk_1.default.green('   ✓ Token is not expired'));
            }
        }
        catch (error) {
            console.log(chalk_1.default.yellow('   ⚠ Could not validate token expiry'));
            if (process.env.CLI_VERBOSE === 'true' && error instanceof Error) {
                console.log(chalk_1.default.gray(`     ${error.message}`));
            }
        }
    }
    else {
        console.log(chalk_1.default.red('   ✖ No credentials found'));
        console.log(chalk_1.default.gray('   → Run: lanonasis auth login'));
    }
    // Step 3: Check authentication failures
    console.log(chalk_1.default.cyan('\n3. Authentication History'));
    diagnostics.authFailures = config.getFailureCount();
    diagnostics.lastFailure = config.getLastAuthFailure() ?? null;
    if (diagnostics.authFailures === 0) {
        console.log(chalk_1.default.green('   ✓ No recent authentication failures'));
    }
    else {
        console.log(chalk_1.default.yellow(`   ⚠ ${diagnostics.authFailures} recent authentication failures`));
        if (diagnostics.lastFailure) {
            const lastFailureDate = new Date(diagnostics.lastFailure);
            console.log(chalk_1.default.gray(`     Last failure: ${lastFailureDate.toLocaleString()}`));
        }
        if (config.shouldDelayAuth()) {
            const delayMs = config.getAuthDelayMs();
            console.log(chalk_1.default.yellow(`   ⚠ Authentication delay active: ${Math.round(delayMs / 1000)}s`));
        }
    }
    // Step 4: Test credential validation against server
    console.log(chalk_1.default.cyan('\n4. Server Validation'));
    if (diagnostics.hasCredentials) {
        const spinner = (0, ora_1.default)('Testing credentials against server...').start();
        try {
            const isValid = await config.validateStoredCredentials();
            diagnostics.credentialsValid = isValid;
            if (isValid) {
                spinner.succeed('Credentials are valid');
                console.log(chalk_1.default.green('   ✓ Server authentication successful'));
            }
            else {
                spinner.fail('Credentials are invalid');
                console.log(chalk_1.default.red('   ✖ Server rejected credentials'));
                console.log(chalk_1.default.gray('   → Try: lanonasis auth login'));
            }
        }
        catch (error) {
            spinner.fail('Server validation failed');
            console.log(chalk_1.default.red('   ✖ Could not validate with server:'));
            console.log(chalk_1.default.gray(`     ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
    }
    else {
        console.log(chalk_1.default.gray('   - Skipped (no credentials to validate)'));
    }
    // Step 5: Test endpoint connectivity
    console.log(chalk_1.default.cyan('\n5. Endpoint Connectivity'));
    const spinner2 = (0, ora_1.default)('Testing authentication endpoints...').start();
    try {
        await config.discoverServices();
        diagnostics.serviceDiscovery = true;
        const services = config.get('discoveredServices');
        if (services) {
            spinner2.succeed('Authentication endpoints reachable');
            console.log(chalk_1.default.green('   ✓ Service discovery successful'));
            console.log(chalk_1.default.gray(`     Auth endpoint: ${services.auth_base}`));
            diagnostics.endpointsReachable = true;
        }
        else {
            spinner2.warn('Using fallback endpoints');
            console.log(chalk_1.default.yellow('   ⚠ Service discovery failed, using fallbacks'));
            diagnostics.endpointsReachable = true; // Fallbacks still work
        }
    }
    catch (error) {
        spinner2.fail('Endpoint connectivity failed');
        console.log(chalk_1.default.red('   ✖ Cannot reach authentication endpoints'));
        console.log(chalk_1.default.gray(`     ${error instanceof Error ? error.message : 'Unknown error'}`));
        console.log(chalk_1.default.gray('   → Check internet connection'));
    }
    // Step 6: Device identification
    console.log(chalk_1.default.cyan('\n6. Device Information'));
    try {
        const deviceId = await config.getDeviceId();
        diagnostics.deviceId = deviceId;
        console.log(chalk_1.default.green('   ✓ Device ID:'), chalk_1.default.gray(deviceId));
    }
    catch (error) {
        console.log(chalk_1.default.yellow('   ⚠ Could not get device ID'));
        if (process.env.CLI_VERBOSE === 'true' && error instanceof Error) {
            console.log(chalk_1.default.gray(`     ${error.message}`));
        }
    }
    // Summary and recommendations
    console.log(chalk_1.default.blue.bold('\n📋 Diagnostic Summary'));
    console.log(colors.info('━'.repeat(50)));
    const issues = [];
    const recommendations = [];
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
        console.log(chalk_1.default.green('✅ All authentication checks passed!'));
        console.log(chalk_1.default.cyan('   Your authentication is working correctly.'));
    }
    else {
        console.log(chalk_1.default.red(`❌ Found ${issues.length} issue(s):`));
        issues.forEach(issue => {
            console.log(chalk_1.default.red(`   • ${issue}`));
        });
        console.log(chalk_1.default.yellow('\n💡 Recommended actions:'));
        recommendations.forEach(rec => {
            console.log(chalk_1.default.cyan(`   • ${rec}`));
        });
    }
    // Additional troubleshooting info
    if (diagnostics.authFailures > 0 || !diagnostics.credentialsValid) {
        console.log(chalk_1.default.gray('\n🔧 Additional troubleshooting:'));
        console.log(chalk_1.default.gray('   • Verify the vendor key matches the value shown in your dashboard'));
        console.log(chalk_1.default.gray('   • Check if your key is active in the dashboard'));
        console.log(chalk_1.default.gray('   • Try browser authentication: lanonasis auth login (choose Browser Login)'));
        console.log(chalk_1.default.gray('   • Contact support if issues persist'));
    }
}
async function loginCommand(options) {
    const config = new config_js_1.CLIConfig();
    await config.init();
    console.log(chalk_1.default.blue.bold('🔐 Onasis-Core Golden Contract Authentication'));
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
    const authChoice = await inquirer_1.default.prompt([
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
async function handleVendorKeyAuth(vendorKey, config) {
    // Check for authentication delay before attempting
    await handleAuthDelay(config);
    const spinner = (0, ora_1.default)('Validating vendor key...').start();
    try {
        await config.setVendorKey(vendorKey);
        // Test the vendor key with a health check
        await api_js_1.apiClient.get('/health');
        spinner.succeed('Vendor key authentication successful');
        console.log();
        console.log(chalk_1.default.green('✓ Authenticated with vendor key'));
        console.log(colors.info('Ready to use Onasis-Core services'));
    }
    catch (error) {
        spinner.fail('Vendor key validation failed');
        // Use enhanced error handling
        await handleAuthenticationFailure(error, config, 'vendor_key');
        process.exit(1);
    }
}
async function handleVendorKeyFlow(config) {
    console.log();
    console.log(chalk_1.default.yellow('🔑 Vendor Key Authentication'));
    console.log(chalk_1.default.gray('Vendor keys provide secure API access for automation and integrations.'));
    console.log();
    // Enhanced guidance for obtaining vendor keys
    console.log(chalk_1.default.cyan('📋 How to get your vendor key:'));
    console.log(chalk_1.default.gray('1. Visit your Lanonasis dashboard at https://dashboard.lanonasis.com'));
    console.log(chalk_1.default.gray('2. Navigate to Settings → API Keys'));
    console.log(chalk_1.default.gray('3. Click "Generate New Key" and copy the full key value'));
    console.log();
    const { vendorKey } = await inquirer_1.default.prompt([
        {
            type: 'password',
            name: 'vendorKey',
            message: 'Enter your vendor key:',
            mask: '*',
            validate: (input) => {
                return config.validateVendorKeyFormat(input);
            }
        }
    ]);
    await handleVendorKeyAuth(vendorKey, config);
}
async function handleOAuthFlow(config) {
    console.log();
    console.log(chalk_1.default.yellow('🌐 Browser-Based OAuth2 Authentication'));
    console.log(chalk_1.default.gray('Secure authentication using OAuth2 with PKCE'));
    console.log();
    const { openBrowser } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'openBrowser',
            message: 'Open browser for OAuth2 authentication?',
            default: true
        }
    ]);
    if (!openBrowser) {
        console.log(chalk_1.default.yellow('⚠️  Authentication cancelled'));
        return;
    }
    try {
        // Generate PKCE challenge
        const pkce = generatePKCE();
        console.log(chalk_1.default.gray('   ✓ Generated PKCE challenge'));
        // Start local callback server
        const callbackPort = 8888;
        const callbackPromise = createCallbackServer(callbackPort);
        console.log(chalk_1.default.gray(`   ✓ Started local callback server on port ${callbackPort}`));
        // Build OAuth2 authorization URL
        const authBase = config.getDiscoveredApiUrl();
        const authUrl = new URL(`${authBase}/oauth/authorize`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', 'lanonasis-cli');
        authUrl.searchParams.set('redirect_uri', `http://localhost:${callbackPort}/callback`);
        authUrl.searchParams.set('scope', 'read write offline_access');
        authUrl.searchParams.set('code_challenge', pkce.challenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('state', crypto_1.default.randomBytes(16).toString('hex'));
        console.log();
        console.log(colors.info('Opening browser for authentication...'));
        await (0, open_1.default)(authUrl.toString());
        console.log(colors.info('Waiting for authentication in browser...'));
        console.log(colors.muted(`If browser doesn't open, visit: ${authUrl.toString()}`));
        console.log();
        // Wait for callback
        const spinner = (0, ora_1.default)('Waiting for authorization...').start();
        const { code } = await callbackPromise;
        spinner.succeed('Authorization code received');
        // Exchange code for tokens
        spinner.text = 'Exchanging code for access tokens...';
        spinner.start();
        const tokens = await exchangeCodeForTokens(code, pkce.verifier, authBase);
        spinner.succeed('Access tokens received');
        // Store tokens
        await config.setToken(tokens.access_token);
        await config.set('refresh_token', tokens.refresh_token);
        await config.set('token_expires_at', Date.now() + (tokens.expires_in * 1000));
        await config.set('authMethod', 'oauth2');
        console.log();
        console.log(chalk_1.default.green('✓ OAuth2 authentication successful'));
        console.log(colors.info('You can now use Lanonasis services'));
        process.exit(0);
    }
    catch (error) {
        console.error(chalk_1.default.red('✖ OAuth2 authentication failed'));
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk_1.default.gray(`   ${errorMessage}`));
        process.exit(1);
    }
}
async function handleCredentialsFlow(options, config) {
    console.log();
    console.log(chalk_1.default.yellow('⚙️  Username/Password Authentication'));
    console.log();
    // Check for authentication delay before attempting
    await handleAuthDelay(config);
    let { email, password } = options;
    // Get credentials if not provided
    if (!email || !password) {
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'email',
                message: 'Email:',
                default: email,
                validate: (input) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(input) || 'Please enter a valid email address';
                }
            },
            {
                type: 'password',
                name: 'password',
                message: 'Password:',
                mask: '*',
                validate: (input) => input.length > 0 || 'Password is required'
            }
        ]);
        email = answers.email;
        password = answers.password;
    }
    const spinner = (0, ora_1.default)('Authenticating...').start();
    try {
        const response = await api_js_1.apiClient.login(email, password);
        // Store token and user info
        await config.setToken(response.token);
        spinner.succeed('Login successful');
        console.log();
        console.log(chalk_1.default.green('✓ Authenticated successfully'));
        console.log(`Welcome, ${response.user.email}!`);
        if (response.user.organization_id) {
            console.log(`Organization: ${response.user.organization_id}`);
        }
        console.log(`Plan: ${response.user.plan || 'free'}`);
    }
    catch (error) {
        spinner.fail('Login failed');
        // Use enhanced error handling
        await handleAuthenticationFailure(error, config, 'jwt');
        // For 401 errors, offer registration option
        const errorResponse = error && typeof error === 'object' && 'response' in error ? error.response : null;
        if (errorResponse && typeof errorResponse === 'object' && 'status' in errorResponse && errorResponse.status === 401) {
            console.log();
            const answer = await inquirer_1.default.prompt([
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
async function registerFlow(defaultEmail) {
    console.log();
    console.log(chalk_1.default.blue.bold('📝 Create New Account'));
    console.log();
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'email',
            message: 'Email:',
            default: defaultEmail,
            validate: (input) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(input) || 'Please enter a valid email address';
            }
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password (min 8 characters):',
            mask: '*',
            validate: (input) => input.length >= 8 || 'Password must be at least 8 characters'
        },
        {
            type: 'password',
            name: 'confirmPassword',
            message: 'Confirm password:',
            mask: '*',
            validate: (input, answers) => {
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
    const spinner = (0, ora_1.default)('Creating account...').start();
    try {
        const response = await api_js_1.apiClient.register(answers.email, answers.password, answers.organizationName || undefined);
        const config = new config_js_1.CLIConfig();
        await config.setToken(response.token);
        spinner.succeed('Account created successfully');
        console.log();
        console.log(chalk_1.default.green('✓ Account created and authenticated'));
        console.log(`Welcome to MaaS, ${response.user.email}!`);
        if (answers.organizationName) {
            console.log(`Organization: ${answers.organizationName}`);
        }
        console.log(`Plan: ${response.user.plan || 'free'}`);
    }
    catch (error) {
        spinner.fail('Registration failed');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk_1.default.red('✖ Registration failed:'), errorMessage);
        process.exit(1);
    }
}
