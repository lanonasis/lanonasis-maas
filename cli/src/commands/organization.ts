import { Command } from 'commander';
import chalk from 'chalk';
import { CLIConfig } from '../utils/config.js';

export function orgCommands(program: Command): void {
  // Show organization info
  program
    .command('info')
    .description('Show organization information')
    .action(async () => {
      const config = new CLIConfig();
      await config.init();

      const user = await config.getCurrentUser();
      if (!user) {
        console.error(chalk.red('✖ Not authenticated'));
        process.exit(1);
      }

      console.log(chalk.blue.bold('🏢 Organization Information'));
      console.log();
      console.log(chalk.green('Organization ID:'), user.organization_id);
      console.log(chalk.green('Your Role:'), user.role);
      console.log(chalk.green('Plan:'), user.plan);
      console.log(chalk.green('Email:'), user.email);
      
      // In a full implementation, you'd fetch more org details from the API
      console.log();
      console.log(chalk.gray('Note: Use the web dashboard for full organization management'));
    });

  // Placeholder for future org management commands
  program
    .command('members')
    .description('List organization members (admin only)')
    .action(async () => {
      console.log(chalk.yellow('⚠️  This feature is not yet implemented'));
      console.log(chalk.gray('Use the web dashboard to manage organization members'));
    });

  program
    .command('usage')
    .description('Show organization usage statistics')
    .action(async () => {
      console.log(chalk.yellow('⚠️  This feature is not yet implemented'));
      console.log(chalk.gray('Use the web dashboard to view usage statistics'));
    });
}