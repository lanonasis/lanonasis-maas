/**
 * Core Architecture for Enhanced CLI Experience
 * Implements the layered architecture for state management, interaction, and presentation
 */
import { EventEmitter } from 'events';
export interface NavigationState {
    name: string;
    path: string;
    preferences: Record<string, unknown>;
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
export declare class StateManager extends EventEmitter {
    private navigationStack;
    private userContext;
    private sessionMemory;
    private preferences;
    constructor();
    private initializeUserContext;
    private initializeSessionMemory;
    private loadPreferences;
    pushNavigation(state: NavigationState): void;
    popNavigation(): NavigationState | undefined;
    getCurrentNavigation(): NavigationState | undefined;
    private renderBreadcrumb;
    updateUserContext(updates: Partial<UserContext>): void;
    getUserContext(): UserContext;
    addToHistory(command: string): void;
    getRecentCommands(limit?: number): string[];
    updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void;
    getPreferences(): UserPreferences;
    private savePreferences;
    pushToUndoStack(action: any): void;
    popFromUndoStack(): any;
}
export declare class InteractionEngine {
    private stateManager;
    private promptSystem;
    private validationEngine;
    private feedbackLoop;
    private helpSystem;
    constructor(stateManager: StateManager);
    prompt(config: PromptConfig): Promise<any>;
    validate(value: any, rules: ValidationRule[]): ValidationResult;
    showFeedback(message: string, type: 'success' | 'error' | 'warning' | 'info'): void;
    getContextualHelp(): string;
}
export declare class AdaptivePromptSystem {
    private stateManager;
    constructor(stateManager: StateManager);
    prompt(config: PromptConfig): Promise<any>;
    private expertPrompt;
    private guidedPrompt;
}
export declare class ContextualValidator {
    validate(value: unknown, rules: ValidationRule[]): ValidationResult;
}
export declare class RealTimeFeedback {
    private readonly icons;
    show(message: string, type: 'success' | 'error' | 'warning' | 'info'): void;
    private getColorFunction;
}
export declare class InlineHelpProvider {
    private stateManager;
    constructor(stateManager: StateManager);
    getHelp(): string;
    private generateHelpText;
}
export declare class PresentationLayer {
    private themeEngine;
    private layoutManager;
    private animationController;
    constructor();
    applyTheme(theme: string): void;
    renderLayout(content: any, layout: string): void;
    private animate;
}
export declare class AdaptiveThemeEngine {
    private currentTheme;
    private themes;
    setTheme(theme: string): void;
    getColors(): any;
}
export declare class ResponsiveLayoutManager {
    render(content: unknown, layout: string): void;
    private renderContent;
    private renderTitle;
    private renderDashboard;
}
export declare class SubtleAnimationController {
    animate(_element: unknown, _animation: string): void;
}
export interface ValidationRule {
    validate(value: unknown): {
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
export declare function createCLIArchitecture(): CLIExperienceArchitecture;
