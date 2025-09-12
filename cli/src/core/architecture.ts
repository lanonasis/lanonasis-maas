/**
 * Core Architecture for Enhanced CLI Experience
 * Implements the layered architecture for state management, interaction, and presentation
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';

// Types and Interfaces
export interface NavigationState {
  name: string;
  path: string;
  context: Record<string, any>;
  timestamp: Date;
}

export interface UserContext {
  userId?: string;
  email?: string;
  organization?: string;
  preferences: UserPreferences;
  sessionStarted: Date;
  lastAction?: string;
  history: string[];
}

export interface UserPreferences {
  theme: 'default' | 'dark' | 'light' | 'auto';
  outputFormat: 'table' | 'json' | 'yaml' | 'minimal';
  verbosity: 'quiet' | 'normal' | 'verbose';
  expertMode: boolean;
  shortcuts: boolean;
  animations: boolean;
  autoComplete: boolean;
  confirmDestructive: boolean;
}

export interface SessionMemory {
  recentCommands: string[];
  recentMemories: string[];
  searchHistory: string[];
  clipboardHistory: string[];
  undoStack: any[];
}

export interface CLIExperienceArchitecture {
  stateManager: StateManager;
  interactionEngine: InteractionEngine;
  presentationLayer: PresentationLayer;
}

// State Management Layer
export class StateManager extends EventEmitter {
  private navigationStack: NavigationState[] = [];
  private userContext: UserContext;
  private sessionMemory: SessionMemory;
  private preferences: UserPreferences;

  constructor() {
    super();
    this.userContext = this.initializeUserContext();
    this.sessionMemory = this.initializeSessionMemory();
    this.preferences = this.loadPreferences();
  }

  private initializeUserContext(): UserContext {
    return {
      preferences: this.loadPreferences(),
      sessionStarted: new Date(),
      history: []
    };
  }

  private initializeSessionMemory(): SessionMemory {
    return {
      recentCommands: [],
      recentMemories: [],
      searchHistory: [],
      clipboardHistory: [],
      undoStack: []
    };
  }

  private loadPreferences(): UserPreferences {
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
  pushNavigation(state: NavigationState): void {
    this.navigationStack.push(state);
    this.emit('navigation:push', state);
    this.renderBreadcrumb();
  }

  popNavigation(): NavigationState | undefined {
    if (this.navigationStack.length > 1) {
      const state = this.navigationStack.pop();
      this.emit('navigation:pop', state);
      this.renderBreadcrumb();
      return state;
    }
    return undefined;
  }

  getCurrentNavigation(): NavigationState | undefined {
    return this.navigationStack[this.navigationStack.length - 1];
  }

  private renderBreadcrumb(): void {
    if (this.navigationStack.length > 0) {
      const path = this.navigationStack.map(s => s.name).join(' > ');
      console.log(chalk.dim(path));
    }
  }

  // Context methods
  updateUserContext(updates: Partial<UserContext>): void {
    this.userContext = { ...this.userContext, ...updates };
    this.emit('context:update', this.userContext);
  }

  getUserContext(): UserContext {
    return this.userContext;
  }

  // Session memory methods
  addToHistory(command: string): void {
    this.sessionMemory.recentCommands.push(command);
    if (this.sessionMemory.recentCommands.length > 100) {
      this.sessionMemory.recentCommands.shift();
    }
    this.userContext.history.push(command);
  }

  getRecentCommands(limit: number = 10): string[] {
    return this.sessionMemory.recentCommands.slice(-limit);
  }

  // Preferences methods
  updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void {
    this.preferences[key] = value;
    this.savePreferences();
    this.emit('preferences:update', { key, value });
  }

  getPreferences(): UserPreferences {
    return this.preferences;
  }

  private savePreferences(): void {
    // Save to config file
    // Implementation would write to ~/.onasis/preferences.json
  }

  // Undo/Redo functionality
  pushToUndoStack(action: any): void {
    this.sessionMemory.undoStack.push(action);
    if (this.sessionMemory.undoStack.length > 50) {
      this.sessionMemory.undoStack.shift();
    }
  }

  popFromUndoStack(): any {
    return this.sessionMemory.undoStack.pop();
  }
}

// Interaction Engine
export class InteractionEngine {
  private stateManager: StateManager;
  private promptSystem: AdaptivePromptSystem;
  private validationEngine: ContextualValidator;
  private feedbackLoop: RealTimeFeedback;
  private helpSystem: InlineHelpProvider;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.promptSystem = new AdaptivePromptSystem(stateManager);
    this.validationEngine = new ContextualValidator();
    this.feedbackLoop = new RealTimeFeedback();
    this.helpSystem = new InlineHelpProvider(stateManager);
  }

  async prompt(config: PromptConfig): Promise<any> {
    return this.promptSystem.prompt(config);
  }

  validate(value: any, rules: ValidationRule[]): ValidationResult {
    return this.validationEngine.validate(value, rules);
  }

  showFeedback(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.feedbackLoop.show(message, type);
  }

  getContextualHelp(): string {
    return this.helpSystem.getHelp();
  }
}

// Adaptive Prompt System
export class AdaptivePromptSystem {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async prompt(config: PromptConfig): Promise<any> {
    const preferences = this.stateManager.getPreferences();
    
    // Adapt prompt based on user preferences and context
    if (preferences.expertMode) {
      return this.expertPrompt(config);
    } else {
      return this.guidedPrompt(config);
    }
  }

  private async expertPrompt(config: PromptConfig): Promise<any> {
    // Minimal, streamlined prompt for expert users
    // Implementation would use minimal UI elements
    return null;
  }

  private async guidedPrompt(config: PromptConfig): Promise<any> {
    // Rich, guided prompt with helpful hints
    // Implementation would use enhanced UI elements
    return null;
  }
}

// Contextual Validator
export class ContextualValidator {
  validate(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const rule of rules) {
      const result = rule.validate(value);
      if (!result.valid) {
        if (result.severity === 'error') {
          errors.push(result.message);
        } else if (result.severity === 'warning') {
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
  private readonly icons = {
    success: chalk.green('✓'),
    error: chalk.red('✖'),
    warning: chalk.yellow('⚠'),
    info: chalk.cyan('ℹ'),
    loading: chalk.blue('◐')
  };

  show(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const icon = this.icons[type];
    const colorFn = this.getColorFunction(type);
    console.log(`${icon} ${colorFn(message)}`);
  }

  private getColorFunction(type: string): (str: string) => string {
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
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  getHelp(): string {
    const currentState = this.stateManager.getCurrentNavigation();
    const context = this.stateManager.getUserContext();
    
    // Return contextual help based on current state
    return this.generateHelpText(currentState, context);
  }

  private generateHelpText(state: NavigationState | undefined, context: UserContext): string {
    if (!state) {
      return 'Type "help" for available commands';
    }

    // Generate context-specific help
    const helps: Record<string, string> = {
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
  private themeEngine: AdaptiveThemeEngine;
  private layoutManager: ResponsiveLayoutManager;
  private animationController: SubtleAnimationController;

  constructor() {
    this.themeEngine = new AdaptiveThemeEngine();
    this.layoutManager = new ResponsiveLayoutManager();
    this.animationController = new SubtleAnimationController();
  }

  applyTheme(theme: string): void {
    this.themeEngine.setTheme(theme);
  }

  renderLayout(content: any, layout: string): void {
    this.layoutManager.render(content, layout);
  }

  animate(element: any, animation: string): void {
    this.animationController.animate(element, animation);
  }
}

// Theme Engine
export class AdaptiveThemeEngine {
  private currentTheme: string = 'default';
  
  private themes = {
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

  setTheme(theme: string): void {
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
  render(content: any, layout: string): void {
    // Implement different layout strategies
    switch (layout) {
      case 'card':
        this.renderCard(content);
        break;
      case 'table':
        this.renderTable(content);
        break;
      case 'dashboard':
        this.renderDashboard(content);
        break;
      default:
        console.log(content);
    }
  }

  private renderCard(content: any): void {
    // Render content in card layout
    console.log('╭─────────────────────────────────────────╮');
    console.log(`│ ${content.title || ''}`.padEnd(42) + '│');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ ${content.body || ''}`.padEnd(42) + '│');
    console.log('╰─────────────────────────────────────────╯');
  }

  private renderTable(content: any): void {
    // Render content in table layout
    // Implementation here
  }

  private renderDashboard(content: any): void {
    // Render dashboard layout
    // Implementation here
  }
}

// Animation Controller
export class SubtleAnimationController {
  animate(element: any, animation: string): void {
    // Implement subtle animations for CLI
    // This would handle progress bars, spinners, etc.
  }
}

// Types for validation and prompts
export interface ValidationRule {
  validate(value: any): {
    valid: boolean;
    message: string;
    severity: 'error' | 'warning';
    suggestion?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface PromptConfig {
  type: 'text' | 'select' | 'multiselect' | 'confirm' | 'password';
  message: string;
  choices?: any[];
  default?: any;
  validate?: (value: any) => boolean | string;
  hint?: string;
}

// Factory to create the complete architecture
export function createCLIArchitecture(): CLIExperienceArchitecture {
  const stateManager = new StateManager();
  const interactionEngine = new InteractionEngine(stateManager);
  const presentationLayer = new PresentationLayer();

  return {
    stateManager,
    interactionEngine,
    presentationLayer
  };
}
