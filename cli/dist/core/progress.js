/**
 * Progress Indicators and Feedback System
 * Provides real-time visual feedback for long-running operations
 */
import ora from 'ora';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { performance } from 'perf_hooks';
export class ProgressIndicator {
    spinner;
    progressBar;
    startTime;
    /**
     * Show a spinner for indeterminate progress
     */
    startSpinner(message, options) {
        this.startTime = performance.now();
        this.spinner = ora({
            text: message,
            spinner: (options?.spinner || 'dots12'),
            color: (options?.color || 'cyan'),
            prefixText: options?.prefix,
            indent: options?.indent || 0
        }).start();
    }
    /**
     * Update spinner text
     */
    updateSpinner(message) {
        if (this.spinner) {
            this.spinner.text = message;
        }
    }
    /**
     * Complete spinner with success
     */
    succeedSpinner(message) {
        if (this.spinner) {
            const elapsed = this.getElapsedTime();
            const finalMessage = message || this.spinner.text;
            this.spinner.succeed(`${finalMessage} ${chalk.dim(`(${elapsed}ms)`)}`);
            this.spinner = undefined;
        }
    }
    /**
     * Complete spinner with failure
     */
    failSpinner(message) {
        if (this.spinner) {
            const elapsed = this.getElapsedTime();
            const finalMessage = message || this.spinner.text;
            this.spinner.fail(`${finalMessage} ${chalk.dim(`(${elapsed}ms)`)}`);
            this.spinner = undefined;
        }
    }
    /**
     * Complete spinner with warning
     */
    warnSpinner(message) {
        if (this.spinner) {
            const elapsed = this.getElapsedTime();
            const finalMessage = message || this.spinner.text;
            this.spinner.warn(`${finalMessage} ${chalk.dim(`(${elapsed}ms)`)}`);
            this.spinner = undefined;
        }
    }
    /**
     * Stop spinner without status
     */
    stopSpinner() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = undefined;
        }
    }
    /**
     * Show a progress bar for determinate progress
     */
    startProgressBar(total, options) {
        this.startTime = performance.now();
        const format = options?.format ||
            '{title} |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} | {duration}s | {eta}s remaining';
        this.progressBar = new cliProgress.SingleBar({
            format,
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true,
            clearOnComplete: options?.clearOnComplete || false,
            stopOnComplete: true
        }, cliProgress.Presets.shades_classic);
        this.progressBar.start(total, 0, {
            title: options?.title || 'Progress'
        });
    }
    /**
     * Update progress bar
     */
    updateProgressBar(current, payload) {
        if (this.progressBar) {
            this.progressBar.update(current, payload);
        }
    }
    /**
     * Increment progress bar
     */
    incrementProgressBar(amount = 1) {
        if (this.progressBar) {
            this.progressBar.increment(amount);
        }
    }
    /**
     * Complete progress bar
     */
    stopProgressBar() {
        if (this.progressBar) {
            this.progressBar.stop();
            this.progressBar = undefined;
        }
    }
    /**
     * Execute operation with spinner
     */
    async withSpinner(operation, message, options) {
        this.startSpinner(message, options);
        try {
            const result = await operation();
            this.succeedSpinner();
            return result;
        }
        catch (error) {
            this.failSpinner();
            throw error;
        }
    }
    /**
     * Execute operation with progress tracking
     */
    async withProgress(operation, total, options) {
        this.startProgressBar(total, options);
        const tracker = {
            update: (current, payload) => {
                this.updateProgressBar(current, payload);
            },
            increment: (amount) => {
                this.incrementProgressBar(amount);
            }
        };
        try {
            const result = await operation(tracker);
            this.stopProgressBar();
            return result;
        }
        catch (error) {
            this.stopProgressBar();
            throw error;
        }
    }
    /**
     * Get elapsed time since start
     */
    getElapsedTime() {
        if (!this.startTime)
            return '0';
        const elapsed = Math.round(performance.now() - this.startTime);
        return elapsed.toString();
    }
}
/**
 * Multi-step progress indicator
 */
export class MultiStepProgress {
    steps;
    currentStep = 0;
    progressIndicator;
    constructor(steps) {
        this.steps = steps;
        this.progressIndicator = new ProgressIndicator();
    }
    /**
     * Start the multi-step process
     */
    start() {
        this.render();
    }
    /**
     * Complete current step and move to next
     */
    nextStep(success = true) {
        if (this.currentStep < this.steps.length) {
            this.steps[this.currentStep].status = success ? 'completed' : 'failed';
            this.currentStep++;
            this.render();
        }
    }
    /**
     * Complete all steps
     */
    complete() {
        for (let i = this.currentStep; i < this.steps.length; i++) {
            this.steps[i].status = 'completed';
        }
        this.currentStep = this.steps.length;
        this.render();
    }
    /**
     * Render the multi-step progress
     */
    render() {
        console.clear();
        const progressBar = this.renderProgressBar();
        const stepList = this.renderStepList();
        console.log(chalk.bold('Progress\n'));
        console.log(progressBar);
        console.log();
        console.log(stepList);
        if (this.currentStep < this.steps.length) {
            console.log();
            console.log(chalk.cyan(`→ ${this.steps[this.currentStep].name}...`));
        }
    }
    /**
     * Render progress bar
     */
    renderProgressBar() {
        const completed = this.steps.filter(s => s.status === 'completed').length;
        const total = this.steps.length;
        const percentage = Math.round((completed / total) * 100);
        const barLength = 40;
        const filled = Math.round((completed / total) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        return `[${chalk.cyan(bar)}] ${percentage}%`;
    }
    /**
     * Render step list
     */
    renderStepList() {
        return this.steps.map((step, index) => {
            let icon;
            let color;
            switch (step.status) {
                case 'completed':
                    icon = chalk.green('✓');
                    color = chalk.green;
                    break;
                case 'failed':
                    icon = chalk.red('✗');
                    color = chalk.red;
                    break;
                case 'pending':
                    icon = chalk.gray('○');
                    color = chalk.gray;
                    break;
                case 'active':
                    icon = chalk.blue('●');
                    color = chalk.blue;
                    break;
                default:
                    icon = chalk.gray('○');
                    color = chalk.gray;
            }
            const stepNumber = `[${index + 1}]`;
            const name = color(step.name);
            const description = step.description ? chalk.dim(` - ${step.description}`) : '';
            return `${icon} ${stepNumber} ${name}${description}`;
        }).join('\n');
    }
}
/**
 * Smart suggestions system
 */
export class SmartSuggestions {
    userContext;
    commandHistory = [];
    constructor(userContext) {
        this.userContext = userContext;
    }
    /**
     * Get suggestions based on current context
     */
    getSuggestions(input) {
        const suggestions = [];
        // Command completion suggestions
        if (input.startsWith('onasis ')) {
            suggestions.push(...this.getCommandSuggestions(input));
        }
        // Natural language interpretation
        if (!input.startsWith('onasis')) {
            suggestions.push(...this.getNaturalLanguageSuggestions(input));
        }
        // Historical suggestions
        suggestions.push(...this.getHistoricalSuggestions(input));
        // Context-based suggestions
        suggestions.push(...this.getContextualSuggestions());
        return this.rankSuggestions(suggestions).slice(0, 5);
    }
    /**
     * Get command-based suggestions
     */
    getCommandSuggestions(input) {
        const commands = [
            { command: 'memory create', description: 'Create a new memory' },
            { command: 'memory search', description: 'Search memories' },
            { command: 'memory list', description: 'List all memories' },
            { command: 'topic create', description: 'Create a new topic' },
            { command: 'api-keys create', description: 'Create API key' },
            { command: 'auth login', description: 'Authenticate' },
            { command: 'config set', description: 'Update configuration' }
        ];
        const partial = input.replace('onasis ', '').toLowerCase();
        return commands
            .filter(cmd => cmd.command.startsWith(partial))
            .map(cmd => ({
            text: `onasis ${cmd.command}`,
            description: cmd.description,
            type: 'command',
            score: 0.8
        }));
    }
    /**
     * Get natural language suggestions
     */
    getNaturalLanguageSuggestions(input) {
        const suggestions = [];
        const lower = input.toLowerCase();
        if (lower.includes('remember') || lower.includes('save')) {
            suggestions.push({
                text: 'onasis memory create',
                description: 'Create a new memory from your input',
                type: 'natural',
                score: 0.9
            });
        }
        if (lower.includes('find') || lower.includes('search')) {
            suggestions.push({
                text: `onasis memory search "${input.replace(/find|search/gi, '').trim()}"`,
                description: 'Search for memories',
                type: 'natural',
                score: 0.9
            });
        }
        if (lower.includes('help') || lower.includes('how')) {
            suggestions.push({
                text: 'onasis help',
                description: 'Show help and documentation',
                type: 'natural',
                score: 0.85
            });
        }
        return suggestions;
    }
    /**
     * Get historical suggestions
     */
    getHistoricalSuggestions(input) {
        return this.commandHistory
            .filter(cmd => cmd.startsWith(input))
            .map(cmd => ({
            text: cmd,
            description: 'Previously used command',
            type: 'history',
            score: 0.7
        }));
    }
    /**
     * Get contextual suggestions
     */
    getContextualSuggestions() {
        const suggestions = [];
        const now = new Date();
        const hour = now.getHours();
        // Time-based suggestions
        if (hour >= 9 && hour <= 11) {
            suggestions.push({
                text: 'onasis memory create --type meeting',
                description: 'Create morning meeting notes',
                type: 'contextual',
                score: 0.6
            });
        }
        else if (hour >= 16 && hour <= 18) {
            suggestions.push({
                text: 'onasis memory list --today',
                description: "Review today's memories",
                type: 'contextual',
                score: 0.6
            });
        }
        // User behavior suggestions
        if (!this.userContext.hasCreatedMemoryToday) {
            suggestions.push({
                text: 'onasis memory create',
                description: "You haven't created a memory today",
                type: 'contextual',
                score: 0.75
            });
        }
        return suggestions;
    }
    /**
     * Rank suggestions by relevance
     */
    rankSuggestions(suggestions) {
        return suggestions.sort((a, b) => b.score - a.score);
    }
    /**
     * Add command to history
     */
    addToHistory(command) {
        this.commandHistory.unshift(command);
        if (this.commandHistory.length > 100) {
            this.commandHistory.pop();
        }
    }
    /**
     * Display suggestions
     */
    displaySuggestions(suggestions) {
        if (suggestions.length === 0)
            return;
        console.log(chalk.dim('\n💡 Suggestions:'));
        suggestions.forEach((suggestion, index) => {
            const number = chalk.cyan(`${index + 1}.`);
            const text = chalk.bold(suggestion.text);
            const desc = chalk.dim(suggestion.description);
            console.log(`  ${number} ${text} - ${desc}`);
        });
    }
}
