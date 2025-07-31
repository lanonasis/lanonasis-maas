import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { apiClient } from '../utils/api.js';
import { CLIConfig } from '../utils/config.js';

// Type definitions for command options
interface LoginOptions {
  email?: string;
  password?: string;
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

  console.log(chalk.blue.bold('🔐 Login to MaaS (Supabase Auth)'));
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