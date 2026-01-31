import chalk from 'chalk';
import inquirer from 'inquirer';
import { dirname, join } from 'path';
import { CLIConfig } from '../utils/config.js';
import { createOnboardingFlow } from '../ux/index.js';

// Type definitions for command options
interface InitOptions {
  force?: boolean;
}

interface OverwriteAnswer {
  overwrite: boolean;
}

interface InitAnswers {
  apiUrl: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const config = new CLIConfig();
  await config.init();
  
  console.log(chalk.blue.bold('🚀 Initializing MaaS CLI'));
  console.log();

  // Check if config already exists
  const configExists = await config.exists();
  if (configExists && !options.force) {
    const answer = await inquirer.prompt<OverwriteAnswer>([
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

  const onboardingConfigPath = join(dirname(config.getConfigPath()), 'onboarding.json');
  const onboardingFlow = createOnboardingFlow(onboardingConfigPath);

  const setupResult = await onboardingFlow.runInitialSetup();
  if (!setupResult.completed && setupResult.issues && setupResult.issues.length > 0) {
    console.log(chalk.yellow('⚠️  Onboarding completed with issues:'));
    setupResult.issues.forEach((issue) => console.log(chalk.yellow(`  • ${issue}`)));
  }

  // Reload config after onboarding to preserve generated defaults
  await config.load();

  // Get configuration
  const answers = await inquirer.prompt<InitAnswers>([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL:',
      default: 'http://localhost:3000/api/v1',
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
