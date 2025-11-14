/**
 * Enhanced Error Handling and Recovery System
 * Provides intelligent error messages and recovery suggestions
 */
import { StateManager } from './architecture.js';
export interface CLIError extends Error {
    code?: string;
    severity?: 'error' | 'warning' | 'info';
    suggestion?: string;
    recoveryActions?: RecoveryAction[];
    context?: Record<string, any>;
}
export interface RecoveryAction {
    label: string;
    command: string;
    description?: string;
}
export declare class ErrorHandler {
    private stateManager;
    private errorHistory;
    constructor(stateManager: StateManager);
    /**
     * Main error handling method
     */
    handle(error: CLIError | Error | unknown): void;
    /**
     * Normalize various error types into CLIError
     */
    private normalizeError;
    /**
     * Create specific error types with recovery suggestions
     */
    private createConnectionError;
    private createAuthError;
    private createNetworkError;
    private createTimeoutError;
    private createRateLimitError;
    /**
     * Display error in user-friendly format
     */
    private displayError;
    /**
     * Offer recovery actions to the user
     */
    private offerRecovery;
    /**
     * Log debug information for verbose mode
     */
    private logDebugInfo;
    /**
     * Get error icon based on severity
     */
    private getErrorIcon;
    /**
     * Get error color based on severity
     */
    private getErrorColor;
    /**
     * Get error history for debugging
     */
    getErrorHistory(): CLIError[];
    /**
     * Clear error history
     */
    clearHistory(): void;
    /**
     * Retry last failed operation
     */
    retryLastOperation(): Promise<void>;
}
/**
 * Global error boundary for the CLI
 */
export declare class ErrorBoundary {
    private errorHandler;
    constructor(errorHandler: ErrorHandler);
    /**
     * Setup global error handlers
     */
    private setupGlobalHandlers;
    /**
     * Cleanup before exit
     */
    private cleanup;
    /**
     * Wrap async functions with error handling
     */
    wrapAsync<T extends (...args: any[]) => Promise<any>>(fn: T): T;
}
/**
 * Validation error for input validation
 */
export declare class ValidationError extends Error implements CLIError {
    severity: 'error' | 'warning' | 'info';
    suggestion?: string;
    constructor(message: string, field?: string, suggestion?: string);
}
