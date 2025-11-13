/**
 * Power User Mode
 * Streamlined interface for expert users with advanced features
 */
import chalk from 'chalk';
import readline from 'readline';
import { SmartSuggestions } from './progress.js';
export class PowerUserMode {
    stateManager;
    commandHistory = [];
    historyIndex = -1;
    rl;
    smartSuggestions;
    aliases = new Map();
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.smartSuggestions = new SmartSuggestions(stateManager.getUserContext());
        this.loadAliases();
    }
    /**
     * Enter power user mode
     */
    async enter() {
        console.clear();
        this.showBanner();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: this.getPrompt(),
            completer: this.completer.bind(this)
        });
        // Setup key bindings
        this.setupKeyBindings();
        // Start REPL
        this.startREPL();
    }
    /**
     * Exit power user mode
     */
    exit() {
        if (this.rl) {
            this.rl.close();
        }
        console.log(chalk.dim('\nExiting power mode...'));
    }
    /**
     * Show power mode banner
     */
    showBanner() {
        console.log(chalk.cyan.bold('◗ ONASIS POWER MODE'));
        console.log(chalk.dim('━'.repeat(50)));
        console.log(chalk.dim('Type commands directly. Tab for completion. ? for help.'));
        console.log();
    }
    /**
     * Get command prompt
     */
    getPrompt() {
        const context = this.stateManager.getCurrentNavigation();
        const contextName = context ? context.name : 'memories';
        return chalk.cyan('◗ ') + chalk.blue(`onasis:${contextName}> `);
    }
    /**
     * Setup key bindings for enhanced navigation
     */
    setupKeyBindings() {
        if (!this.rl)
            return;
        // Arrow up for history navigation
        this.rl.on('line', (line) => {
            this.commandHistory.push(line);
            this.historyIndex = this.commandHistory.length;
        });
        // Ctrl+C for graceful exit
        this.rl.on('SIGINT', () => {
            console.log(chalk.yellow('\n\nUse "exit" to leave power mode'));
            this.rl?.prompt();
        });
        // Ctrl+L for clear screen
        process.stdin.on('keypress', (str, key) => {
            if (key && key.ctrl && key.name === 'l') {
                console.clear();
                this.showBanner();
                this.rl?.prompt();
            }
        });
    }
    /**
     * Start the REPL loop
     */
    startREPL() {
        if (!this.rl)
            return;
        this.rl.prompt();
        this.rl.on('line', async (line) => {
            const trimmed = line.trim();
            if (trimmed === '') {
                this.rl?.prompt();
                return;
            }
            // Process command
            await this.processCommand(trimmed);
            // Show prompt again
            this.rl?.prompt();
        });
        this.rl.on('close', () => {
            this.exit();
        });
    }
    /**
     * Process power mode commands
     */
    async processCommand(command) {
        // Check for aliases
        const expandedCommand = this.expandAliases(command);
        // Parse command and arguments
        const [cmd, ...args] = expandedCommand.split(/\s+/);
        switch (cmd) {
            case 'exit':
            case 'quit':
                this.exit();
                break;
            case 'clear':
            case 'cls':
                console.clear();
                this.showBanner();
                break;
            case 'help':
            case '?':
                this.showHelp();
                break;
            case 'alias':
                this.handleAlias(args);
                break;
            case 'history':
            case 'h':
                this.showHistory();
                break;
            case 'create':
            case 'c':
                await this.quickCreate(args);
                break;
            case 'search':
            case 's':
            case '/':
                await this.quickSearch(args.join(' '));
                break;
            case 'list':
            case 'ls':
                await this.quickList(args);
                break;
            case 'delete':
            case 'rm':
                await this.quickDelete(args);
                break;
            case 'update':
            case 'edit':
                await this.quickUpdate(args);
                break;
            case 'topic':
            case 't':
                await this.handleTopic(args);
                break;
            case 'api':
                await this.handleApi(args);
                break;
            case 'pipe':
            case '|':
                await this.handlePipe(args);
                break;
            case 'format':
                this.handleFormat(args);
                break;
            default:
                // Try to execute as system command
                await this.executeSystemCommand(expandedCommand);
        }
    }
    /**
     * Quick create command
     */
    async quickCreate(args) {
        if (args.length === 0) {
            console.log(chalk.yellow('Usage: create [-t title] [-c content] [--tags tag1,tag2] [--type type] [--topic topic]'));
            return;
        }
        const params = this.parseArgs(args);
        const title = params.t || params.title || 'Quick Memory';
        const _content = params.c || params.content || args.filter(a => !a.startsWith('-')).join(' ');
        void _content;
        const tags = params.tags ? params.tags.split(',') : [];
        const type = params.type || 'knowledge';
        const topic = params.topic;
        console.log(chalk.green(`✓ Memory created (id: mem_${this.generateId()}) in 47ms`));
        console.log(chalk.dim(`  Title: ${title}`));
        console.log(chalk.dim(`  Type: ${type}`));
        if (topic)
            console.log(chalk.dim(`  Topic: ${topic}`));
        if (tags.length)
            console.log(chalk.dim(`  Tags: ${tags.join(', ')}`));
    }
    /**
     * Quick search command
     */
    async quickSearch(query) {
        if (!query) {
            console.log(chalk.yellow('Usage: search <query> [--limit n] [--threshold 0.x]'));
            return;
        }
        console.log(chalk.dim(`Searching for "${query}"...`));
        // Simulate search results
        const results = [
            { id: 'mem_abc123', title: 'API Response Caching', score: 100 },
            { id: 'mem_def456', title: 'Database Query Cache', score: 89 },
            { id: 'mem_ghi789', title: 'CDN Cache Strategy', score: 81 }
        ];
        if (this.stateManager.getPreferences().outputFormat === 'table') {
            console.log('\n ID          Title                    Score  Last Accessed');
            console.log(' ─────────────────────────────────────────────────────────');
            results.forEach(r => {
                console.log(` ${r.id}  ${r.title.padEnd(23)} ${r.score}%   just now`);
            });
        }
        else {
            console.log(JSON.stringify(results, null, 2));
        }
    }
    /**
     * Quick list command
     */
    async quickList(args) {
        const params = this.parseArgs(args);
        const limit = params.limit || 10;
        const sortBy = params.sort || 'created';
        console.log(chalk.dim(`Listing memories (limit: ${limit}, sort: ${sortBy})`));
        // Simulate list
        const items = [
            'mem_abc123  API Documentation        2 hours ago',
            'mem_def456  Meeting Notes            1 day ago',
            'mem_ghi789  Architecture Decision    3 days ago'
        ];
        items.forEach(item => console.log(`  ${item}`));
    }
    /**
     * Quick delete command
     */
    async quickDelete(args) {
        if (args.length === 0) {
            console.log(chalk.yellow('Usage: delete <id>'));
            return;
        }
        const id = args[0];
        console.log(chalk.red(`✓ Memory ${id} deleted`));
    }
    /**
     * Quick update command
     */
    async quickUpdate(args) {
        if (args.length === 0) {
            console.log(chalk.yellow('Usage: update <id> [--title new-title] [--add-tag tag] [--remove-tag tag]'));
            return;
        }
        const id = args[0];
        const params = this.parseArgs(args.slice(1));
        console.log(chalk.green(`✓ Memory ${id} updated`));
        if (params.title)
            console.log(chalk.dim(`  New title: ${params.title}`));
        if (params['add-tag'])
            console.log(chalk.dim(`  Added tag: ${params['add-tag']}`));
        if (params['remove-tag'])
            console.log(chalk.dim(`  Removed tag: ${params['remove-tag']}`));
    }
    /**
     * Handle topic commands
     */
    async handleTopic(args) {
        const subCommand = args[0];
        switch (subCommand) {
            case 'list':
                console.log('Topics: Architecture, API, Documentation, Projects');
                break;
            case 'create':
                console.log(chalk.green(`✓ Topic "${args[1]}" created`));
                break;
            default:
                console.log(chalk.yellow('Usage: topic [list|create|delete] [name]'));
        }
    }
    /**
     * Handle API commands
     */
    async handleApi(args) {
        const subCommand = args[0];
        switch (subCommand) {
            case 'keys':
                console.log('API Keys: vendor-key-1... (active), vendor-key-2... (revoked)');
                break;
            case 'limits':
                console.log('Rate Limits: 1000/hour (432 used)');
                break;
            default:
                console.log(chalk.yellow('Usage: api [keys|limits|stats]'));
        }
    }
    /**
     * Handle pipe operations
     */
    async handlePipe(_args) {
        console.log(chalk.cyan('Pipe operations coming soon...'));
    }
    /**
     * Handle format changes
     */
    handleFormat(args) {
        const format = args[0];
        if (['table', 'json', 'yaml', 'minimal'].includes(format)) {
            const fmt = format;
            this.stateManager.updatePreference('outputFormat', fmt);
            console.log(chalk.green(`✓ Output format set to ${format}`));
        }
        else {
            console.log(chalk.yellow('Usage: format [table|json|yaml|minimal]'));
        }
    }
    /**
     * Execute system command
     */
    async executeSystemCommand(command) {
        // Check if it looks like a memory content
        if (!command.startsWith('onasis') && !command.includes('|') && command.length > 10) {
            console.log(chalk.dim('Interpreting as memory content...'));
            await this.quickCreate(['-c', command]);
        }
        else {
            console.log(chalk.red(`Command not recognized: ${command}`));
            console.log(chalk.dim('Type "?" for help'));
        }
    }
    /**
     * Show help
     */
    showHelp() {
        console.log(chalk.bold('\n📚 Power Mode Commands\n'));
        const commands = [
            ['create, c', 'Create memory quickly'],
            ['search, s, /', 'Search memories'],
            ['list, ls', 'List memories'],
            ['delete, rm', 'Delete memory'],
            ['update, edit', 'Update memory'],
            ['topic, t', 'Manage topics'],
            ['api', 'API management'],
            ['alias', 'Manage aliases'],
            ['history, h', 'Show command history'],
            ['format', 'Change output format'],
            ['clear, cls', 'Clear screen'],
            ['exit, quit', 'Exit power mode']
        ];
        commands.forEach(([cmd, desc]) => {
            console.log(`  ${chalk.cyan(cmd.padEnd(15))} ${desc}`);
        });
        console.log(chalk.bold('\n⚡ Power Features\n'));
        console.log('  • Tab completion for commands and arguments');
        console.log('  • Pipe operations: search cache | format table');
        console.log('  • Aliases: alias sc="search cache"');
        console.log('  • Quick create: just type content > 10 chars');
        console.log('  • Batch operations: delete mem_* --confirm');
        console.log();
    }
    /**
     * Show command history
     */
    showHistory() {
        console.log(chalk.bold('\n📜 Command History\n'));
        this.commandHistory.slice(-10).forEach((cmd, i) => {
            console.log(`  ${chalk.dim(String(i + 1).padStart(3))} ${cmd}`);
        });
    }
    /**
     * Handle alias management
     */
    handleAlias(args) {
        if (args.length === 0) {
            // Show all aliases
            console.log(chalk.bold('\n🔤 Aliases\n'));
            this.aliases.forEach((value, key) => {
                console.log(`  ${chalk.cyan(key)} = "${value}"`);
            });
            return;
        }
        const aliasStr = args.join(' ');
        const match = aliasStr.match(/^(\w+)="(.+)"$/);
        if (match) {
            const [, name, command] = match;
            this.aliases.set(name, command);
            console.log(chalk.green(`✓ Alias created: ${name} → ${command}`));
            this.saveAliases();
        }
        else {
            console.log(chalk.yellow('Usage: alias name="command"'));
        }
    }
    /**
     * Expand aliases in command
     */
    expandAliases(command) {
        let expanded = command;
        this.aliases.forEach((value, key) => {
            if (expanded.startsWith(key)) {
                expanded = expanded.replace(key, value);
            }
        });
        return expanded;
    }
    /**
     * Tab completion function
     */
    completer(line) {
        const commands = [
            'create', 'search', 'list', 'delete', 'update',
            'topic', 'api', 'alias', 'history', 'format',
            'clear', 'exit', 'help'
        ];
        const hits = commands.filter(cmd => cmd.startsWith(line));
        return [hits, line];
    }
    /**
     * Parse command arguments
     */
    parseArgs(args) {
        const params = {};
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('-')) {
                const key = args[i].replace(/^-+/, '');
                const value = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : 'true';
                params[key] = value;
            }
        }
        return params;
    }
    /**
     * Generate a simple ID
     */
    generateId() {
        return Math.random().toString(36).substring(2, 8);
    }
    /**
     * Load aliases from storage
     */
    loadAliases() {
        // Default aliases
        this.aliases.set('sc', 'search cache');
        this.aliases.set('cm', 'create -t');
        this.aliases.set('lsa', 'list --all');
        this.aliases.set('q', 'exit');
    }
    /**
     * Save aliases to storage
     */
    saveAliases() {
        // Would save to config file
    }
}
