import readline from 'readline';
import chalk from 'chalk';
import { CommandContext, ReplConfig } from '../config/types.js';
import { CommandRegistry } from '../commands/registry.js';
import { MemoryCommands } from '../commands/memory-commands.js';
import { SystemCommands } from '../commands/system-commands.js';
import { NaturalLanguageOrchestrator } from './orchestrator.js';

export class ReplEngine {
  private rl: readline.Interface;
  private context: CommandContext;
  private running: boolean = false;
  private registry: CommandRegistry;
  private memoryCommands: MemoryCommands;
  private systemCommands: SystemCommands;
  private orchestrator: NaturalLanguageOrchestrator;
  private nlMode: boolean = true; // Natural language mode enabled by default

  constructor(private config: ReplConfig) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('💭 ')
    });

    this.context = {
      mode: config.useMCP ? 'local' : 'remote',
      aliases: new Map(),
      config: this.config
    };

    this.registry = new CommandRegistry();
    this.memoryCommands = new MemoryCommands();
    this.systemCommands = new SystemCommands();
    this.orchestrator = new NaturalLanguageOrchestrator({
      apiUrl: config.apiUrl,
      authToken: config.authToken,
      openaiApiKey: config.openaiApiKey,
      model: config.openaiModel,
      userContext: config.userContext
    });

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
    this.registry.register('help', () => this.showHelp(), ['?', 'h']);
    this.registry.register('clear', async () => await this.systemCommands.clear());
    this.registry.register('exit', async () => { this.stop(); }, ['quit', 'q']);

    // NL mode toggle
    this.registry.register('nl', async (args) => {
      if (args.length === 0) {
        console.log(chalk.cyan(`Natural Language mode: ${this.nlMode ? chalk.green('ON') : chalk.red('OFF')}`));
        return;
      }
      const toggle = args[0].toLowerCase();
      if (toggle === 'on' || toggle === 'true' || toggle === '1') {
        this.nlMode = true;
        console.log(chalk.green('✨ Natural Language mode enabled'));
        console.log(chalk.gray('You can now interact using natural language!'));
      } else if (toggle === 'off' || toggle === 'false' || toggle === '0') {
        this.nlMode = false;
        console.log(chalk.yellow('⚙️  Natural Language mode disabled'));
        console.log(chalk.gray('Switched to command-only mode'));
      } else {
        console.log(chalk.red(`Unknown option: ${toggle}`));
        console.log(chalk.gray('Usage: nl [on|off]'));
      }
    });

    // Clear conversation history
    this.registry.register('reset', async () => {
      this.orchestrator.clearHistory();
      console.log(chalk.green('✨ Conversation history cleared'));
    });
  }
  
  async start() {
    this.running = true;
    
    // Fetch user context if available
    await this.fetchUserContext();
    
    // Personalized welcome
    const welcomeMessage = this.buildWelcomeMessage();
    console.log(chalk.green(welcomeMessage));
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(chalk.gray(`Mode: ${this.context.mode} | API: ${this.config.apiUrl}`));
    console.log(chalk.gray(`Natural Language: ${this.nlMode ? chalk.green('ON') : chalk.yellow('OFF')}`));
    if (this.config.openaiModel) {
      console.log(chalk.gray(`AI Model: ${this.config.openaiModel}`));
    }
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(chalk.white('\n💡 You can interact naturally or use commands:'));
    console.log(chalk.gray('   • Natural: "Remember that I prefer TypeScript"'));
    console.log(chalk.gray('   • Natural: "What do I know about my projects?"'));
    console.log(chalk.gray('   • Natural: "Please refine this prompt: ..."'));
    console.log(chalk.gray('   • Command: create <title> <content>'));
    console.log(chalk.gray('   • Type "help" for all commands\n'));

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

    const [firstWord, ...args] = input.split(' ');
    const knownCommands = this.registry.getCommands();
    const aliases = this.registry.getAliases();

    // Check if this is a known command
    const isCommand = knownCommands.includes(firstWord) || aliases.has(firstWord);

    try {
      // If natural language mode is ON and input is not a known command, use orchestrator
      if (this.nlMode && !isCommand) {
        await this.handleNaturalLanguage(input);
      } else {
        // Use traditional command routing
        await this.routeCommand(firstWord, args);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  }

  private async handleNaturalLanguage(input: string) {
    try {
      const response = await this.orchestrator.processNaturalLanguage(input);

      // Display main answer first
      const mainAnswer = response.mainAnswer || response.response;
      if (mainAnswer) {
        console.log(chalk.white(`\n${mainAnswer}\n`));
      }

      // If there's an action, execute it
      if (response.action) {
        const result = await this.orchestrator.executeAction(response.action);

        // Display results based on action type
        if (result && !result.error) {
          switch (response.action.type) {
            case 'create': {
              if (result.data) {
                console.log(chalk.green(`✓ Memory created: ${result.data.id}`));
                this.context.lastResult = result.data;
              }
              break;
            }

            case 'search': {
              // Enhanced search results with main answer + additional context
              if (result.enhanced) {
                const { mainResult, additionalResults } = result.enhanced;
                
                // Main result (most relevant)
                if (mainResult) {
                  console.log(chalk.cyan(`\n━━━ Primary Result ━━━`));
                  console.log(chalk.white(`Title: ${mainResult.title}`));
                  console.log(chalk.gray(`Content: ${mainResult.content.substring(0, 200)}${mainResult.content.length > 200 ? '...' : ''}`));
                  if (mainResult.similarity) {
                    console.log(chalk.green(`Relevance: ${(mainResult.similarity * 100).toFixed(1)}%\n`));
                  }
                }
                
                // Additional context
                if (additionalResults && additionalResults.length > 0) {
                  console.log(chalk.cyan(`\n📚 Related Context:\n`));
                  additionalResults.forEach((r: any, i: number) => {
                    console.log(chalk.cyan(`[${i + 1}] ${r.title}`));
                    console.log(chalk.gray(`    ${r.content}${r.content.length > 200 ? '...' : ''}`));
                    if (r.relevance) {
                      console.log(chalk.gray(`    Relevance: ${r.relevance.toFixed(1)}%\n`));
                    }
                  });
                }
                
                this.context.lastResult = [mainResult, ...additionalResults];
              } else {
                // Fallback to original format
                const searchResults = result.data?.results || [];
                if (searchResults.length === 0) {
                  console.log(chalk.gray('No results found'));
                } else {
                  console.log(chalk.cyan(`Found ${searchResults.length} result(s):\n`));
                  searchResults.forEach((r: any, i: number) => {
                    console.log(chalk.cyan(`[${i + 1}] ${r.title}`));
                    console.log(chalk.gray(`    ${r.content.substring(0, 100)}...`));
                    if (r.similarity) {
                      console.log(chalk.gray(`    Relevance: ${(r.similarity * 100).toFixed(1)}%\n`));
                    }
                  });
                  this.context.lastResult = searchResults;
                }
              }
              break;
            }

            case 'list': {
              if (result.data && result.data.data && result.data.data.length > 0) {
                console.log(chalk.cyan(`\nShowing ${result.data.data.length} memories:\n`));
                result.data.data.forEach((r: any, i: number) => {
                  console.log(chalk.cyan(`[${i + 1}] ${r.title}`));
                  console.log(chalk.gray(`    ID: ${r.id} | Type: ${r.memory_type}`));
                  console.log(chalk.gray(`    ${r.content.substring(0, 80)}...\n`));
                });
                this.context.lastResult = result.data.data;
              } else {
                console.log(chalk.gray('No memories found'));
              }
              break;
            }

            case 'get': {
              if (result.data) {
                console.log(chalk.cyan(`\n━━━ ${result.data.title} ━━━`));
                console.log(chalk.gray(`ID: ${result.data.id}`));
                console.log(chalk.gray(`Type: ${result.data.memory_type}`));
                if (result.data.tags && result.data.tags.length > 0) {
                  console.log(chalk.gray(`Tags: ${result.data.tags.join(', ')}`));
                }
                console.log(chalk.white(`\n${result.data.content}\n`));
                this.context.lastResult = result.data;
              }
              break;
            }

            case 'delete': {
              console.log(chalk.green('✓ Memory deleted successfully'));
              break;
            }

            case 'optimize_prompt': {
              if (result.data) {
                console.log(chalk.cyan(`\n━━━ Optimized Prompt ━━━\n`));
                console.log(chalk.white(result.data.optimized_prompt));
                if (result.data.improvements && result.data.improvements.length > 0) {
                  console.log(chalk.cyan(`\n✨ Key Improvements:\n`));
                  result.data.improvements.forEach((imp: string, i: number) => {
                    console.log(chalk.gray(`  ${i + 1}. ${imp}`));
                  });
                }
                if (result.data.explanation) {
                  console.log(chalk.gray(`\n💡 ${result.data.explanation}\n`));
                }
                console.log(chalk.yellow('\n💾 Would you like to save this optimized prompt? (Use "create" command)'));
                this.context.lastResult = result.data;
              }
              break;
            }
          }
        } else if (result?.error) {
          console.log(chalk.red(`Error: ${result.error}`));
        }
      }
      
      // Display additional context if available
      if (response.additionalContext && response.additionalContext.length > 0) {
        console.log(chalk.cyan(`\n📚 Additional Information:\n`));
        response.additionalContext.forEach((ctx, i) => {
          console.log(chalk.cyan(`[${i + 1}] ${ctx.title}`));
          console.log(chalk.gray(`    ${ctx.content}`));
          if (ctx.relevance) {
            console.log(chalk.gray(`    Relevance: ${ctx.relevance.toFixed(1)}%\n`));
          }
        });
      }
    } catch (error) {
      console.error(chalk.red('Error processing request:'), error instanceof Error ? error.message : String(error));
    }
  }

  private buildWelcomeMessage(): string {
    const userName = this.config.userContext?.name;
    const projects = this.config.userContext?.projects;
    
    if (userName && projects && projects.length > 0) {
      return `🚀 Welcome back, ${userName}! What magic should we pull off today?\n   Which of your projects are we focusing on? (${projects.join(', ')})`;
    } else if (userName) {
      return `🚀 Welcome back, ${userName}! What magic should we pull off today?`;
    } else if (projects && projects.length > 0) {
      return `🚀 LanOnasis Interactive Memory Assistant\n   Which of your projects are we focusing on? (${projects.join(', ')})`;
    } else {
      return '🚀 LanOnasis Interactive Memory Assistant';
    }
  }

  private async fetchUserContext() {
    // Try to fetch user context from memory service
    // This is a placeholder - actual implementation would query the API
    // For now, we'll check if there's any user info in memories
    try {
      // Could implement: search for user profile memory, project memories, etc.
      // For now, we'll leave it as a hook for future implementation
      // The config can be populated from environment or config file
    } catch (error) {
      // Silently fail - user context is optional
    }
  }

  private async routeCommand(command: string, args: string[]) {
    await this.registry.execute(command, args, this.context);
  }

  private async showHelp() {
    console.log(chalk.cyan('\n🌟 LanOnasis REPL - Help\n'));
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(chalk.yellow('\n📝 Natural Language Mode (default):'));
    console.log(chalk.white('  Just type naturally!'));
    console.log(chalk.gray('  • "Remember that I prefer dark mode"'));
    console.log(chalk.gray('  • "What do I know about TypeScript?"'));
    console.log(chalk.gray('  • "Show me my recent memories"'));
    console.log(chalk.gray('  • "Find information about my projects"'));
    console.log(chalk.gray('  • "Please refine this prompt: ..."'));

    console.log(chalk.yellow('\n⚙️  Direct Commands:'));
    console.log(chalk.white('  Memory Operations:'));
    console.log(chalk.gray('    create <title> <content>  - Create a memory'));
    console.log(chalk.gray('    search <query>           - Search memories'));
    console.log(chalk.gray('    list [limit]            - List recent memories'));
    console.log(chalk.gray('    get <id>                - Get a specific memory'));
    console.log(chalk.gray('    delete <id>             - Delete a memory'));

    console.log(chalk.white('\n  System Commands:'));
    console.log(chalk.gray('    nl [on|off]             - Toggle natural language mode'));
    console.log(chalk.gray('    reset                   - Clear conversation history'));
    console.log(chalk.gray('    mode <remote|local>     - Switch operation mode'));
    console.log(chalk.gray('    status                  - Show current status'));
    console.log(chalk.gray('    clear                   - Clear screen'));
    console.log(chalk.gray('    help, ?, h              - Show this help'));
    console.log(chalk.gray('    exit, quit, q           - Exit REPL'));

    console.log(chalk.yellow('\n💡 Tips:'));
    console.log(chalk.gray('  • Natural language works best with OpenAI API key configured'));
    console.log(chalk.gray('  • Use "nl off" to disable NL mode and use commands only'));
    console.log(chalk.gray('  • Use "reset" to clear conversation context'));
    console.log(chalk.cyan('\n━'.repeat(50) + '\n'));
  }
  
  stop() {
    this.running = false;
    this.rl.close();
  }
}
