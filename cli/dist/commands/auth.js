import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { createServer } from 'http';
import open from 'open';
import { apiClient } from '../utils/api.js';
import { CLIConfig } from '../utils/config.js';
export async function loginCommand(options) {
    const config = new CLIConfig();
    await config.init();
    console.log(chalk.blue.bold('🔐 Login to MaaS (Core Gateway Auth)'));
    console.log(chalk.gray('Authenticate via https://api.lanonasis.com/v1/auth/*'));
    console.log();
    // Determine login method
    let loginMethod = options.method;
    if (!loginMethod || loginMethod === 'auto') {
        const methodAnswer = await inquirer.prompt([
            {
                type: 'list',
                name: 'method',
                message: 'Choose authentication method:',
                choices: [
                    { name: '🔑 Username/Password', value: 'password' },
                    { name: '🌐 OAuth (Browser)', value: 'oauth' }
                ],
                default: 'oauth'
            }
        ]);
        loginMethod = methodAnswer.method;
    }
    if (loginMethod === 'oauth') {
        await oauthLoginFlow(config);
        return;
    }
    // Username/password flow
    let { email, password } = options;
    // Get credentials if not provided
    if (!email || !password) {
        const answers = await inquirer.prompt([
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
    const spinner = ora('Authenticating...').start();
    try {
        const response = await apiClient.login(email, password);
        // Store token and user info
        await config.setToken(response.token);
        spinner.succeed('Login successful');
        console.log();
        console.log(chalk.green('✓ Authenticated successfully'));
        console.log(`Welcome, ${response.user.email}!`);
        if (response.user.organization_id) {
            console.log(`Organization: ${response.user.organization_id}`);
        }
        console.log(`Plan: ${response.user.plan || 'free'}`);
    }
    catch (error) {
        spinner.fail('Login failed');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorResponse = error && typeof error === 'object' && 'response' in error ? error.response : null;
        if (errorResponse && typeof errorResponse === 'object' && 'status' in errorResponse && errorResponse.status === 401) {
            console.error(chalk.red('✖ Invalid email or password'));
            // Ask if they want to try OAuth or register
            const answer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '🌐 Try OAuth login instead', value: 'oauth' },
                        { name: '📝 Create a new account', value: 'register' },
                        { name: '❌ Exit', value: 'exit' }
                    ]
                }
            ]);
            if (answer.action === 'oauth') {
                await oauthLoginFlow(config);
                return;
            }
            else if (answer.action === 'register') {
                await registerFlow(email);
                return;
            }
        }
        else {
            console.error(chalk.red('✖ Login failed:'), errorMessage);
        }
        process.exit(1);
    }
}
async function registerFlow(defaultEmail) {
    console.log();
    console.log(chalk.blue.bold('📝 Create New Account'));
    console.log();
    const answers = await inquirer.prompt([
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
    const spinner = ora('Creating account...').start();
    try {
        const response = await apiClient.register(answers.email, answers.password, answers.organizationName || undefined);
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
    }
    catch (error) {
        spinner.fail('Registration failed');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Registration failed:'), errorMessage);
        process.exit(1);
    }
}
async function oauthLoginFlow(config) {
    console.log(chalk.blue('🌐 OAuth Authentication'));
    console.log(chalk.gray('This will open your browser for secure authentication'));
    console.log();
    const port = 3721; // CLI callback port
    const redirectUri = `http://localhost:${port}/callback`;
    const state = Math.random().toString(36).substring(2, 15);
    // Construct OAuth URL
    const authUrl = new URL('https://api.lanonasis.com/v1/auth/oauth');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('project_scope', 'maas');
    authUrl.searchParams.set('response_type', 'code');
    const spinner = ora('Starting OAuth flow...').start();
    try {
        // Start local callback server
        const server = createServer();
        let authCode = null;
        let authError = null;
        server.on('request', (req, res) => {
            const url = new URL(req.url || '/', `http://localhost:${port}`);
            if (url.pathname === '/callback') {
                const code = url.searchParams.get('code');
                const error = url.searchParams.get('error');
                const returnedState = url.searchParams.get('state');
                // Validate state parameter
                if (returnedState !== state) {
                    authError = 'Invalid state parameter';
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h1>Authentication Failed</h1><p>Invalid state parameter</p>');
                    return;
                }
                if (error) {
                    authError = url.searchParams.get('error_description') || error;
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`<h1>Authentication Failed</h1><p>${authError}</p>`);
                }
                else if (code) {
                    authCode = code;
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>Authentication Successful</h1><p>You can close this window and return to the CLI.</p>');
                }
                else {
                    authError = 'No authorization code received';
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h1>Authentication Failed</h1><p>No authorization code received</p>');
                }
                server.close();
            }
        });
        // Start server
        await new Promise((resolve, reject) => {
            server.listen(port, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        spinner.text = 'Opening browser for authentication...';
        // Open browser
        await open(authUrl.toString());
        console.log();
        console.log(chalk.yellow('Browser opened for authentication'));
        console.log(chalk.gray(`If browser doesn't open, visit: ${authUrl.toString()}`));
        console.log();
        spinner.text = 'Waiting for authentication...';
        // Wait for callback
        await new Promise((resolve, reject) => {
            server.on('close', () => {
                if (authCode)
                    resolve();
                else
                    reject(new Error(authError || 'Authentication failed'));
            });
            // Timeout after 5 minutes
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timeout'));
            }, 300000);
        });
        if (!authCode) {
            throw new Error(authError || 'No authorization code received');
        }
        spinner.text = 'Exchanging authorization code for session...';
        // Exchange code for session
        const response = await fetch('https://api.lanonasis.com/v1/auth/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-project-scope': 'maas'
            },
            body: JSON.stringify({
                code: authCode,
                state: state,
                project_scope: 'maas'
            }),
            credentials: 'include'
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const sessionData = await response.json();
        // Store session token
        await config.setToken(sessionData.access_token);
        spinner.succeed('OAuth authentication successful');
        console.log();
        console.log(chalk.green('✓ Authenticated successfully via OAuth'));
        console.log(`Welcome, ${sessionData.user.email}!`);
        if (sessionData.user.organization_id) {
            console.log(`Organization: ${sessionData.user.organization_id}`);
        }
        console.log(`Plan: ${sessionData.user.plan || 'free'}`);
    }
    catch (error) {
        spinner.fail('OAuth authentication failed');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ OAuth failed:'), errorMessage);
        process.exit(1);
    }
}
