import { useState, useEffect, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachedMemories?: string[];
  codeSnippets?: Array<{
    language: string;
    code: string;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  referencedMemories: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface UseChatHistoryReturn {
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  addMessage: (role: 'user' | 'assistant', content: string, attachedMemories?: string[]) => void;
  clearHistory: () => void;
  startNewSession: () => void;
  loadSession: (sessionId: string) => void;
  saveCurrentSession: () => void;
  deleteSession: (sessionId: string) => void;
}

const STORAGE_KEY = 'lanonasis.chatSessions';
const MAX_SESSIONS = 50;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function useChatHistory(): UseChatHistoryReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Load sessions from VS Code state
  useEffect(() => {
    const loadSessions = () => {
      try {
        // Try to get from VS Code state
        if (window.vscode) {
          const state = window.vscode.getState();
          if (state && typeof state === 'object' && 'chatSessions' in state) {
            const savedSessions = (state as { chatSessions: ChatSession[] }).chatSessions;
            if (Array.isArray(savedSessions)) {
              // Restore dates
              const restored = savedSessions.map(s => ({
                ...s,
                createdAt: new Date(s.createdAt),
                updatedAt: new Date(s.updatedAt),
                messages: s.messages.map(m => ({
                  ...m,
                  timestamp: new Date(m.timestamp)
                }))
              }));
              setSessions(restored);
              
              // Load most recent session
              if (restored.length > 0) {
                const mostRecent = restored.sort((a, b) => 
                  b.updatedAt.getTime() - a.updatedAt.getTime()
                )[0];
                setCurrentSessionId(mostRecent.id);
                setMessages(mostRecent.messages);
              }
            }
          }
        }
      } catch (err) {
        console.error('[useChatHistory] Failed to load sessions:', err);
        setError('Failed to load chat history');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, []);

  // Save sessions to VS Code state
  const saveSessions = useCallback((sessionsToSave: ChatSession[]) => {
    try {
      if (window.vscode) {
        window.vscode.setState({ chatSessions: sessionsToSave });
      }
    } catch (err) {
      console.error('[useChatHistory] Failed to save sessions:', err);
    }
  }, []);

  // Save current session
  const saveCurrentSession = useCallback(() => {
    if (!currentSessionId || messages.length === 0) return;

    setSessions(prev => {
      const existingIndex = prev.findIndex(s => s.id === currentSessionId);
      const updatedSession: ChatSession = {
        id: currentSessionId,
        title: messages[0]?.content.substring(0, 50) || 'New Chat',
        messages,
        referencedMemories: [],
        createdAt: existingIndex >= 0 ? prev[existingIndex].createdAt : new Date(),
        updatedAt: new Date()
      };

      let newSessions: ChatSession[];
      if (existingIndex >= 0) {
        newSessions = [...prev];
        newSessions[existingIndex] = updatedSession;
      } else {
        newSessions = [updatedSession, ...prev].slice(0, MAX_SESSIONS);
      }

      saveSessions(newSessions);
      return newSessions;
    });
  }, [currentSessionId, messages, saveSessions]);

  // Auto-save setup
  useEffect(() => {
    if (messages.length > 0 && currentSessionId) {
      // Clear existing timer
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      
      // Set new auto-save timer
      autoSaveTimer.current = setTimeout(() => {
        saveCurrentSession();
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [messages, currentSessionId, saveCurrentSession]);

  // Add a message to current session
  const addMessage = useCallback((
    role: 'user' | 'assistant',
    content: string,
    attachedMemories?: string[]
  ) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      attachedMemories
    };

    // Start new session if none exists
    if (!currentSessionId) {
      const newSessionId = generateId();
      setCurrentSessionId(newSessionId);
    }

    setMessages(prev => [...prev, newMessage]);
    setError(null);
  }, [currentSessionId, generateId]);

  // Clear current session history
  const clearHistory = useCallback(() => {
    setMessages([]);
    // Keep session but clear messages
    if (currentSessionId) {
      setSessions(prev => {
        const updated = prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: [], updatedAt: new Date() }
            : s
        );
        saveSessions(updated);
        return updated;
      });
    }
  }, [currentSessionId, saveSessions]);

  // Start a new chat session
  const startNewSession = useCallback(() => {
    // Save current session first
    if (currentSessionId && messages.length > 0) {
      saveCurrentSession();
    }

    const newSessionId = generateId();
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setError(null);
  }, [currentSessionId, messages.length, saveCurrentSession, generateId]);

  // Load a specific session
  const loadSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      // Save current session first
      if (currentSessionId && messages.length > 0) {
        saveCurrentSession();
      }

      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setError(null);
    } else {
      setError('Session not found');
    }
  }, [sessions, currentSessionId, messages.length, saveCurrentSession]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      saveSessions(filtered);
      return filtered;
    });

    // If deleting current session, start fresh
    if (sessionId === currentSessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  }, [currentSessionId, saveSessions]);

  return {
    messages,
    sessions,
    currentSessionId,
    isLoading,
    error,
    addMessage,
    clearHistory,
    startNewSession,
    loadSession,
    saveCurrentSession,
    deleteSession
  };
}

