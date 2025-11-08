import readline from 'readline';
import chalk from 'chalk';
import { CommandContext, ReplConfig } from '../config/types.js';
import { CommandRegistry } from '../commands/registry.js';
import { MemoryCommands } from '../commands/memory-commands.js';
import { SystemCommands } from '../commands/system-commands.js';

export class ReplEngine {
  private rl: readline.Interface;
  private context: CommandContext;
  private running: boolean = false;
  private registry: CommandRegistry;
  private memoryCommands: MemoryCommands;
  private systemCommands: SystemCommands;
  
  constructor(private config: ReplConfig) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('onasis> ')
    });
    
    this.context = {
      mode: config.useMCP ? 'local' : 'remote',
      aliases: new Map(),
      config: this.config
    };
    
    this.registry = new CommandRegistry();
    this.memoryCommands = new MemoryCommands();
    this.systemCommands = new SystemCommands();
    
    this.registerCommands();
  }
  
  private registerCommands() {
    // Memory commands
    this.registry.register('create', (args, ctx) => this.memoryCommands.create(args, ctx));
    this.registry.register('search', (args, ctx) => this.memoryCommands.search(args, ctx));
    this.registry.register('list', (args, ctx) => this.memoryCommands.list(args, ctx));
    this.registry.register('get', (args, ctx) => this.memoryCommands.get(args, ctx));
    this.registry.register('delete', (args, ctx) => this.memoryCommands.delete(args, ctx), ['del', 'rm']);
    
    // System commands
    this.registry.register('mode', (args, ctx) => this.systemCommands.mode(args, ctx));
    this.registry.register('status', (args, ctx) => this.systemCommands.status(args, ctx));
    this.registry.register('help', () => this.systemCommands.help(), ['?', 'h']);
    this.registry.register('clear', () => this.systemCommands.clear());
    this.registry.register('exit', () => this.stop(), ['quit', 'q']);
  }
  
  async start() {
    this.running = true;
    console.log(chalk.green('🚀 LanOnasis REPL v0.1.0'));
    console.log(chalk.gray(`Mode: ${this.context.mode} | API: ${this.config.apiUrl}`));
    console.log(chalk.gray('Type "help" for commands, "exit" to quit\n'));
    
    this.rl.prompt();
    
    this.rl.on('line', async (line) => {
      await this.handleCommand(line.trim());
      if (this.running) this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log(chalk.yellow('\n👋 Goodbye!'));
      process.exit(0);
    });
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n👋 Goodbye!'));
      this.stop();
      process.exit(0);
    });
  }
  
  private async handleCommand(input: string) {
    if (!input) return;
    
    const [command, ...args] = input.split(' ');
    
    try {
      await this.routeCommand(command, args);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  }
  
  private async routeCommand(command: string, args: string[]) {
    await this.registry.execute(command, args, this.context);
  }
  
  stop() {
    this.running = false;
    this.rl.close();
  }
}
