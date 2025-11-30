/**
 * React Context Provider for Memory Client
 *
 * Provides a Memory Client instance to all child components via React Context
 */

import { createElement, createContext, useMemo, type ReactNode } from 'react';
import { createMemoryClient, type CoreMemoryClient, type CoreMemoryClientConfig } from '../core/client';

export const MemoryContext = createContext<CoreMemoryClient | null>(null);

export interface MemoryProviderProps {
  children: ReactNode;
  config?: CoreMemoryClientConfig;
  apiKey?: string;
  apiUrl?: string;
  client?: CoreMemoryClient;
}

/**
 * Memory Provider Component
 *
 * Wrap your app or component tree with this provider to enable Memory hooks
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <MemoryProvider apiKey={process.env.REACT_APP_LANONASIS_KEY}>
 *       <YourComponents />
 *     </MemoryProvider>
 *   );
 * }
 * ```
 */
export function MemoryProvider({
  children,
  config,
  apiKey,
  apiUrl = 'https://api.lanonasis.com',
  client: providedClient
}: MemoryProviderProps) {
  const client = useMemo(() => {
    if (providedClient) {
      return providedClient;
    }

    return createMemoryClient({
      apiUrl,
      apiKey,
      ...config
    });
  }, [providedClient, apiUrl, apiKey, config]);

  return createElement(MemoryContext.Provider, { value: client }, children);
}
