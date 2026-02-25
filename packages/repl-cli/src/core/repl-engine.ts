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
  private sigintHandler?: () => void; // Track SIGINT handler for cleanup
  private errorHandlersInstalled: boolean = false; // Track global error handlers

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

    // Install global error handlers to prevent crashes (only once)
    this.installGlobalErrorHandlers();

    // Fetch user context if available
    await this.fetchUserContext();

    // Personalized welcome
    const welcomeMessage = this.buildWelcomeMessage();
    console.log(chalk.green(welcomeMessage));
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(chalk.gray(`Mode: ${this.context.mode} | API: ${this.config.apiUrl || 'https://api.lanonasis.com'}`));
    console.log(chalk.gray(`Natural Language: ${this.nlMode ? chalk.green('ON') : chalk.yellow('OFF')}`));
    // Show L0/LZero status (vendor details hidden from users)
    const l0Enabled = this.config.l0?.enabled !== false;
    console.log(chalk.gray(`LZero Orchestrator: ${l0Enabled ? chalk.green('ACTIVE') : chalk.yellow('OFF')}`));
    // Show user profile if available
    const userName = this.config.userProfile?.name || this.config.userContext?.name;
    const userEmail = this.config.userProfile?.email;
    if (userEmail) {
      console.log(chalk.gray(`User: ${userName || 'Unknown'} (${userEmail})`));
    }
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(chalk.white('\n💡 You can interact naturally or use commands:'));
    console.log(chalk.gray('   • Natural: "Remember that I prefer TypeScript"'));
    console.log(chalk.gray('   • Natural: "What do I know about my projects?"'));
    console.log(chalk.gray('   • Natural: "Please refine this prompt: ..."'));
    console.log(chalk.gray('   • Command: create <title> <content>'));
    console.log(chalk.gray('   • Type "help" for all commands\n'));

    this.rl.prompt();

    // Wrap readline handler with proper error handling to prevent crashes
    this.rl.on('line', async (line) => {
      try {
        await this.handleCommand(line.trim());
      } catch (error) {
        // Catch any unhandled errors and keep the REPL alive
        console.error(chalk.red('\n⚠️  Unexpected error:'), error instanceof Error && error.message ? error.message : String(error));
        console.log(chalk.gray('The REPL is still running. Try again or type "help" for assistance.\n'));
      }
      if (this.running) this.rl.prompt();
    });

    this.rl.on('close', () => {
      // Only exit if intentionally closed, not from errors
      if (this.running) {
        console.log(chalk.yellow('\n👋 Goodbye!'));
        process.exit(0);
      }
    });

    // Handle input errors gracefully (e.g., pipe closed)
    this.rl.on('error', (err) => {
      console.error(chalk.red('\n⚠️  Input error:'), err.message);
      if (this.running) {
        console.log(chalk.gray('Attempting to continue...\n'));
        this.rl.prompt();
      }
    });

    // Handle Ctrl+C gracefully - remove any existing handler first to prevent memory leaks
    if (this.sigintHandler) {
      process.removeListener('SIGINT', this.sigintHandler);
    }
    this.sigintHandler = () => {
      console.log(chalk.yellow('\n👋 Goodbye!'));
      this.stop();
      process.exit(0);
    };
    process.on('SIGINT', this.sigintHandler);
  }

  /**
   * Install global error handlers to prevent the REPL from crashing
   * on unhandled exceptions or promise rejections
   */
  private installGlobalErrorHandlers() {
    if (this.errorHandlersInstalled) return;

    // Handle uncaught exceptions without crashing
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('\n⚠️  Uncaught exception:'), error.message);
      console.log(chalk.gray('The REPL recovered from an error. You can continue.\n'));
      if (this.running) this.rl.prompt();
    });

    // Handle unhandled promise rejections without crashing
    process.on('unhandledRejection', (reason) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      console.error(chalk.red('\n⚠️  Unhandled promise rejection:'), message);
      console.log(chalk.gray('The REPL recovered from an error. You can continue.\n'));
      if (this.running) this.rl.prompt();
    });

    this.errorHandlersInstalled = true;
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
      console.error(chalk.red('Error:'), error instanceof Error && error.message ? error.message : String(error));
    }
  }

  private async handleNaturalLanguage(input: string) {
    let response;
    try {
      response = await this.orchestrator.processNaturalLanguage(input);
    } catch (error) {
      // If orchestrator fails completely, provide a helpful fallback
      console.error(chalk.red('\n⚠️  Could not process your request:'), error instanceof Error && error.message ? error.message : String(error));
      console.log(chalk.cyan('\n💡 LZero: ') + chalk.white("I'm having trouble connecting to my brain right now. Let me try to help anyway..."));
      console.log(chalk.gray('\nYou can try:'));
      console.log(chalk.gray('  • Using direct commands: create, search, list, get, delete'));
      console.log(chalk.gray('  • Checking your network connection'));
      console.log(chalk.gray('  • Running "status" to check configuration\n'));
      return;
    }

    try {
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
      // Catch action execution errors but keep REPL alive
      console.error(chalk.red('\n⚠️  Error executing action:'), error instanceof Error && error.message ? error.message : String(error));
      console.log(chalk.cyan('💡 LZero: ') + chalk.gray("Something went wrong, but I'm still here! Try rephrasing or use a direct command.\n"));
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
    // Initialize orchestrator context - this loads user preferences from memories
    // This makes the assistant context-aware, knowing the user's stored information
    try {
      await this.orchestrator.initializeContext();
    } catch (error) {
      // Silently fail - context loading is optional but enhances the experience
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

    // Clean up SIGINT handler to prevent memory leaks
    if (this.sigintHandler) {
      process.removeListener('SIGINT', this.sigintHandler);
      this.sigintHandler = undefined;
    }

    // Clear conversation history on stop (user is logging out/exiting)
    this.orchestrator.clearHistory();
  }
}
