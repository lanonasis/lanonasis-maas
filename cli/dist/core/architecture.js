/**
 * Core Architecture for Enhanced CLI Experience
 * Implements the layered architecture for state management, interaction, and presentation
 */
import { EventEmitter } from 'events';
import chalk from 'chalk';
// State Management Layer
export class StateManager extends EventEmitter {
    navigationStack = [];
    userContext;
    sessionMemory;
    preferences;
    constructor() {
        super();
        this.userContext = this.initializeUserContext();
        this.sessionMemory = this.initializeSessionMemory();
        this.preferences = this.loadPreferences();
    }
    initializeUserContext() {
        return {
            preferences: this.loadPreferences(),
            sessionStarted: new Date(),
            history: []
        };
    }
    initializeSessionMemory() {
        return {
            recentCommands: [],
            recentMemories: [],
            searchHistory: [],
            clipboardHistory: [],
            undoStack: []
        };
    }
    loadPreferences() {
        // Load from config file or use defaults
        return {
            theme: 'default',
            outputFormat: 'table',
            verbosity: 'normal',
            expertMode: false,
            shortcuts: true,
            animations: true,
            autoComplete: true,
            confirmDestructive: true
        };
    }
    // Navigation methods
    pushNavigation(state) {
        this.navigationStack.push(state);
        this.emit('navigation:push', state);
        this.renderBreadcrumb();
    }
    popNavigation() {
        if (this.navigationStack.length > 1) {
            const state = this.navigationStack.pop();
            this.emit('navigation:pop', state);
            this.renderBreadcrumb();
            return state;
        }
        return undefined;
    }
    getCurrentNavigation() {
        return this.navigationStack[this.navigationStack.length - 1];
    }
    renderBreadcrumb() {
        if (this.navigationStack.length > 0) {
            const path = this.navigationStack.map(s => s.name).join(' > ');
            console.log(chalk.dim(path));
        }
    }
    // Context methods
    updateUserContext(updates) {
        this.userContext = { ...this.userContext, ...updates };
        this.emit('context:update', this.userContext);
    }
    getUserContext() {
        return this.userContext;
    }
    // Session memory methods
    addToHistory(command) {
        this.sessionMemory.recentCommands.push(command);
        if (this.sessionMemory.recentCommands.length > 100) {
            this.sessionMemory.recentCommands.shift();
        }
        this.userContext.history.push(command);
    }
    getRecentCommands(limit = 10) {
        return this.sessionMemory.recentCommands.slice(-limit);
    }
    // Preferences methods
    updatePreference(key, value) {
        this.preferences[key] = value;
        this.savePreferences();
        this.emit('preferences:update', { key, value });
    }
    getPreferences() {
        return this.preferences;
    }
    savePreferences() {
        // Save to config file
        // Implementation would write to ~/.onasis/preferences.json
    }
    // Undo/Redo functionality
    pushToUndoStack(action) {
        this.sessionMemory.undoStack.push(action);
        if (this.sessionMemory.undoStack.length > 50) {
            this.sessionMemory.undoStack.shift();
        }
    }
    popFromUndoStack() {
        return this.sessionMemory.undoStack.pop();
    }
}
// Interaction Engine
export class InteractionEngine {
    stateManager;
    promptSystem;
    validationEngine;
    feedbackLoop;
    helpSystem;
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.promptSystem = new AdaptivePromptSystem(stateManager);
        this.validationEngine = new ContextualValidator();
        this.feedbackLoop = new RealTimeFeedback();
        this.helpSystem = new InlineHelpProvider(stateManager);
    }
    async prompt(config) {
        return this.promptSystem.prompt(config);
    }
    validate(value, rules) {
        return this.validationEngine.validate(value, rules);
    }
    showFeedback(message, type) {
        this.feedbackLoop.show(message, type);
    }
    getContextualHelp() {
        return this.helpSystem.getHelp();
    }
}
// Adaptive Prompt System
export class AdaptivePromptSystem {
    stateManager;
    constructor(stateManager) {
        this.stateManager = stateManager;
    }
    async prompt(config) {
        const preferences = this.stateManager.getPreferences();
        // Adapt prompt based on user preferences and context
        if (preferences.expertMode) {
            return this.expertPrompt(config);
        }
        else {
            return this.guidedPrompt(config);
        }
    }
    async expertPrompt(_config) {
        // Minimal, streamlined prompt for expert users
        // Implementation would use minimal UI elements
        return null;
    }
    async guidedPrompt(_config) {
        // Rich, guided prompt with helpful hints
        // Implementation would use enhanced UI elements
        return null;
    }
}
// Contextual Validator
export class ContextualValidator {
    validate(value, rules) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        for (const rule of rules) {
            const result = rule.validate(value);
            if (!result.valid) {
                if (result.severity === 'error') {
                    errors.push(result.message);
                }
                else if (result.severity === 'warning') {
                    warnings.push(result.message);
                }
                if (result.suggestion) {
                    suggestions.push(result.suggestion);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
}
// Real-time Feedback System
export class RealTimeFeedback {
    icons = {
        success: chalk.green('✓'),
        error: chalk.red('✖'),
        warning: chalk.yellow('⚠'),
        info: chalk.cyan('ℹ'),
        loading: chalk.blue('◐')
    };
    show(message, type) {
        const icon = this.icons[type];
        const colorFn = this.getColorFunction(type);
        console.log(`${icon} ${colorFn(message)}`);
    }
    getColorFunction(type) {
        switch (type) {
            case 'success': return chalk.green;
            case 'error': return chalk.red;
            case 'warning': return chalk.yellow;
            case 'info': return chalk.cyan;
            default: return chalk.white;
        }
    }
}
// Inline Help Provider
export class InlineHelpProvider {
    stateManager;
    constructor(stateManager) {
        this.stateManager = stateManager;
    }
    getHelp() {
        const currentState = this.stateManager.getCurrentNavigation();
        const context = this.stateManager.getUserContext();
        // Return contextual help based on current state
        return this.generateHelpText(currentState, context);
    }
    generateHelpText(state, _context) {
        if (!state) {
            return 'Type "help" for available commands';
        }
        // Generate context-specific help
        const helps = {
            'home': 'Main dashboard - choose an action or type a command',
            'memory:create': 'Creating a new memory - provide title and content',
            'memory:search': 'Search memories - use natural language or keywords',
            'settings': 'Configure your preferences and authentication'
        };
        return helps[state.name] || 'Type "?" for help, "←" to go back';
    }
}
// Presentation Layer
export class PresentationLayer {
    themeEngine;
    layoutManager;
    animationController;
    constructor() {
        this.themeEngine = new AdaptiveThemeEngine();
        this.layoutManager = new ResponsiveLayoutManager();
        this.animationController = new SubtleAnimationController();
    }
    applyTheme(theme) {
        this.themeEngine.setTheme(theme);
    }
    renderLayout(content, layout) {
        this.layoutManager.render(content, layout);
    }
    animate(_element, _animation) {
        this.animationController.animate(_element, _animation);
    }
}
// Theme Engine
export class AdaptiveThemeEngine {
    currentTheme = 'default';
    themes = {
        default: {
            primary: chalk.blue.bold,
            secondary: chalk.gray,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red,
            info: chalk.cyan,
            accent: chalk.magenta,
            muted: chalk.dim,
            highlight: chalk.white.bold
        },
        dark: {
            primary: chalk.cyanBright.bold,
            secondary: chalk.gray,
            success: chalk.greenBright,
            warning: chalk.yellowBright,
            error: chalk.redBright,
            info: chalk.blueBright,
            accent: chalk.magentaBright,
            muted: chalk.dim,
            highlight: chalk.whiteBright.bold
        }
    };
    setTheme(theme) {
        if (theme in this.themes) {
            this.currentTheme = theme;
        }
    }
    getColors() {
        return this.themes[this.currentTheme];
    }
}
// Layout Manager
export class ResponsiveLayoutManager {
    render(content, layout) {
        // Implement different layout strategies
        switch (layout) {
            case 'card':
                this.renderContent(content);
                break;
            case 'table':
                this.renderTitle(content);
                break;
            case 'dashboard':
                this.renderDashboard(content);
                break;
            default:
                console.log(content);
        }
    }
    renderContent(content) {
        // Render content in card layout
        console.log('╭─────────────────────────────────────────╮');
        console.log(`│ ${content.title || ''}`.padEnd(42) + '│');
        console.log('├─────────────────────────────────────────┤');
        console.log(`│ ${content.body || ''}`.padEnd(42) + '│');
        console.log('╰─────────────────────────────────────────╯');
    }
    renderTitle(_content) {
        // Render content in table layout
        // Implementation here
    }
    renderDashboard(_content) {
        // Render dashboard layout
        // Implementation here
    }
}
// Animation Controller
export class SubtleAnimationController {
    animate(_element, _animation) {
        // Implement subtle animations for CLI
        // This would handle progress bars, spinners, etc.
    }
}
// Factory to create the complete architecture
export function createCLIArchitecture() {
    const stateManager = new StateManager();
    const interactionEngine = new InteractionEngine(stateManager);
    const presentationLayer = new PresentationLayer();
    return {
        stateManager,
        interactionEngine,
        presentationLayer
    };
}
