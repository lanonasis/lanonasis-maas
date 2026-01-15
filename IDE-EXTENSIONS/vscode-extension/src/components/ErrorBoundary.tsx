import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * This prevents the entire sidebar from going blank when a component
 * throws an error (e.g., from invalid data or failed operations).
 */
export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    // Try to report to extension host for debugging
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'error',
        data: `UI Error: ${error.message}`,
      });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    // Request a full refresh from the extension
    if (window.vscode) {
      window.vscode.postMessage({ type: 'getAuthState' });
      window.vscode.postMessage({ type: 'getMemories' });
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render() {
    if (this.state.hasError) {
      const { fallbackMessage = 'Something went wrong loading this section.' } = this.props;
      const errorMessage = this.state.error?.message || 'Unknown error';

      return (
        <div className="p-4 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--vscode-inputValidation-errorBackground)]">
            <AlertTriangle className="h-5 w-5 text-[var(--vscode-errorForeground)]" />
          </div>

          <div className="space-y-1">
            <h3 className="text-[13px] font-medium text-[var(--vscode-editor-foreground)]">
              {fallbackMessage}
            </h3>
            <p className="text-[11px] text-[var(--vscode-descriptionForeground)] max-w-[250px]">
              {errorMessage}
            </p>
          </div>

          <div className="flex gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] gap-1.5"
              onClick={this.handleRetry}
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] gap-1.5 text-[var(--vscode-textLink-foreground)]"
              onClick={this.handleReload}
            >
              Reload Data
            </Button>
          </div>

          {/* Show stack trace in development */}
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4 text-left w-full">
              <summary className="text-[10px] text-[var(--vscode-descriptionForeground)] cursor-pointer">
                Error Details
              </summary>
              <pre className="mt-2 p-2 text-[9px] bg-[var(--vscode-textCodeBlock-background)] rounded overflow-x-auto max-h-[150px] overflow-y-auto">
                {this.state.error?.stack}
                {'\n\nComponent Stack:'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
