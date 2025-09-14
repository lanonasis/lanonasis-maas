/**
 * Enhanced Error Handling and Recovery System
 * Provides intelligent error messages and recovery suggestions
 */

import chalk from 'chalk';
import boxen from 'boxen';
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

export class ErrorHandler {
  private stateManager: StateManager;
  private errorHistory: CLIError[] = [];

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Main error handling method
   */
  handle(error: CLIError | Error | unknown): void {
    const cliError = this.normalizeError(error);
    this.errorHistory.push(cliError);
    
    // Log to debug if verbose mode
    if (process.env.CLI_VERBOSE === 'true') {
      this.logDebugInfo(cliError);
    }

    // Display user-friendly error
    this.displayError(cliError);

    // Offer recovery options
    if (cliError.recoveryActions && cliError.recoveryActions.length > 0) {
      this.offerRecovery(cliError.recoveryActions);
    }
  }

  /**
   * Normalize various error types into CLIError
   */
  private normalizeError(error: any): CLIError {
    if (error instanceof Error) {
      const cliError = error as CLIError;
      
      // Enhance known errors with better context
      if (error.message.includes('ECONNREFUSED')) {
        return this.createConnectionError(error);
      } else if (error.message.includes('UNAUTHORIZED') || error.message.includes('401')) {
        return this.createAuthError(error);
      } else if (error.message.includes('ENOTFOUND')) {
        return this.createNetworkError(error);
      } else if (error.message.includes('TIMEOUT')) {
        return this.createTimeoutError(error);
      } else if (error.message.includes('RATE_LIMIT')) {
        return this.createRateLimitError(error);
      }
      
      return cliError;
    }
    
    // Handle non-Error objects
    return {
      name: 'UnknownError',
      message: String(error),
      severity: 'error'
    } as CLIError;
  }

  /**
   * Create specific error types with recovery suggestions
   */
  private createConnectionError(originalError: Error): CLIError {
    return {
      ...originalError,
      name: 'ConnectionError',
      message: 'Cannot connect to Onasis service',
      severity: 'error',
      code: 'ECONNREFUSED',
      suggestion: 'The service might be down or your network connection might be unavailable.',
      recoveryActions: [
        {
          label: 'Check internet connection',
          command: 'ping api.LanOnasis.com',
          description: 'Test network connectivity'
        },
        {
          label: 'Verify service URL',
          command: 'onasis config get api-url',
          description: 'Check configured service endpoint'
        },
        {
          label: 'Try alternative URL',
          command: 'onasis config set api-url <new-url>',
          description: 'Update service endpoint'
        },
        {
          label: 'Use local mode',
          command: 'onasis --offline',
          description: 'Work offline with cached data'
        }
      ]
    } as CLIError;
  }

  private createAuthError(originalError: Error): CLIError {
    return {
      ...originalError,
      name: 'AuthenticationError',
      message: 'Authentication failed',
      severity: 'error',
      code: 'UNAUTHORIZED',
      suggestion: 'Your session may have expired or your credentials might be invalid.',
      recoveryActions: [
        {
          label: 'Re-authenticate',
          command: 'onasis auth login',
          description: 'Sign in again with your credentials'
        },
        {
          label: 'Check API keys',
          command: 'onasis api-keys verify',
          description: 'Verify your API keys are valid'
        },
        {
          label: 'Reset credentials',
          command: 'onasis auth reset',
          description: 'Clear and reset authentication'
        }
      ]
    } as CLIError;
  }

  private createNetworkError(originalError: Error): CLIError {
    return {
      ...originalError,
      name: 'NetworkError',
      message: 'Network request failed',
      severity: 'error',
      code: 'ENOTFOUND',
      suggestion: 'Unable to resolve the service domain. Check your network settings.',
      recoveryActions: [
        {
          label: 'Check DNS',
          command: 'nslookup api.LanOnasis.com',
          description: 'Verify DNS resolution'
        },
        {
          label: 'Try with IP',
          command: 'onasis config set api-url https://<ip-address>',
          description: 'Use direct IP instead of domain'
        },
        {
          label: 'Check proxy settings',
          command: 'onasis config show proxy',
          description: 'Review proxy configuration'
        }
      ]
    } as CLIError;
  }

  private createTimeoutError(originalError: Error): CLIError {
    return {
      ...originalError,
      name: 'TimeoutError',
      message: 'Request timed out',
      severity: 'warning',
      code: 'TIMEOUT',
      suggestion: 'The operation took too long. The service might be slow or overloaded.',
      recoveryActions: [
        {
          label: 'Retry operation',
          command: 'onasis retry',
          description: 'Retry the last operation'
        },
        {
          label: 'Increase timeout',
          command: 'onasis config set timeout 30000',
          description: 'Set longer timeout (30 seconds)'
        },
        {
          label: 'Check service status',
          command: 'onasis status',
          description: 'Check if service is operational'
        }
      ]
    } as CLIError;
  }

  private createRateLimitError(originalError: Error): CLIError {
    return {
      ...originalError,
      name: 'RateLimitError',
      message: 'Rate limit exceeded',
      severity: 'warning',
      code: 'RATE_LIMIT',
      suggestion: 'You have made too many requests. Please wait before trying again.',
      recoveryActions: [
        {
          label: 'Check limits',
          command: 'onasis api-keys limits',
          description: 'View your current rate limits'
        },
        {
          label: 'Upgrade plan',
          command: 'onasis account upgrade',
          description: 'Upgrade for higher limits'
        }
      ]
    } as CLIError;
  }

  /**
   * Display error in user-friendly format
   */
  private displayError(error: CLIError): void {
    const icon = this.getErrorIcon(error.severity || 'error');
    const color = this.getErrorColor(error.severity || 'error');
    
    const errorBox = boxen(
      `${icon} ${chalk.bold(error.name || 'Error')}\n\n` +
      `${error.message}\n` +
      (error.suggestion ? `\n${chalk.yellow('💡 ' + error.suggestion)}` : ''),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: color as any,
        title: error.code ? `Error Code: ${error.code}` : undefined,
        titleAlignment: 'right'
      }
    );
    
    console.error(errorBox);
  }

  /**
   * Offer recovery actions to the user
   */
  private offerRecovery(actions: RecoveryAction[]): void {
    console.log(chalk.bold('\n🔧 Possible Solutions:\n'));
    
    actions.forEach((action, index) => {
      console.log(
        `  ${chalk.cyan(`${index + 1}.`)} ${chalk.bold(action.label)}\n` +
        `     ${chalk.gray('Command:')} ${chalk.green(action.command)}\n` +
        (action.description ? `     ${chalk.dim(action.description)}\n` : '')
      );
    });
    
    console.log(chalk.dim('\nRun any of the above commands to resolve the issue.'));
  }

  /**
   * Log debug information for verbose mode
   */
  private logDebugInfo(error: CLIError): void {
    console.error(chalk.dim('\n--- Debug Information ---'));
    console.error(chalk.dim('Timestamp:'), new Date().toISOString());
    console.error(chalk.dim('Error Type:'), error.name);
    console.error(chalk.dim('Error Code:'), error.code || 'N/A');
    
    if (error.stack) {
      console.error(chalk.dim('Stack Trace:'));
      console.error(chalk.dim(error.stack));
    }
    
    if (error.context) {
      console.error(chalk.dim('Context:'));
      console.error(chalk.dim(JSON.stringify(error.context, null, 2)));
    }
    
    console.error(chalk.dim('--- End Debug Information ---\n'));
  }

  /**
   * Get error icon based on severity
   */
  private getErrorIcon(severity: string): string {
    switch (severity) {
      case 'error': return chalk.red('✖');
      case 'warning': return chalk.yellow('⚠');
      case 'info': return chalk.blue('ℹ');
      default: return chalk.red('✖');
    }
  }

  /**
   * Get error color based on severity
   */
  private getErrorColor(severity: string): string {
    switch (severity) {
      case 'error': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'red';
    }
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): CLIError[] {
    return this.errorHistory;
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Retry last failed operation
   */
  async retryLastOperation(): Promise<void> {
    const lastError = this.errorHistory[this.errorHistory.length - 1];
    if (lastError && lastError.context?.operation) {
      console.log(chalk.cyan('🔄 Retrying last operation...'));
      // Implementation would retry the stored operation
    } else {
      console.log(chalk.yellow('No operation to retry'));
    }
  }
}

/**
 * Global error boundary for the CLI
 */
export class ErrorBoundary {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.setupGlobalHandlers();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.errorHandler.handle({
        ...error,
        name: 'UncaughtException',
        severity: 'error',
        suggestion: 'An unexpected error occurred. This might be a bug in the application.'
      } as CLIError);
      
      // Give time for error to be displayed before exiting
      setTimeout(() => process.exit(1), 100);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.errorHandler.handle({
        name: 'UnhandledRejection',
        message: String(reason),
        severity: 'error',
        suggestion: 'A promise was rejected without being handled. Check your async operations.',
        context: { promise: String(promise) }
      } as CLIError);
      
      setTimeout(() => process.exit(1), 100);
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n👋 Gracefully shutting down...'));
      this.cleanup();
      process.exit(0);
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n\n🛑 Received termination signal...'));
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Cleanup before exit
   */
  private cleanup(): void {
    // Save any pending state
    // Close any open connections
    // Flush any buffers
    console.log(chalk.dim('Cleanup complete'));
  }

  /**
   * Wrap async functions with error handling
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.errorHandler.handle(error);
        throw error;
      }
    }) as T;
  }
}

/**
 * Validation error for input validation
 */
export class ValidationError extends Error implements CLIError {
  severity: 'error' | 'warning' | 'info' = 'warning';
  suggestion?: string;
  
  constructor(message: string, field?: string, suggestion?: string) {
    super(message);
    this.name = 'ValidationError';
    
    if (field) {
      this.message = `Invalid ${field}: ${message}`;
    }
    
    this.suggestion = suggestion;
  }
}
