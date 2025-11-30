import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

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
    root.render(<App />);
  }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReactApp);
} else {
  initReactApp();
}

export {};
