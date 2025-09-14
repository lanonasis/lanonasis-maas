import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import open from 'open';
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

export async function loginCommand(options: LoginOptions): Promise<void> {
  const config = new CLIConfig();
  await config.init();

  console.log(chalk.blue.bold('🔐 Onasis-Core Golden Contract Authentication'));
  console.log(colors.info('━'.repeat(50)));
  console.log();
  
  // Enhanced authentication flow - check for vendor key first
  if (options.vendorKey) {
    await handleVendorKeyAuth(options.vendorKey, config);
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
          name: '🌐 Web OAuth (Browser-based)',
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
  const spinner = ora('Validating vendor key...').start();
  
  try {
    await config.setVendorKey(vendorKey);
    
    // Test the vendor key with a health check
    const response = await apiClient.get('/health');
    
    spinner.succeed('Vendor key authentication successful');
    
    console.log();
    console.log(chalk.green('✓ Authenticated with vendor key'));
    console.log(colors.info('Ready to use Onasis-Core services'));
    
  } catch (error: unknown) {
    spinner.fail('Vendor key validation failed');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✖ Invalid vendor key:'), errorMessage);
    process.exit(1);
  }
}

async function handleVendorKeyFlow(config: CLIConfig): Promise<void> {
  console.log();
  console.log(chalk.yellow('🔑 Vendor Key Authentication'));
  console.log(chalk.gray('Vendor keys provide secure API access with format: pk_xxx.sk_xxx'));
  console.log();
  
  const { vendorKey } = await inquirer.prompt<{ vendorKey: string }>([
    {
      type: 'password',
      name: 'vendorKey',
      message: 'Enter your vendor key (pk_xxx.sk_xxx):',
      mask: '*',
      validate: (input: string) => {
        if (!input) return 'Vendor key is required';
        if (!input.match(/^pk_[a-zA-Z0-9]+\.sk_[a-zA-Z0-9]+$/)) {
          return 'Invalid format. Expected: pk_xxx.sk_xxx';
        }
        return true;
      }
    }
  ]);
  
  await handleVendorKeyAuth(vendorKey, config);
}

async function handleOAuthFlow(config: CLIConfig): Promise<void> {
  console.log();
  console.log(chalk.yellow('🌐 Web OAuth Authentication'));
  console.log(chalk.gray('This will open your browser for secure authentication'));
  console.log();
  
  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Open browser for authentication?',
      default: true
    }
  ]);
  
  if (!proceed) {
    console.log(chalk.yellow('Authentication cancelled'));
    return;
  }
  
  const baseUrl = config.getDiscoveredApiUrl().replace(/\/$/, '');
  const authUrl = `${baseUrl}/auth/cli-login`;
  
  try {
    console.log(colors.info('Opening browser...'));
    await open(authUrl);
    
    console.log();
    console.log(colors.info('Please complete authentication in your browser'));
    console.log(colors.muted(`If browser doesn't open, visit: ${authUrl}`));
    
    // TODO: Implement OAuth callback handling or polling mechanism
    const { token } = await inquirer.prompt<{ token: string }>([
      {
        type: 'input',
        name: 'token',
        message: 'Paste the authentication token from browser:'
      }
    ]);
    
    if (token) {
      await config.setToken(token);
      console.log(chalk.green('✓ OAuth authentication successful'));
    }
    
  } catch (error) {
    console.error(chalk.red('✖ Failed to open browser'));
    console.log(colors.muted(`Please visit manually: ${authUrl}`));
  }
}

async function handleCredentialsFlow(options: LoginOptions, config: CLIConfig): Promise<void> {
  console.log();
  console.log(chalk.yellow('⚙️  Username/Password Authentication'));
  console.log();

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
    
  } catch (error: unknown) {
    spinner.fail('Login failed');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorResponse = error && typeof error === 'object' && 'response' in error ? (error as Record<string, unknown>).response : null;
    
    if (errorResponse && typeof errorResponse === 'object' && 'status' in errorResponse && errorResponse.status === 401) {
      console.error(chalk.red('✖ Invalid email or password'));
      
      // Ask if they want to register
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
      }
    } else {
      console.error(chalk.red('✖ Login failed:'), errorMessage);
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