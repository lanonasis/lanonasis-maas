import { useState, useCallback } from 'react';
import type { Memory } from '../shared/types';

interface UseMemoryContextReturn {
  attachedMemories: Memory[];
  attachMemory: (memory: Memory) => void;
  removeMemory: (memoryId: string) => void;
  clearAllMemories: () => void;
  isMemoryAttached: (memoryId: string) => boolean;
  getContextString: () => string;
}

const MAX_ATTACHED_MEMORIES = 10;

export function useMemoryContext(): UseMemoryContextReturn {
  const [attachedMemories, setAttachedMemories] = useState<Memory[]>([]);

  // Attach a memory to context
  const attachMemory = useCallback((memory: Memory) => {
    setAttachedMemories(prev => {
      // Check if already attached
      if (prev.some(m => m.id === memory.id)) {
        return prev;
      }
      // Enforce maximum
      const newMemories = [...prev, memory];
      if (newMemories.length > MAX_ATTACHED_MEMORIES) {
        newMemories.shift(); // Remove oldest
      }
      return newMemories;
    });
  }, []);

  // Remove a memory from context
  const removeMemory = useCallback((memoryId: string) => {
    setAttachedMemories(prev => prev.filter(m => m.id !== memoryId));
  }, []);

  // Clear all attached memories
  const clearAllMemories = useCallback(() => {
    setAttachedMemories([]);
  }, []);

  // Check if a memory is attached
  const isMemoryAttached = useCallback((memoryId: string) => {
    return attachedMemories.some(m => m.id === memoryId);
  }, [attachedMemories]);

  // Generate context string for AI prompts
  const getContextString = useCallback(() => {
    if (attachedMemories.length === 0) {
      return '';
    }

    const contextParts = attachedMemories.map((memory, index) => {
      return `[Memory ${index + 1}: "${memory.title}" (${memory.type})]
${memory.content}
---`;
    });

    return `## Attached Context (${attachedMemories.length} memories)

${contextParts.join('\n\n')}

Please consider the above context when responding.`;
  }, [attachedMemories]);

  return {
    attachedMemories,
    attachMemory,
    removeMemory,
    clearAllMemories,
    isMemoryAttached,
    getContextString,
  };
}

