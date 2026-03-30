import readline from 'readline';
import chalk from 'chalk';
import { CommandContext, ReplConfig } from '../config/types.js';
import { CommandRegistry } from '../commands/registry.js';
import { MemoryCommands } from '../commands/memory-commands.js';
import { SystemCommands } from '../commands/system-commands.js';
import { NaturalLanguageOrchestrator } from './orchestrator.js';
import { pauseReadline, resumeReadline } from '../utils/spinner-utils.js';

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
  private closeHandled: boolean = false; // Track if close event was handled
  
  // Enhanced input handling (concierge features)
  private inputHistory: string[] = []; // Command history for this session
  private multilineBuffer: string = ''; // Buffer for multi-line input
  private isMultilineMode: boolean = false; // Track if we're in multiline mode

  private formatError(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  constructor(private config: ReplConfig) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('💭 '),
      historySize: this.config.maxHistorySize ?? 1000,
      completer: this.createCompleter.bind(this), // Enable tab completion
    });
    
    // Expose readline interface globally so orchestrator can pause/resume around spinners
    (global as any).rlInterface = this.rl;

    this.context = {
      mode: config.useMCP ? 'local' : 'remote',
      aliases: new Map(),
      config: this.config,
      readline: this.rl  // Pass readline for spinner coordination
    };

    this.registry = new CommandRegistry();
    this.memoryCommands = new MemoryCommands();
    this.systemCommands = new SystemCommands();
    this.orchestrator = new NaturalLanguageOrchestrator({
      apiUrl: config.apiUrl,
      authToken: config.authToken,
      openaiApiKey: config.openaiApiKey,
      model: config.openaiModel,
      aiRouterUrl: config.aiRouterUrl,
      aiRouterAuthToken: config.aiRouterAuthToken || config.authToken,
      aiRouterApiKey: config.aiRouterApiKey,
      l0: config.l0,
      userContext: config.userContext
    });

    this.registerCommands();
  }
  
  /**
   * Create a tab completer for readline
   * Provides completion for all registered commands and aliases
   */
  private createCompleter(line: string): [string[], string] {
    // Build completion list from registered commands and aliases
    const commands = this.registry.getCommands();
    const aliases = Array.from(this.registry.getAliases().keys());
    const allCommands = [...commands, ...aliases];
    
    const hits = allCommands.filter(c => c.startsWith(line.toLowerCase()));
    return [hits.length ? hits : allCommands, line];
  }
  
  /**
   * Check if input appears to be incomplete (multi-line)
   * Detects unclosed quotes, braces, brackets, and explicit continuations
   */
  private isIncompleteInput(input: string): boolean {
    const trimmed = input.trim();
    
    // Explicit continuation with backslash
    if (trimmed.endsWith('\\')) return true;

    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let inCodeBlock = false;
    let escaped = false;
    let openBraces = 0;
    let openBrackets = 0;
    let openParens = 0;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (!inSingleQuote && !inDoubleQuote && !inBacktick && input.startsWith('```', i)) {
        inCodeBlock = !inCodeBlock;
        i += 2;
        escaped = false;
        continue;
      }

      if (inCodeBlock) {
        continue;
      }

      if (escaped) {
        escaped = false;
        continue;
      }

      if ((inSingleQuote || inDoubleQuote || inBacktick) && char === '\\') {
        escaped = true;
        continue;
      }

      if (inSingleQuote) {
        if (char === '\'') {
          inSingleQuote = false;
        }
        continue;
      }

      if (inDoubleQuote) {
        if (char === '"') {
          inDoubleQuote = false;
        }
        continue;
      }

      if (inBacktick) {
        if (char === '`') {
          inBacktick = false;
        }
        continue;
      }

      if (char === '\'') {
        const prev = input[i - 1];
        const next = input[i + 1];
        const isApostrophe = Boolean(prev && next && /[A-Za-z0-9]/.test(prev) && /[A-Za-z0-9]/.test(next));
        if (!isApostrophe) {
          inSingleQuote = true;
        }
        continue;
      }

      if (char === '"') {
        inDoubleQuote = true;
        continue;
      }

      if (char === '`') {
        inBacktick = true;
        continue;
      }

      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
      if (char === '(') openParens++;
      if (char === ')') openParens--;
    }

    return inSingleQuote ||
      inDoubleQuote ||
      inBacktick ||
      inCodeBlock ||
      openBraces > 0 || openBrackets > 0 || openParens > 0;
  }

  private registerCommands() {
    // Memory commands
    this.registry.register('create', (args, ctx) => this.memoryCommands.create(args, ctx));
    this.registry.register('update', (args, ctx) => this.memoryCommands.update(args, ctx), ['edit']);
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
    
    // History command - show command history (concierge feature)
    this.registry.register('history', async (args) => {
      const searchTerm = args.join(' ').toLowerCase();
      const history = this.inputHistory;
      
      if (history.length === 0) {
        console.log(chalk.gray('No commands in history yet.'));
        return;
      }
      
      // Filter if search term provided, preserving original index
      const filtered = searchTerm
        ? history
            .map((cmd, originalIndex) => ({ cmd, originalIndex }))
            .filter(({ cmd, originalIndex }) =>
              cmd.toLowerCase().includes(searchTerm) ||
              (originalIndex + 1).toString().includes(searchTerm)
            )
        : history.map((cmd, originalIndex) => ({ cmd, originalIndex }));

      if (filtered.length === 0) {
        console.log(chalk.gray(`No commands matching "${searchTerm}" found.`));
        return;
      }

      console.log(chalk.cyan(`\n📜 Command History (${filtered.length} commands):\n`));

      // Show last 50 commands by default, or filtered results
      const toShow = searchTerm ? filtered : filtered.slice(-50);

      toShow.forEach(({ cmd, originalIndex }, idx) => {
        const displayIndex = searchTerm
          ? originalIndex + 1
          : filtered.length - toShow.length + idx + 1;
        const truncated = cmd.length > 70 ? cmd.substring(0, 67) + '...' : cmd;
        console.log(chalk.gray(`  ${displayIndex.toString().padStart(3)}  ${truncated}`));
      });
      
      if (!searchTerm && history.length > 50) {
        console.log(chalk.gray(`\n  ... and ${history.length - 50} more commands`));
        console.log(chalk.gray('  Use "history <search>" to filter\n'));
      } else {
        console.log('');
      }
    }, ['hist']);
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
    const l0Enabled = this.config.l0?.enabled !== false;
    console.log(chalk.gray(`LZero Orchestrator: ${l0Enabled ? chalk.green('ACTIVE') : chalk.yellow('OFF')}`));
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
    console.log(chalk.gray('   • History: Press ↑↓ arrows to navigate past commands'));
    console.log(chalk.gray('   • Complete: Press Tab for command completion'));
    console.log(chalk.gray('   • Multi-line: Leave quotes/braces open for continuation'));
    console.log(chalk.gray('   • Health: Run "lrepl health" to check AI endpoints'));
    console.log(chalk.gray('   • Type "help" for all commands\n'));

    this.safePrompt();

    // Wrap readline handler with proper error handling
    this.rl.on('line', (line) => {
      // Wrap async logic in IIFE with proper error handling
      (async () => {
        // Handle multi-line input mode
        if (this.isMultilineMode) {
          this.multilineBuffer += '\n' + line.replace(/\s*\\$/, '');
          
          // Check if input is now complete
          if (!this.isIncompleteInput(this.multilineBuffer)) {
            const completeInput = this.multilineBuffer.trim();
            this.isMultilineMode = false;
            this.multilineBuffer = '';
            this.rl.setPrompt(chalk.cyan('💭 '));
            
            // Process the complete multi-line input
            await this.processInput(completeInput);
          } else {
            // Continue multi-line mode
            this.rl.setPrompt(chalk.cyan('... '));
            this.rl.prompt();
          }
          return;
        }
        
        // Normal single-line processing
        const lineTrimmed = line.trim();
        if (!lineTrimmed) {
          if (this.running) this.safePrompt();
          return;
        }
        
        // Check if this is the start of a multi-line input
        if (this.isIncompleteInput(lineTrimmed)) {
          this.isMultilineMode = true;
          this.multilineBuffer = lineTrimmed.replace(/\s*\\$/, '');
          this.rl.setPrompt(chalk.cyan('... '));
          this.rl.prompt();
          return;
        }
        
        await this.processInput(lineTrimmed);
      })().catch((err) => {
        console.error(chalk.red('\n⚠️  Critical error in line handler:'), this.formatError(err));
        if (this.running) this.safePrompt();
      });
    });

    this.rl.on('close', () => {
      // Prevent double-handling of close event
      if (this.closeHandled) return;
      this.closeHandled = true;
      
      if (!this.running) {
        console.log(chalk.yellow('\n👋 Goodbye!'));
        process.exit(0);
      }
    });

    this.rl.on('error', (err) => {
      console.error(chalk.red('\n⚠️  Input error:'), err.message);
      if (this.running) {
        console.log(chalk.gray('Attempting to continue...\n'));
        this.safePrompt();
      }
    });

    // Handle Ctrl+C gracefully
    if (this.sigintHandler) {
      process.removeListener('SIGINT', this.sigintHandler);
    }
    this.sigintHandler = () => {
      // If in multiline mode, cancel it
      if (this.isMultilineMode) {
        console.log(chalk.yellow('\n\n✗ Multi-line input cancelled'));
        this.isMultilineMode = false;
        this.multilineBuffer = '';
        this.rl.setPrompt(chalk.cyan('💭 '));
        this.rl.prompt();
        return;
      }
      
      console.log(chalk.yellow('\n👋 Goodbye!'));
      this.stop();
    };
    process.on('SIGINT', this.sigintHandler);
  }

  private installGlobalErrorHandlers() {
    if (this.errorHandlersInstalled) return;

    process.on('uncaughtException', (error) => {
      console.error(chalk.red('\n⚠️  Uncaught exception:'), error.message);
      console.log(chalk.gray('The REPL recovered from an error. You can continue.\n'));
      if (this.running) this.safePrompt();
    });

    process.on('unhandledRejection', (reason) => {
      const message = this.formatError(reason);
      console.error(chalk.red('\n⚠️  Unhandled promise rejection:'), message);
      console.log(chalk.gray('The REPL recovered from an error. You can continue.\n'));
      if (this.running) this.safePrompt();
    });

    this.errorHandlersInstalled = true;
  }
  
  /**
   * Safely prompt the user, checking if the stream is still valid
   */
  private safePrompt(): void {
    if (this.running && this.rl.input && !(this.rl.input as any).destroyed) {
      try {
        this.rl.prompt();
      } catch (promptError) {
        // Silently fail - stream may be closing
      }
    }
  }
  
  /**
   * Process a single (or completed multi-line) input
   */
  private async processInput(input: string) {
    // Add to history (avoid duplicates)
    if (this.inputHistory.length === 0 || this.inputHistory[this.inputHistory.length - 1] !== input) {
      this.inputHistory.push(input);
      const maxHistorySize = this.config.maxHistorySize ?? 1000;
    if (this.inputHistory.length > maxHistorySize) {
        this.inputHistory = this.inputHistory.slice(-maxHistorySize);
      }
    }
    
    try {
      await this.handleCommand(input);
    } catch (error) {
      console.error(chalk.red('\n⚠️  Unexpected error:'), this.formatError(error));
      console.log(chalk.gray('The REPL is still running. Try again or type "help" for assistance.\n'));
    }
    
    if (this.running) {
      this.safePrompt();
    }
  }
  
  private async handleCommand(input: string) {
    if (!input) return;

    const [firstWord, ...args] = input.split(' ');
    const knownCommands = this.registry.getCommands();
    const aliases = this.registry.getAliases();

    const isCommand = knownCommands.includes(firstWord) || aliases.has(firstWord);

    try {
      if (this.nlMode && !isCommand) {
        await this.handleNaturalLanguage(input);
      } else {
        await this.routeCommand(firstWord, args);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), this.formatError(error));
    }
  }

  private async handleNaturalLanguage(input: string) {
    // CRITICAL FIX: Pause readline before processing to prevent spinner interference
    pauseReadline(this.rl);
    
    let response;
    try {
      response = await this.orchestrator.processNaturalLanguage(input);
    } catch (error) {
      console.error(chalk.red('\n⚠️  Could not process your request:'), this.formatError(error));
      console.log(chalk.cyan('\n💡 LZero: ') + chalk.white("I'm having trouble connecting to my brain right now. Let me try to help anyway..."));
      console.log(chalk.gray('\nYou can try:'));
      console.log(chalk.gray('  • Using direct commands: create, search, list, get, delete'));
      console.log(chalk.gray('  • Checking your network connection'));
      console.log(chalk.gray('  • Running "status" to check configuration\n'));
      return;
    } finally {
      // CRITICAL FIX: Always resume readline after processing
      resumeReadline(this.rl, false);
    }

    try {
      const mainAnswer = response.mainAnswer || response.response;
      if (mainAnswer) {
        console.log(chalk.white(`\n${mainAnswer}\n`));
      }

      if (response.action) {
        const result = await this.orchestrator.executeAction(response.action);

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
              if (result.enhanced) {
                const { mainResult, additionalResults } = result.enhanced;
                
                if (mainResult) {
                  console.log(chalk.cyan(`\n━━━ Primary Result ━━━`));
                  console.log(chalk.white(`Title: ${mainResult.title}`));
                  console.log(chalk.gray(`Content: ${mainResult.content.substring(0, 200)}${mainResult.content.length > 200 ? '...' : ''}`));
                  if (mainResult.similarity) {
                    console.log(chalk.green(`Relevance: ${(mainResult.similarity * 100).toFixed(1)}%\n`));
                  }
                }
                
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
          const errorText =
            typeof result.error === 'string'
              ? result.error
              : (result.error && typeof result.error.message === 'string')
                ? result.error.message
                : JSON.stringify(result.error);
          console.log(chalk.red(`Error: ${errorText}`));
        }
      }
      
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
      console.error(chalk.red('\n⚠️  Error executing action:'), this.formatError(error));
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
    try {
      await this.orchestrator.initializeContext();
    } catch (error) {
      // Silently fail
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
    console.log(chalk.gray('    create <title> <content>                - Create a memory'));
    console.log(chalk.gray('    update <id> [--content=...] [--type=...] - Update a memory'));
    console.log(chalk.gray('    search <query> [--type=<type>]          - Search memories'));
    console.log(chalk.gray('    list [limit]            - List recent memories'));
    console.log(chalk.gray('    get <id>                - Get a specific memory'));
    console.log(chalk.gray('    delete <id>             - Delete a memory'));

    console.log(chalk.white('\n  System Commands:'));
    console.log(chalk.gray('    nl [on|off]             - Toggle natural language mode'));
    console.log(chalk.gray('    reset                   - Clear conversation history'));
    console.log(chalk.gray('    mode <remote|local>     - Switch operation mode'));
    console.log(chalk.gray('    status                  - Show current status'));
    console.log(chalk.gray('    clear                   - Clear screen'));
    console.log(chalk.gray('    history [search]        - Show command history (with optional filter)'));
    console.log(chalk.gray('    help, ?, h              - Show this help'));
    console.log(chalk.gray('    exit, quit, q           - Exit REPL'));

    console.log(chalk.yellow('\n💡 Tips:'));
    console.log(chalk.gray('  • Natural language uses Onasis AI Router by default (OpenAI key optional)'));
    console.log(chalk.gray('  • Use "nl off" to disable NL mode and use commands only'));
    console.log(chalk.gray('  • Use "reset" to clear conversation context'));
    console.log(chalk.gray('  • Press ↑/↓ arrows to navigate command history'));
    console.log(chalk.gray('  • Press Tab for command completion'));
    console.log(chalk.gray('  • For multi-line input, leave quotes/brackets open'));
    console.log(chalk.cyan('\n━'.repeat(50) + '\n'));
  }
  
  stop() {
    this.running = false;
    this.closeHandled = true;
    this.rl.close();

    if (this.sigintHandler) {
      process.removeListener('SIGINT', this.sigintHandler);
      this.sigintHandler = undefined;
    }

    this.orchestrator.clearHistory();
  }
}
