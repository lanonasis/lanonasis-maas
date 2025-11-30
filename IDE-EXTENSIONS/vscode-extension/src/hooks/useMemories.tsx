import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PrototypeMemory } from '../bridges/PrototypeUIBridge';
import { prototypeMemoryToMemory } from '../shared/types';
import type { Memory } from '../shared/types';

interface UseMemoriesReturn {
  memories: Memory[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMemories: Memory[];
  isLoading: boolean;
}

export function useMemories(initialMemories: Memory[] = []): UseMemoriesReturn {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Send messages to VS Code extension
  const postMessage = useCallback((type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  }, []);

  // Listen for memory updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'memories') {
        if (Array.isArray(message.data)) {
          try {
            const protoMemories = message.data as PrototypeMemory[];
            const convertedMemories = protoMemories.map(prototypeMemoryToMemory);
            setMemories(convertedMemories);
            setIsLoading(false);
          } catch (error) {
            console.error('[useMemories] Failed to convert memories:', error);
            setMemories([]);
            setIsLoading(false);
          }
        }
      } else if (message.type === 'loading') {
        setIsLoading(typeof message.data === 'boolean' ? message.data : true);
      } else if (message.type === 'error') {
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request initial memories
    postMessage('getMemories');
    
    return () => window.removeEventListener('message', handleMessage);
  }, [postMessage]);

  // Trigger semantic search when query changes (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      // If query is empty, get all memories
      postMessage('getMemories');
      return;
    }

    // Debounce semantic search
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setIsLoading(true);
        postMessage('searchMemories', searchQuery.trim());
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, postMessage]);

  // Filter memories based on search query (client-side fallback for immediate feedback)
  const filteredMemories = useMemo(() => {
    // If we have a search query and memories, show them (they're already filtered by backend)
    // For immediate feedback, we can do client-side filtering too
    if (!searchQuery.trim()) {
      return memories;
    }
    
    // Backend search results are already filtered, but we can do additional client-side filtering
    return memories;
  }, [memories, searchQuery]);

  return {
    memories,
    searchQuery,
    setSearchQuery,
    filteredMemories,
    isLoading,
  };
}

