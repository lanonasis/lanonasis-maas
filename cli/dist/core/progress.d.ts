/**
 * Progress Indicators and Feedback System
 * Provides real-time visual feedback for long-running operations
 */
export declare class ProgressIndicator {
    private spinner?;
    private progressBar?;
    private startTime?;
    /**
     * Show a spinner for indeterminate progress
     */
    startSpinner(message: string, options?: SpinnerOptions): void;
    /**
     * Update spinner text
     */
    updateSpinner(message: string): void;
    /**
     * Complete spinner with success
     */
    succeedSpinner(message?: string): void;
    /**
     * Complete spinner with failure
     */
    failSpinner(message?: string): void;
    /**
     * Complete spinner with warning
     */
    warnSpinner(message?: string): void;
    /**
     * Stop spinner without status
     */
    stopSpinner(): void;
    /**
     * Show a progress bar for determinate progress
     */
    startProgressBar(total: number, options?: ProgressBarOptions): void;
    /**
     * Update progress bar
     */
    updateProgressBar(current: number, payload?: any): void;
    /**
     * Increment progress bar
     */
    incrementProgressBar(amount?: number): void;
    /**
     * Complete progress bar
     */
    stopProgressBar(): void;
    /**
     * Execute operation with spinner
     */
    withSpinner<T>(operation: () => Promise<T>, message: string, options?: SpinnerOptions): Promise<T>;
    /**
     * Execute operation with progress tracking
     */
    withProgress<T>(operation: (progress: ProgressTracker) => Promise<T>, total: number, options?: ProgressBarOptions): Promise<T>;
    /**
     * Get elapsed time since start
     */
    private getElapsedTime;
}
/**
 * Multi-step progress indicator
 */
export declare class MultiStepProgress {
    private steps;
    private currentStep;
    private progressIndicator;
    constructor(steps: Step[]);
    /**
     * Start the multi-step process
     */
    start(): void;
    /**
     * Complete current step and move to next
     */
    nextStep(success?: boolean): void;
    /**
     * Complete all steps
     */
    complete(): void;
    /**
     * Render the multi-step progress
     */
    private render;
    /**
     * Render progress bar
     */
    private renderProgressBar;
    /**
     * Render step list
     */
    private renderStepList;
}
/**
 * Smart suggestions system
 */
export declare class SmartSuggestions {
    private userContext;
    private commandHistory;
    constructor(userContext: any);
    /**
     * Get suggestions based on current context
     */
    getSuggestions(input: string): Suggestion[];
    /**
     * Get command-based suggestions
     */
    private getCommandSuggestions;
    /**
     * Get natural language suggestions
     */
    private getNaturalLanguageSuggestions;
    /**
     * Get historical suggestions
     */
    private getHistoricalSuggestions;
    /**
     * Get contextual suggestions
     */
    private getContextualSuggestions;
    /**
     * Rank suggestions by relevance
     */
    private rankSuggestions;
    /**
     * Add command to history
     */
    addToHistory(command: string): void;
    /**
     * Display suggestions
     */
    displaySuggestions(suggestions: Suggestion[]): void;
}
export interface SpinnerOptions {
    spinner?: string;
    color?: string;
    prefix?: string;
    indent?: number;
}
export interface ProgressBarOptions {
    title?: string;
    format?: string;
    clearOnComplete?: boolean;
}
export interface ProgressTracker {
    update(current: number, payload?: any): void;
    increment(amount?: number): void;
}
export interface Step {
    name: string;
    description?: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
}
export interface Suggestion {
    text: string;
    description: string;
    type: 'command' | 'natural' | 'history' | 'contextual';
    score: number;
}
