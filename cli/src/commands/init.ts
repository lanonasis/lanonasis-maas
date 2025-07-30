import chalk from 'chalk';
import inquirer from 'inquirer';
import { CLIConfig } from '../utils/config.js';

export async function initCommand(options: any): Promise<void> {
  const config = new CLIConfig();
  
  console.log(chalk.blue.bold('🚀 Initializing MaaS CLI'));
  console.log();

  // Check if config already exists
  const configExists = await config.exists();
  if (configExists && !options.force) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration already exists. Overwrite?',
        default: false
      }
    ]);

    if (!answer.overwrite) {
      console.log(chalk.yellow('Initialization cancelled'));
      return;
    }
  }

  // Get configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL:',
      default: 'http://localhost:3000/api/v1',
      validate: (input) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    }
  ]);

  // Initialize config
  await config.init();
  await config.setApiUrl(answers.apiUrl);

  console.log();
  console.log(chalk.green('✓ CLI initialized successfully'));
  console.log(chalk.gray(`Configuration saved to: ${config.getConfigPath()}`));
  console.log();
  console.log(chalk.yellow('Next steps:'));
  console.log(chalk.white('  memory login    # Authenticate with your account'));
  console.log(chalk.white('  memory --help   # Show available commands'));
}