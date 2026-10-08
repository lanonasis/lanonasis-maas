import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PrototypeMemory } from '../bridges/PrototypeUIBridge';
import { prototypeMemoryToMemory } from '../shared/types';
import type { Memory } from '../shared/types';

interface UseMemoriesReturn {
  memories: Memory[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMemories: Memory[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMemories(initialMemories: Memory[] = []): UseMemoriesReturn {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // Send messages to VS Code extension
  const postMessage = useCallback((type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  }, []);

  // Refresh function for manual refresh
  const refresh = useCallback(() => {
    setError(null);
    setIsLoading(true);
    postMessage('getMemories');
  }, [postMessage]);

  // Listen for memory updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'memories') {
        // Always handle memories message - even if data is empty array
        if (Array.isArray(message.data)) {
          try {
            const protoMemories = message.data as PrototypeMemory[];
            const convertedMemories = protoMemories.map(prototypeMemoryToMemory);
            setMemories(convertedMemories);
            setError(null);
          } catch (err) {
            console.error('[useMemories] Failed to convert memories:', err);
            setMemories([]);
          }
        } else {
          // Data is not an array - set empty
          setMemories([]);
        }
        setIsLoading(false);
        initialLoadDone.current = true;
      } else if (message.type === 'loading') {
        setIsLoading(typeof message.data === 'boolean' ? message.data : true);
      } else if (message.type === 'error') {
        setError(typeof message.data === 'string' ? message.data : 'An error occurred');
        setIsLoading(false);
        initialLoadDone.current = true;
      } else if (message.type === 'memoryDeleted') {
        // Incremental delete (AC-R1): remove the entry by id without re-requesting.
        const id = message.data?.id;
        if (typeof id === 'string' && id.length > 0) {
          setMemories(prev => prev.filter(m => m.id !== id));
        }
      } else if (message.type === 'memoryUpdated') {
        // Incremental update (AC-R1): replace the matching entry by id via the
        // canonical prototype -> view-model converter. Do not re-request; do
        // not touch searchQuery (filteredMemories recomputes via the memo).
        const updated = message.data as PrototypeMemory | undefined;
        if (updated && typeof updated.id === 'string') {
          setMemories(prev =>
            prev.map(m => (m.id === updated.id ? prototypeMemoryToMemory(updated) : m))
          );
        }
      } else if (message.type === 'updateMemoryFailed') {
        // AC-R4: surface the failure message on the existing error channel
        // so an inline card error can read it. The card keeps its draft
        // locally; toasts come from the dedicated `error` channel / Toast
        // component, not from this hook.
        const msg = message.data?.message;
        if (typeof msg === 'string' && msg.length > 0) {
          setError(msg);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request initial memories only once
    if (!initialLoadDone.current) {
      postMessage('getMemories');
      
      // Set a timeout fallback in case no response comes
      const timeoutId = setTimeout(() => {
        if (!initialLoadDone.current) {
          console.warn('[useMemories] Initial load timeout - no response from extension');
          setIsLoading(false);
          setError('Failed to connect to memory service');
          initialLoadDone.current = true;
        }
      }, 15000); // 15 second timeout
      
      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeoutId);
      };
    }
    
    return () => window.removeEventListener('message', handleMessage);
  }, [postMessage]);

  // Trigger semantic search when query changes (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      // If query is empty, get all memories
      if (initialLoadDone.current) {
        postMessage('getMemories');
      }
      return;
    }

    // Debounce semantic search
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setIsLoading(true);
        setError(null);
        postMessage('searchMemories', searchQuery.trim());
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, postMessage]);

  // Filter memories based on search query (client-side fallback for immediate feedback)
  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) {
      return memories;
    }
    // Backend search results are already filtered
    return memories;
  }, [memories, searchQuery]);

  return {
    memories,
    searchQuery,
    setSearchQuery,
    filteredMemories,
    isLoading,
    error,
    refresh,
  };
}

