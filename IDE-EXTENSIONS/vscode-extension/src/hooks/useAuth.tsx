import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id?: string; name?: string; email?: string } | null;
  login: (mode?: 'oauth' | 'apikey') => void;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id?: string; name?: string; email?: string } | null>(null);
  const initialCheckDone = useRef(false);

  // Send messages to VS Code extension
  const postMessage = useCallback((type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  }, []);

  // Listen for authentication state updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'authState') {
        if (message.data && typeof message.data === 'object' && 'authenticated' in message.data) {
          const payload = message.data as { authenticated: boolean; user?: { id?: string; name?: string; email?: string } | null };
          setIsAuthenticated(payload.authenticated);
          setUser(payload.user ?? null);
          setIsLoading(false);
          initialCheckDone.current = true;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request initial auth state
    if (!initialCheckDone.current) {
      postMessage('getAuthState');
      
      // Timeout fallback - don't wait forever for auth state
      const timeoutId = setTimeout(() => {
        if (!initialCheckDone.current) {
          console.warn('[useAuth] Auth state timeout - assuming not authenticated');
          setIsAuthenticated(false);
          setIsLoading(false);
          initialCheckDone.current = true;
        }
      }, 10000); // 10 second timeout
      
      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeoutId);
      };
    }
    
    return () => window.removeEventListener('message', handleMessage);
  }, [postMessage]);

  const login = useCallback((mode?: 'oauth' | 'apikey') => {
    setIsLoading(true);
    postMessage('authenticate', { mode });
  }, [postMessage]);

  const logout = useCallback(() => {
    postMessage('logout');
  }, [postMessage]);

  return { isAuthenticated, isLoading, user, login, logout };
}

