import chalk from 'chalk';
import { CommandContext } from '../config/types.js';

export class SystemCommands {
  async mode(args: string[], context: CommandContext) {
    const newMode = args[0];
    
    if (!newMode) {
      console.log(chalk.cyan(`Current mode: ${context.mode}`));
      return;
    }
    
    if (newMode !== 'remote' && newMode !== 'local') {
      console.log(chalk.yellow('Usage: mode <remote|local>'));
      return;
    }
    
    context.mode = newMode;
    console.log(chalk.green(`Switched to ${newMode} mode`));
  }
  
  async status(args: string[], context: CommandContext) {
    console.log(chalk.cyan('REPL Status'));
    console.log(chalk.gray('═'.repeat(40)));
    console.log(`Mode: ${chalk.white(context.mode)}`);
    console.log(`API: ${chalk.white(context.config.apiUrl)}`);
    console.log(`MCP: ${context.config.useMCP ? chalk.green('Enabled') : chalk.red('Disabled')}`);
    console.log(`Auth: ${context.config.authToken ? chalk.green('Configured') : chalk.yellow('Not configured')}`);
    if (context.lastResult) {
      console.log(chalk.gray(`Last result: ${typeof context.lastResult === 'object' ? 'Available' : context.lastResult}`));
    }
  }
  
  async help() {
    console.log(chalk.cyan('Available Commands:'));
    console.log(chalk.gray('═'.repeat(40)));
    console.log(chalk.yellow('Memory Operations:'));
    console.log('  create <title> <content>  - Create a memory');
    console.log('  search <query>           - Search memories');
    console.log('  list [limit]            - List recent memories');
    console.log('  get <id>                - Get a specific memory');
    console.log('  delete <id>             - Delete a memory');
    console.log('');
    console.log(chalk.yellow('System Commands:'));
    console.log('  mode <remote|local>     - Switch operation mode');
    console.log('  status                  - Show current status');
    console.log('  clear                   - Clear screen');
    console.log('  help                    - Show this help');
    console.log('  exit                    - Exit REPL');
  }
  
  async clear() {
    console.clear();
  }
}
