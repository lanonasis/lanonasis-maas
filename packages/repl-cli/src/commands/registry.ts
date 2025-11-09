import { CommandContext } from '../config/types.js';

export type CommandHandler = (args: string[], context: CommandContext) => Promise<void>;

export class CommandRegistry {
  private commands = new Map<string, CommandHandler>();
  private aliases = new Map<string, string>();
  
  register(name: string, handler: CommandHandler, aliases?: string[]) {
    this.commands.set(name, handler);
    if (aliases) {
      aliases.forEach(alias => this.aliases.set(alias, name));
    }
  }
  
  async execute(name: string, args: string[], context: CommandContext) {
    const actualName = this.aliases.get(name) || name;
    const handler = this.commands.get(actualName);
    
    if (!handler) {
      throw new Error(`Unknown command: ${name}. Type "help" for available commands.`);
    }
    
    await handler(args, context);
  }
  
  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }
  
  getAliases(): Map<string, string> {
    return new Map(this.aliases);
  }
}
