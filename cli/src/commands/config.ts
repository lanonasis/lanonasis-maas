import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { CLIConfig } from '../utils/config.js';
import { apiClient } from '../utils/api.js';

// Type definitions for command options and answers
interface UrlPromptAnswer {
  url: string;
}

interface ResetConfirmAnswer {
  confirm: boolean;
}

interface ResetOptions {
  force?: boolean;
}

interface DependencyInfo {
  status: string;
  response_time?: number;
  latency_ms?: number;
}

export function configCommands(program: Command): void {
  // Show current configuration
  program
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      const config = new CLIConfig();
      await config.init();

      console.log(chalk.blue.bold('⚙️  Current Configuration'));
      console.log();
      console.log(chalk.green('API URL:'), config.getApiUrl());
      console.log(chalk.green('Config Path:'), config.getConfigPath());
      
      const isAuth = await config.isAuthenticated();
      console.log(chalk.green('Authenticated:'), isAuth ? chalk.green('Yes') : chalk.red('No'));
      
      if (isAuth) {
        const user = await config.getCurrentUser();
        if (user) {
          console.log(chalk.green('User:'), user.email);
          console.log(chalk.green('Organization:'), user.organization_id);
          console.log(chalk.green('Role:'), user.role);
          console.log(chalk.green('Plan:'), user.plan);
        }
      }
    });

  // Set API URL
  program
    .command('set-url')
    .description('Set API URL')
    .argument('[url]', 'API URL')
    .action(async (url: string | undefined) => {
      const config = new CLIConfig();
      await config.init();

      if (!url) {
        const answer = await inquirer.prompt<UrlPromptAnswer>([
          {
            type: 'input',
            name: 'url',
            message: 'API URL:',
            default: config.getApiUrl(),
            validate: (input: string) => {
              try {
                new URL(input);
                return true;
              } catch {
                return 'Please enter a valid URL';
              }
            }
          }
        ]);
        url = answer.url;
      }

      await config.setApiUrl(url);
      console.log(chalk.green('✓ API URL updated:'), url);
    });

  // Test connection
  program
    .command('test')
    .description('Test connection to API')
    .action(async () => {
      const config = new CLIConfig();
      await config.init();

      console.log(chalk.blue('🔌 Testing connection...'));
      console.log(chalk.gray(`API URL: ${config.getApiUrl()}`));
      console.log();

      try {
        const health = await apiClient.getHealth();
        
        console.log(chalk.green('✓ Connection successful'));
        console.log(`Status: ${health.status}`);
        console.log(`Version: ${health.version}`);
        console.log(`Uptime: ${Math.round(health.uptime)}s`);
        
        if (health.dependencies) {
          console.log();
          console.log(chalk.yellow('Dependencies:'));
          Object.entries(health.dependencies).forEach(([name, info]: [string, DependencyInfo]) => {
            const status = info.status === 'healthy' ? chalk.green('✓') : chalk.red('✖');
            const responseTime = info.response_time || info.latency_ms || 0;
            console.log(`  ${status} ${name}: ${info.status} (${responseTime}ms)`);
          });
        }
        
      } catch (error: unknown) {
        console.log(chalk.red('✖ Connection failed'));
        const errorCode = error && typeof error === 'object' && 'code' in error ? (error as Record<string, unknown>).code : null;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorCode === 'ECONNREFUSED') {
          console.error(chalk.red('Cannot connect to API server'));
          console.log(chalk.yellow('Make sure the API server is running'));
        } else {
          console.error(chalk.red('Error:'), errorMessage);
        }
        
        process.exit(1);
      }
    });

  // Reset configuration
  program
    .command('reset')
    .description('Reset all configuration')
    .option('-f, --force', 'skip confirmation')
    .action(async (options: ResetOptions) => {
      if (!options.force) {
        const answer = await inquirer.prompt<ResetConfirmAnswer>([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset all configuration? This will log you out.',
            default: false
          }
        ]);

        if (!answer.confirm) {
          console.log(chalk.yellow('Reset cancelled'));
          return;
        }
      }

      const config = new CLIConfig();
      await config.clear();
      
      console.log(chalk.green('✓ Configuration reset'));
      console.log(chalk.yellow('Run'), chalk.white('memory init'), chalk.yellow('to reconfigure'));
    });
}