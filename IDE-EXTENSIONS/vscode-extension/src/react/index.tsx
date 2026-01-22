import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';

// Global VS Code API access
declare global {
  interface Window {
    vscode: {
      postMessage: (message: { type: string; data?: unknown }) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
  }
  
  // VS Code webview API function
  function acquireVsCodeApi(): {
    postMessage: (message: { type: string; data?: unknown }) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
  };
}

const App = lazy(() => import('./App'));

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.error);
      console.error('[React Error]', event.error);
      window.vscode?.postMessage({ type: 'reactError', error: event.error.message });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Reload UI
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

// Initialize React app when DOM is ready
const initReactApp = () => {
  // Ensure VS Code API is available
  if (typeof acquireVsCodeApi === 'function' && !window.vscode) {
    window.vscode = acquireVsCodeApi();
  }
  
  // Check if VS Code API is available
  if (!window.vscode) {
    console.error('[Lanonasis] VS Code API not available. Enhanced UI may not work correctly.');
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; color: var(--vscode-errorForeground);">
          <h3>Error: VS Code API not available</h3>
          <p>Please reload the extension to fix this issue.</p>
        </div>
      `;
    }
    return;
  }
  
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      </ErrorBoundary>
    );
  }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReactApp);
} else {
  initReactApp();
}

export {};
