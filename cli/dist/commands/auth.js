import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { apiClient } from '../utils/api.js';
import { CLIConfig } from '../utils/config.js';
export async function loginCommand(options) {
    const config = new CLIConfig();
    await config.init();
    console.log(chalk.blue.bold('🔐 Login to MaaS (Supabase Auth)'));
    console.log();
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
        if (error.response?.status === 401) {
            console.error(chalk.red('✖ Invalid email or password'));
            // Ask if they want to register
            const answer = await inquirer.prompt([
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
        }
        else {
            console.error(chalk.red('✖ Login failed:'), error.message);
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
                return input === answers.password || 'Passwords do not match';
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
        console.error(chalk.red('✖ Registration failed:'), error.message);
        process.exit(1);
    }
}
