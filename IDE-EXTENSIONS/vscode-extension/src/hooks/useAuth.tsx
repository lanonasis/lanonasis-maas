import { useState, useEffect, useCallback } from 'react';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (mode?: 'oauth' | 'apikey') => void;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Send messages to VS Code extension
  const postMessage = (type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  };

  // Listen for authentication state updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'authState') {
        if (message.data && typeof message.data === 'object' && 'authenticated' in message.data) {
          setIsAuthenticated((message.data as { authenticated: boolean }).authenticated);
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request initial auth state
    postMessage('getAuthState');
    
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const login = useCallback((mode?: 'oauth' | 'apikey') => {
    setIsLoading(true);
    postMessage('authenticate', { mode });
  }, []);

  const logout = useCallback(() => {
    postMessage('logout');
  }, []);

  return { isAuthenticated, isLoading, login, logout };
}

