import * as vscode from 'vscode';
import { classifyError } from './extensionErrors';

/**
 * Error recovery utilities for robust network operations
 */

export interface RetryOptions {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors?: RegExp[];
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
        /network/i,
        /timeout/i,
        /ECONNREFUSED/i,
        /ENOTFOUND/i,
        /ETIMEDOUT/i,
        /rate limit/i,
        /429/,
        /503/,
        /504/
    ]
};

/**
 * Determines if an error is retryable based on error message patterns
 */
export function isRetryableError(error: unknown, options: RetryOptions = DEFAULT_RETRY_OPTIONS): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const retryablePatterns = options.retryableErrors || DEFAULT_RETRY_OPTIONS.retryableErrors || [];

    return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * Implements exponential backoff retry logic
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    outputChannel?: vscode.OutputChannel
): Promise<T> {
    const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt === opts.maxRetries) {
                // Final attempt failed
                break;
            }

            if (!isRetryableError(error, opts)) {
                // Error is not retryable
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
                opts.maxDelayMs
            );

            const message = `Operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}). Retrying in ${delay}ms...`;
            outputChannel?.appendLine(`[Retry] ${message}`);

            await sleep(delay);
        }
    }

    // All retries exhausted
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    outputChannel?.appendLine(`[Retry] All ${opts.maxRetries + 1} attempts failed. Last error: ${errorMessage}`);
    throw lastError;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps an async operation with progress indicator and retry logic
 */
export async function withProgressAndRetry<T>(
    title: string,
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    outputChannel?: vscode.OutputChannel
): Promise<T> {
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false
        },
        async () => {
            return withRetry(operation, options, outputChannel);
        }
    );
}

/**
 * Creates user-friendly error messages with recovery suggestions
 */
export function getUserFriendlyErrorMessage(error: unknown): { message: string; actions?: string[] } {
    const classified = classifyError(error);
    return {
        message: classified.message,
        actions: classified.actions
    };
}

/**
 * Shows error with actionable buttons
 */
export async function showErrorWithRecovery(
    error: unknown,
    outputChannel?: vscode.OutputChannel
): Promise<string | undefined> {
    const { message, actions } = getUserFriendlyErrorMessage(error);

    outputChannel?.appendLine(`[Error] ${message}`);
    if (error instanceof Error && error.stack) {
        outputChannel?.appendLine(`[Stack] ${error.stack}`);
    }

    if (actions && actions.length > 0) {
        return vscode.window.showErrorMessage(message, ...actions);
    }

    return vscode.window.showErrorMessage(message);
}
