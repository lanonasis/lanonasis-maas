import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Settings,
  ChevronRight,
  MoreHorizontal,
  LogOut,
  User,
  Key,
  AlertCircle,
  Lightbulb,
  Sparkles,
  X,
  Paperclip,
  Clipboard,
  Trash2,
  Bookmark,
  SlidersHorizontal,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Button from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '../utils/cn';
import { useAuth } from '../hooks/useAuth';
import { useMemories } from '../hooks/useMemories';
import { useOnboarding } from '../hooks/useOnboarding';
import { MemoryCard } from './MemoryCard';
import { SearchBar } from './SearchBar';
import { ChatInterface } from './ChatInterface';
import { ApiKeyManager } from './ApiKeyManager';
import { WelcomeView } from './WelcomeView';
import { OnboardingPanel } from './OnboardingPanel';
import { GuidedTourOverlay, type GuidedTourStep } from './GuidedTourOverlay';
import { VirtualSectionList, type VirtualItem } from './VirtualSectionList';
import type { Memory, MemoryStatus, MemoryUpdateInput } from '../shared/types';

// Chat message type for history
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachedMemories?: Array<{ id: string; title: string }>;
}

interface ConnectionStatusPayload {
  authenticated: boolean;
  connectionMode: 'cli' | 'http';
  cacheStatus: {
    lastSyncAt: number | null;
    isRefreshing: boolean;
    count: number;
  } | null;
  offline?: boolean;
  queueStatus?: {
    pending: number;
    syncing: boolean;
    lastError?: string;
    lastSyncAt?: number;
  } | null;
}

interface SidebarPreferences {
  typeOrder: string[];
  hiddenTypes: string[];
  theme: string;
}

// Custom hook for chat history persistence
function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem('lanonasis-chat-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lanonasis-chat-history', JSON.stringify(messages.slice(-50))); // Keep last 50 messages
    } catch (e) {
      console.error('[ChatHistory] Failed to persist:', e);
    }
  }, [messages]);

  const addMessage = useCallback(
    (
      role: 'user' | 'assistant',
      content: string,
      attachedMemories?: Array<{ id: string; title: string }>,
    ) => {
      const newMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        timestamp: Date.now(),
        attachedMemories,
      };
      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('lanonasis-chat-history');
  }, []);

  return { messages, addMessage, clearHistory };
}

// Custom hook for memory context
function useMemoryContext() {
  const [attachedMemories, setAttachedMemories] = useState<Memory[]>([]);

  const attachMemory = useCallback((memory: Memory) => {
    setAttachedMemories((prev) => {
      if (prev.some((m) => m.id === memory.id)) return prev;
      return [...prev, memory];
    });
  }, []);

  const removeMemory = useCallback((memoryId: string) => {
    setAttachedMemories((prev) => prev.filter((m) => m.id !== memoryId));
  }, []);

  const clearContext = useCallback(() => {
    setAttachedMemories([]);
  }, []);

  return { attachedMemories, attachMemory, removeMemory, clearContext };
}

const getInitials = (value?: string | null) => {
  if (!value) return 'U';
  const trimmed = value.trim();
  if (!trimmed) return 'U';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const token = parts[0];
    const handle = token.includes('@') ? token.split('@')[0] : token;
    return handle.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const IDEPanel = () => {
  const { isAuthenticated, isLoading: authLoading, user, login, logout } = useAuth();
  const {
    status: onboardingStatus,
    isLoading: onboardingLoading,
    completeStep,
    skipOnboarding,
    resetOnboarding,
  } = useOnboarding();
  const {
    memories,
    searchQuery,
    setSearchQuery,
    filteredMemories,
    isLoading: memoriesLoading,
    error,
    refresh,
  } = useMemories();
  const {
    messages: chatHistory,
    addMessage: addChatMessage,
    clearHistory: clearChatHistory,
  } = useChatHistory();
  const { attachedMemories, attachMemory, removeMemory, clearContext } = useMemoryContext();

  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(true);
  const [clipboardContent, setClipboardContent] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemoryStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lanonasis-recent-searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [savedSearches, setSavedSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lanonasis-saved-searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusPayload | null>(null);
  const [sidebarPreferences, setSidebarPreferences] = useState<SidebarPreferences>({
    typeOrder: [],
    hiddenTypes: [],
    theme: 'default',
  });
  const [showCustomize, setShowCustomize] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<Memory | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const userDisplayName = user?.name || user?.email || null;
  const userSubLabel = user?.name && user?.email ? user.email : null;
  const showOnboarding = Boolean(onboardingStatus?.shouldShow);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  // Send messages to VS Code extension
  const postMessage = useCallback((type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('lanonasis-recent-searches', JSON.stringify(recentSearches));
    } catch {
      // ignore storage errors
    }
  }, [recentSearches]);

  useEffect(() => {
    try {
      localStorage.setItem('lanonasis-saved-searches', JSON.stringify(savedSearches));
    } catch {
      // ignore storage errors
    }
  }, [savedSearches]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    postMessage('getSidebarPreferences');
    postMessage('getConnectionStatus');
  }, [postMessage]);

  // Handle chat queries with attached context
  const handleChatSend = useCallback(
    (query: string) => {
      if (!query.trim() || !isAuthenticated) return;

      // Add user message to history with attached memories
      const attachedRefs = attachedMemories.map((m) => ({ id: m.id, title: m.title }));
      addChatMessage('user', query, attachedRefs.length > 0 ? attachedRefs : undefined);

      setIsChatLoading(true);

      // Send to extension with attached memory content as context
      postMessage('chatQuery', {
        query,
        attachedMemories: attachedMemories.map((m) => ({
          id: m.id,
          title: m.title,
          content: m.content,
        })),
      });

      setChatInput('');
      clearContext(); // Clear attached memories after sending
    },
    [isAuthenticated, attachedMemories, addChatMessage, postMessage, clearContext],
  );

  // Handle pasting from clipboard to create memory
  const handlePasteToMemory = useCallback(() => {
    postMessage('pasteFromClipboard');
  }, [postMessage]);

  // Handle quick capture
  const handleQuickCapture = useCallback(() => {
    postMessage('executeCommand', 'lanonasis.quickCapture');
  }, [postMessage]);

  const handleCreateSampleMemory = useCallback(() => {
    postMessage('executeCommand', 'lanonasis.createSampleMemory');
  }, [postMessage]);

  const handleSearchCommand = useCallback(() => {
    postMessage('executeCommand', 'lanonasis.searchMemory');
  }, [postMessage]);

  const startGuidedTour = useCallback(() => {
    setTourOpen(true);
  }, []);

  const updateSidebarPrefs = useCallback((next: SidebarPreferences) => {
    setSidebarPreferences(next);
    postMessage('updateSidebarPreferences', next);
  }, [postMessage]);

  const updateRecentSearches = useCallback((query: string) => {
    setRecentSearches((prev) => {
      const normalized = query.trim();
      if (!normalized) return prev;
      const next = [normalized, ...prev.filter((item) => item !== normalized)];
      return next.slice(0, 8);
    });
  }, []);

  const handleSaveSearch = useCallback(() => {
    const query = searchQuery.trim();
    if (!query) return;
    setSavedSearches((prev) => {
      if (prev.includes(query)) return prev;
      return [query, ...prev].slice(0, 12);
    });
  }, [searchQuery]);

  const handleRemoveSavedSearch = useCallback((query: string) => {
    setSavedSearches((prev) => prev.filter((item) => item !== query));
  }, []);

  const handleApplySavedSearch = useCallback((query: string) => {
    setSearchQuery(query);
    updateRecentSearches(query);
  }, [setSearchQuery, updateRecentSearches]);

  const handleDeleteRequest = useCallback((memory: Memory) => {
    setPendingDelete(memory);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    postMessage('deleteMemory', pendingDelete.id);
    setPendingDelete(null);
  }, [pendingDelete, postMessage]);

  const handleCancelDelete = useCallback(() => {
    setPendingDelete(null);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) return;
    const timeoutId = setTimeout(() => {
      updateRecentSearches(query);
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, updateRecentSearches]);

  const tourSteps = useMemo<GuidedTourStep[]>(() => ([
    {
      id: 'sidebar',
      title: 'Your memory sidebar',
      description: 'Everything you capture and recall lives in this panel.',
      selector: '[data-tour="sidebar-header"]'
    },
    {
      id: 'search',
      title: 'Search memories',
      description: 'Type a question or keyword to pull matching context fast.',
      selector: '[data-tour="search"]'
    },
    {
      id: 'memories',
      title: 'Organized memory list',
      description: 'Browse by type and attach memories to chat.',
      selector: '[data-tour="memories"]'
    },
    {
      id: 'chat',
      title: 'Chat with context',
      description: 'Ask follow-ups and attach memories for better responses.',
      selector: '[data-tour="chat"]'
    },
    {
      id: 'commands',
      title: 'Command palette + tree view',
      description: 'Use Cmd/Ctrl+Shift+P to run Lanonasis commands. Enable tree view in settings for a compact list.',
    }
  ]), []);

  const hasSearch = searchQuery.trim().length > 0;
  const baseTypeOrder = ['context', 'knowledge', 'project', 'reference', 'personal', 'workflow', 'conversation'];

  const filterSourceMemories = useMemo(() => (
    hasSearch ? filteredMemories : memories
  ), [filteredMemories, memories, hasSearch]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filterSourceMemories.forEach((memory) => {
      counts.set(memory.type, (counts.get(memory.type) || 0) + 1);
    });
    return counts;
  }, [filterSourceMemories]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filterSourceMemories.forEach((memory) => {
      memory.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    return counts;
  }, [filterSourceMemories]);

  const orderedTypes = useMemo(() => {
    const preferredOrder = sidebarPreferences.typeOrder.length > 0
      ? sidebarPreferences.typeOrder
      : baseTypeOrder;
    const typeList = Array.from(typeCounts.keys());
    const merged = [...preferredOrder, ...baseTypeOrder, ...typeList];
    const unique: string[] = [];
    merged.forEach((type) => {
      if (!unique.includes(type)) {
        unique.push(type);
      }
    });
    return unique.filter((type) => typeCounts.has(type) || preferredOrder.includes(type));
  }, [sidebarPreferences.typeOrder, typeCounts]);

  const visibleTypes = useMemo(() => (
    orderedTypes.filter((type) => !sidebarPreferences.hiddenTypes.includes(type))
  ), [orderedTypes, sidebarPreferences.hiddenTypes]);

  const allTags = useMemo(() => {
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [tagCounts]);

  const topTags = useMemo(() => allTags.slice(0, 8), [allTags]);

  const filteredTagOptions = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    if (!query) {
      return topTags;
    }
    return allTags.filter(([tag]) => tag.toLowerCase().includes(query)).slice(0, 12);
  }, [allTags, tagQuery, topTags]);

  const dateStart = useMemo(() => (
    dateRange.start ? new Date(`${dateRange.start}T00:00:00`) : null
  ), [dateRange.start]);

  const dateEnd = useMemo(() => (
    dateRange.end ? new Date(`${dateRange.end}T23:59:59`) : null
  ), [dateRange.end]);

  const visibleMemories = useMemo(() => {
    const results = filteredMemories.filter((memory) => {
      if (sidebarPreferences.hiddenTypes.includes(memory.type)) {
        return false;
      }
      if (activeTypes.length > 0 && !activeTypes.includes(memory.type)) {
        return false;
      }
      if (activeTags.length > 0 && !activeTags.every((tag) => memory.tags.includes(tag))) {
        return false;
      }
      const status = memory.status ?? 'active';
      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }
      if (dateStart && memory.date < dateStart) {
        return false;
      }
      if (dateEnd && memory.date > dateEnd) {
        return false;
      }
      return true;
    });

    if (hasSearch) {
      return [...results].sort((a, b) => {
        const aScore = typeof a.similarityScore === 'number' ? a.similarityScore : -1;
        const bScore = typeof b.similarityScore === 'number' ? b.similarityScore : -1;
        return bScore - aScore;
      });
    }

    return results;
  }, [
    activeTags,
    activeTypes,
    dateEnd,
    dateStart,
    filteredMemories,
    hasSearch,
    sidebarPreferences.hiddenTypes,
    statusFilter,
  ]);

  const toggleTypeFilter = (type: string) => {
    setActiveTypes((prev) => (
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    ));
  };

  const toggleTagFilter = (tag: string) => {
    setActiveTags((prev) => (
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    ));
  };

  const clearFilters = () => {
    setActiveTypes([]);
    setActiveTags([]);
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setTagQuery('');
  };

  const typeLabels: Record<string, string> = {
    context: 'Context',
    knowledge: 'Knowledge',
    project: 'Project',
    reference: 'Reference',
    personal: 'Personal',
    workflow: 'Workflow',
    conversation: 'Conversation',
  };

  const customizeTypes = useMemo(() => {
    const preferred = sidebarPreferences.typeOrder.length > 0
      ? sidebarPreferences.typeOrder
      : baseTypeOrder;
    const typeList = Array.from(typeCounts.keys());
    const merged = [...preferred, ...baseTypeOrder, ...typeList];
    const unique: string[] = [];
    merged.forEach((type) => {
      if (!unique.includes(type)) {
        unique.push(type);
      }
    });
    return unique;
  }, [baseTypeOrder, sidebarPreferences.typeOrder, typeCounts]);

  const hasActiveFilters = Boolean(
    activeTypes.length > 0 ||
    activeTags.length > 0 ||
    statusFilter !== 'all' ||
    dateRange.start ||
    dateRange.end
  );

  const groupedMemories = useMemo(() => {
    return visibleMemories.reduce<Record<string, Memory[]>>((acc, memory) => {
      if (!acc[memory.type]) {
        acc[memory.type] = [];
      }
      acc[memory.type].push(memory);
      return acc;
    }, {});
  }, [visibleMemories]);

  const shouldVirtualize = visibleMemories.length > 120;

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (!shouldVirtualize) return [];
    const items: VirtualItem[] = [];
    visibleTypes.forEach((type) => {
      const group = groupedMemories[type] || [];
      if (group.length === 0) return;
      const isOpen = !collapsedTypes[type];
      items.push({
        key: `header-${type}`,
        height: 28,
        content: (
          <div
            className="flex items-center gap-2 px-1 py-1 text-[11px] text-[var(--vscode-sideBarSectionHeader-foreground)] uppercase font-semibold cursor-pointer"
            onClick={() => toggleTypeSection(type)}
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 text-[var(--vscode-icon-foreground)] transition-transform',
                isOpen && 'rotate-90'
              )}
            />
            <span>{typeLabels[type] || type}</span>
            <span className="ml-auto rounded-full bg-[var(--vscode-badge-background)]/20 px-2 py-0.5 text-[10px] text-[var(--vscode-badge-foreground)] normal-case">
              {group.length}
            </span>
          </div>
        ),
      });

      if (!isOpen) return;

      group.forEach((memory) => {
        items.push({
          key: memory.id,
          height: 96,
          content: (
            <MemoryCard
              memory={memory}
              onAttach={handleAttachMemory}
              onCopy={handleCopyMemory}
              onEdit={handleEditMemory}
              onDelete={handleDeleteRequest}
              highlightQuery={searchQuery}
              showRelevance={Boolean(trimmedQuery)}
              typeLabel={typeLabels[memory.type] || memory.type}
            />
          ),
        });
      });
    });
    return items;
  }, [
    collapsedTypes,
    groupedMemories,
    handleAttachMemory,
    handleCopyMemory,
    handleDeleteRequest,
    handleEditMemory,
    searchQuery,
    shouldVirtualize,
    trimmedQuery,
    toggleTypeSection,
    typeLabels,
    visibleTypes,
  ]);

  const toggleTypeSection = useCallback((type: string) => {
    setCollapsedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }, []);

  const moveType = useCallback((type: string, direction: 'up' | 'down') => {
    const order = [...customizeTypes];
    const index = order.indexOf(type);
    if (index === -1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= order.length) return;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    updateSidebarPrefs({
      ...sidebarPreferences,
      typeOrder: order,
    });
  }, [customizeTypes, sidebarPreferences, updateSidebarPrefs]);

  const toggleHiddenType = useCallback((type: string) => {
    const hidden = sidebarPreferences.hiddenTypes;
    const nextHidden = hidden.includes(type)
      ? hidden.filter((item) => item !== type)
      : [...hidden, type];
    updateSidebarPrefs({
      ...sidebarPreferences,
      hiddenTypes: nextHidden,
    });
  }, [sidebarPreferences, updateSidebarPrefs]);

  const handleThemeChange = useCallback((theme: string) => {
    updateSidebarPrefs({
      ...sidebarPreferences,
      theme,
    });
  }, [sidebarPreferences, updateSidebarPrefs]);

  const themeStyles = useMemo(() => {
    const presets: Record<string, { accent: string; accentForeground: string; accentSoft: string }> = {
      default: {
        accent: 'var(--vscode-button-background)',
        accentForeground: 'var(--vscode-button-foreground)',
        accentSoft: 'var(--vscode-button-secondaryBackground)',
      },
      sunset: {
        accent: '#e26d5c',
        accentForeground: '#1b0e0c',
        accentSoft: 'rgba(226, 109, 92, 0.2)',
      },
      ocean: {
        accent: '#2ec4b6',
        accentForeground: '#071a17',
        accentSoft: 'rgba(46, 196, 182, 0.2)',
      },
      slate: {
        accent: '#7a8cff',
        accentForeground: '#0c1021',
        accentSoft: 'rgba(122, 140, 255, 0.2)',
      },
    };
    const preset = presets[sidebarPreferences.theme] || presets.default;
    return {
      '--lanonasis-accent': preset.accent,
      '--lanonasis-accent-foreground': preset.accentForeground,
      '--lanonasis-accent-soft': preset.accentSoft,
    } as React.CSSProperties;
  }, [sidebarPreferences.theme]);

  const syncStatusLabel = useMemo(() => {
    const pending = connectionStatus?.queueStatus?.pending ?? 0;
    const queueSyncing = connectionStatus?.queueStatus?.syncing ?? false;
    if (pending > 0) {
      return queueSyncing ? `Syncing (${pending} queued)` : `${pending} pending`;
    }
    if (memoriesLoading || connectionStatus?.cacheStatus?.isRefreshing) {
      return 'Syncing';
    }
    if (connectionStatus?.cacheStatus?.lastSyncAt) {
      const syncDate = new Date(connectionStatus.cacheStatus.lastSyncAt);
      return `Synced ${syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Not synced';
  }, [
    connectionStatus?.cacheStatus?.isRefreshing,
    connectionStatus?.cacheStatus?.lastSyncAt,
    connectionStatus?.queueStatus?.pending,
    connectionStatus?.queueStatus?.syncing,
    memoriesLoading
  ]);

  const onlineIndicator = connectionStatus?.offline === undefined
    ? isOnline
    : !connectionStatus.offline;

  const trimmedQuery = searchQuery.trim();
  const canSaveSearch = trimmedQuery.length >= 2;
  const isSavedSearch = canSaveSearch && savedSearches.includes(trimmedQuery);

  const attachClipboardContent = useCallback(() => {
    if (!clipboardContent) return;
    attachMemory({
      id: `clipboard-${Date.now()}`,
      title: 'Clipboard Content',
      content: clipboardContent,
      date: new Date(),
      tags: ['clipboard'],
      icon: Clipboard,
      type: 'context',
    });
    setClipboardContent(null);
  }, [clipboardContent, attachMemory]);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'chatResponse') {
        const response = message.data?.response || 'No response received.';
        addChatMessage('assistant', response);
        setIsChatLoading(false);
      } else if (message.type === 'chatError') {
        addChatMessage('assistant', `⚠️ Error: ${message.data || 'Failed to process query'}`);
        setIsChatLoading(false);
      } else if (message.type === 'chatLoading') {
        setIsChatLoading(message.data === true);
      } else if (message.type === 'clipboardContent') {
        setClipboardContent(message.data);
      } else if (message.type === 'connectionStatus') {
        setConnectionStatus(message.data as ConnectionStatusPayload);
      } else if (message.type === 'sidebarPreferences') {
        const prefs = message.data as SidebarPreferences;
        setSidebarPreferences({
          typeOrder: Array.isArray(prefs.typeOrder) ? prefs.typeOrder : [],
          hiddenTypes: Array.isArray(prefs.hiddenTypes) ? prefs.hiddenTypes : [],
          theme: prefs.theme || 'default',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addChatMessage, postMessage]);

  // Handle attaching memory to chat context
  const handleAttachMemory = useCallback(
    (memory: Memory) => {
      attachMemory(memory);
    },
    [attachMemory],
  );

  // Copy memory content to clipboard
  const handleCopyMemory = useCallback(
    (memory: Memory) => {
      postMessage('copyToClipboard', memory.content);
    },
    [postMessage],
  );

  const handleEditMemory = useCallback(
    (memory: Memory, updates: MemoryUpdateInput) => {
      postMessage('updateMemory', { id: memory.id, updates });
    },
    [postMessage],
  );

  const handleCreateFromSearch = useCallback(() => {
    if (!trimmedQuery) return;
    postMessage('createMemory', {
      title: trimmedQuery,
      content: `Captured from search: ${trimmedQuery}`,
      memory_type: 'context',
      tags: ['search'],
    });
  }, [postMessage, trimmedQuery]);

  return (
    <div
      className="flex h-screen w-full bg-[var(--vscode-sideBar-background)] text-[var(--vscode-sideBar-foreground)] font-sans overflow-hidden justify-center select-none"
      style={themeStyles}
    >
      {/* Sidebar Container */}
      <div
        className="w-full max-w-[400px] h-full flex flex-col bg-[var(--vscode-sideBar-background)] relative"
        data-tour="sidebar"
      >
        {/* Top Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 bg-[var(--vscode-sideBar-background)]"
          data-tour="sidebar-header"
        >
          {userDisplayName ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-[var(--vscode-badge-background)]/30 text-[10px] font-semibold text-[var(--vscode-editor-foreground)] flex items-center justify-center">
                {getInitials(userDisplayName)}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-semibold text-[var(--vscode-sideBarTitle-foreground)] max-w-[150px] truncate">
                  {userDisplayName}
                </span>
                {userSubLabel && (
                  <span className="text-[10px] text-[var(--vscode-descriptionForeground)] max-w-[150px] truncate">
                    {userSubLabel}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--vscode-sideBarTitle-foreground)]">
              LanOnasis Memory
            </span>
          )}
          <div className="flex items-center gap-1">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                    data-testid="btn-user-menu"
                    aria-label="Open account menu"
                  >
                    <Settings className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[var(--vscode-menu-background)] border-[var(--vscode-panel-border)] text-[var(--vscode-menu-foreground)] min-w-[160px] p-1 gap-0.5 shadow-xl"
                >
                  <DropdownMenuLabel className="text-[11px] text-[var(--vscode-descriptionForeground)] px-2 py-1.5 font-normal">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                  <DropdownMenuItem
                    className="text-[13px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1.5"
                    onClick={() => setShowApiKeys(true)}
                    data-testid="menu-api-keys"
                  >
                    <Key className="mr-2 h-3.5 w-3.5 opacity-70" />
                    <span>API Keys</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-[13px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1.5"
                    onClick={() => postMessage('openSettings')}
                    data-testid="menu-profile"
                  >
                    <User className="mr-2 h-3.5 w-3.5 opacity-70" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                  <DropdownMenuItem
                    className="text-[13px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1.5"
                    onClick={logout}
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5 opacity-70" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                  <DropdownMenuItem
                    className="text-[13px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1.5"
                    onClick={resetOnboarding}
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5 opacity-70" />
                    <span>Restart onboarding</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
              data-testid="btn-more"
              aria-label="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-1.5 border-b border-[var(--vscode-panel-border)]">
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--vscode-descriptionForeground)]">
            <span className={cn(
              'rounded-full px-2 py-0.5',
              isAuthenticated ? 'bg-[var(--vscode-testing-iconPassed)]/15 text-[var(--vscode-testing-iconPassed)]' : 'bg-[var(--vscode-testing-iconQueued)]/20 text-[var(--vscode-testing-iconQueued)]'
            )}>
              {isAuthenticated ? 'Authenticated' : 'Signed out'}
            </span>
            <span className="rounded-full px-2 py-0.5 bg-[var(--vscode-badge-background)]/20 text-[var(--vscode-badge-foreground)]">
              {connectionStatus?.connectionMode === 'cli' ? 'CLI mode' : 'HTTP API'}
            </span>
            <span className="rounded-full px-2 py-0.5 bg-[var(--vscode-badge-background)]/20 text-[var(--vscode-badge-foreground)]">
              {syncStatusLabel}
            </span>
            <span className={cn(
              'rounded-full px-2 py-0.5',
              onlineIndicator ? 'bg-[var(--vscode-testing-iconPassed)]/15 text-[var(--vscode-testing-iconPassed)]' : 'bg-[var(--vscode-testing-iconFailed)]/15 text-[var(--vscode-testing-iconFailed)]'
            )}>
              {onlineIndicator ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="flex flex-col min-h-full">
            {!onboardingLoading && onboardingStatus && showOnboarding && (
              <OnboardingPanel
                status={onboardingStatus}
                isAuthenticated={isAuthenticated}
                isAuthLoading={authLoading}
                onLogin={login}
                onCreateSampleMemory={handleCreateSampleMemory}
                onSearchMemories={handleSearchCommand}
                onStartTour={startGuidedTour}
                onSkip={skipOnboarding}
              />
            )}
            {/* Memory Assistant Section - Now with chat history */}
            <Collapsible open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
              <div
                className="vscode-section-header group"
                onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                data-testid="header-assistant"
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-[var(--vscode-icon-foreground)] transition-transform mr-0.5 opacity-80',
                    isAssistantOpen && 'rotate-90',
                  )}
                />
                <span className="text-[11px] font-bold text-[var(--vscode-sideBarSectionHeader-foreground)] uppercase">
                  Memory Assistant
                </span>
                {chatHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearChatHistory();
                    }}
                    title="Clear chat history"
                    aria-label="Clear chat history"
                  >
                    <Trash2 className="h-3 w-3 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                )}
              </div>
              <CollapsibleContent>
                <div className="flex flex-col" style={{ maxHeight: '300px' }}>
                  {/* Chat History */}
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                    {!isAuthenticated ? (
                      <div className="text-[13px] text-[var(--vscode-descriptionForeground)] flex items-center justify-center text-center italic opacity-80 py-4">
                        Please connect to enable AI assistance.
                      </div>
                    ) : chatHistory.length === 0 && !isChatLoading ? (
                      <div className="text-[13px] text-[var(--vscode-descriptionForeground)] flex items-center justify-center text-center italic opacity-80 py-4">
                        <Lightbulb className="h-4 w-4 mr-2 opacity-60" />
                        Ask me to recall context or refine prompts.
                      </div>
                    ) : (
                      <>
                        {chatHistory.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              'flex gap-2',
                              msg.role === 'user' ? 'justify-end' : 'justify-start',
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[85%] rounded-lg px-3 py-2 text-[13px]',
                                msg.role === 'user'
                                  ? 'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]'
                                  : 'bg-[var(--vscode-textCodeBlock-background)] text-[var(--vscode-editor-foreground)]',
                              )}
                            >
                              {msg.attachedMemories && msg.attachedMemories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {msg.attachedMemories.map((m) => (
                                    <span
                                      key={m.id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]"
                                    >
                                      <Paperclip className="h-2.5 w-2.5" />
                                      {m.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <span className="text-[10px] opacity-50 mt-1 block">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Loading indicator */}
                        {isChatLoading && (
                          <div className="flex gap-2 justify-start">
                            <div className="bg-[var(--vscode-textCodeBlock-background)] rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 text-[13px] text-[var(--vscode-descriptionForeground)]">
                                <div className="h-3 w-3 border-2 border-[var(--vscode-button-background)] border-t-transparent rounded-full animate-spin" />
                                <span>Searching memories...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Memories Section */}
            <Collapsible
              open={isMemoriesOpen}
              onOpenChange={setIsMemoriesOpen}
              className="flex-1 flex flex-col"
            >
              <div
                className="vscode-section-header group"
                onClick={() => setIsMemoriesOpen(!isMemoriesOpen)}
                data-testid="header-memories"
              >
                <div className="flex items-center">
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 text-[var(--vscode-icon-foreground)] transition-transform mr-0.5 opacity-80',
                      isMemoriesOpen && 'rotate-90',
                    )}
                  />
                  <span className="text-[11px] font-bold text-[var(--vscode-sideBarSectionHeader-foreground)] uppercase">
                    Memories
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const searchInput = document.querySelector(
                        '[data-testid="input-search"]',
                      ) as HTMLInputElement;
                      if (searchInput) {
                        searchInput.focus();
                      }
                    }}
                    data-testid="btn-search"
                    title="Search memories"
                  >
                    <Search className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickCapture();
                    }}
                    data-testid="btn-quick-capture"
                    title="Quick capture from selection or clipboard"
                  >
                    <Clipboard className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      refresh();
                    }}
                    data-testid="btn-refresh"
                    title="Refresh memories"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomize(true);
                    }}
                    data-testid="btn-customize"
                    title="Customize sidebar"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                </div>
              </div>
              <CollapsibleContent className="flex-1">
                {authLoading ? (
                  // Auth loading state
                  <div className="p-4 flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 border-2 border-[var(--vscode-button-background)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] text-[var(--vscode-descriptionForeground)]">
                      Connecting...
                    </span>
                  </div>
                ) : isAuthenticated ? (
                  <div className="p-2 space-y-2">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} disabled={!isAuthenticated} />
                    {canSaveSearch && (
                      <div className="flex items-center justify-between text-[10px] text-[var(--vscode-descriptionForeground)]">
                        <span>
                          {isSavedSearch ? 'Saved search' : 'Save this search for quick access'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={handleSaveSearch}
                          disabled={isSavedSearch}
                        >
                          <Bookmark className="mr-1 h-3 w-3" />
                          {isSavedSearch ? 'Saved' : 'Save'}
                        </Button>
                      </div>
                    )}
                    {!trimmedQuery && (savedSearches.length > 0 || recentSearches.length > 0) && (
                      <div className="space-y-2">
                        {savedSearches.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--vscode-descriptionForeground)]">
                              <span className="uppercase">Saved searches</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {savedSearches.map((query) => (
                                <div key={query} className="flex items-center gap-1">
                                  <button
                                    className="rounded-full bg-[var(--vscode-badge-background)]/20 px-2 py-0.5 text-[10px] text-[var(--vscode-badge-foreground)] hover:bg-[var(--vscode-badge-background)]/40"
                                    onClick={() => handleApplySavedSearch(query)}
                                  >
                                    {query}
                                  </button>
                                  <button
                                    className="text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-errorForeground)]"
                                    onClick={() => handleRemoveSavedSearch(query)}
                                    aria-label={`Remove saved search ${query}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {recentSearches.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--vscode-descriptionForeground)]">
                              <span className="uppercase">Recent searches</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {recentSearches.slice(0, 6).map((query) => (
                                <button
                                  key={query}
                                  className="rounded-full bg-[var(--vscode-badge-background)]/10 px-2 py-0.5 text-[10px] text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-badge-background)]/30"
                                  onClick={() => handleApplySavedSearch(query)}
                                >
                                  {query}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {(visibleTypes.length > 0 || topTags.length > 0) && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 overflow-x-auto">
                          <div className="flex gap-1">
                            {visibleTypes.map((type) => (
                              <Button
                                key={type}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'h-6 px-2 text-[11px] whitespace-nowrap',
                                  activeTypes.includes(type)
                                    ? 'bg-[var(--lanonasis-accent)] text-[var(--lanonasis-accent-foreground)]'
                                    : 'text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-editor-foreground)]'
                                )}
                                onClick={() => toggleTypeFilter(type)}
                                aria-pressed={activeTypes.includes(type)}
                              >
                                {typeLabels[type] || type}
                                <span className="ml-1 opacity-60">
                                  {typeCounts.get(type) || 0}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] whitespace-nowrap"
                              aria-label="Filter by tag"
                            >
                              Tags {activeTags.length > 0 ? `(${activeTags.length})` : ''}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[180px] p-1">
                            <DropdownMenuLabel className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                              Popular tags
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                            <div className="px-2 py-1">
                              <Input
                                value={tagQuery}
                                onChange={(event) => setTagQuery(event.target.value)}
                                placeholder="Filter tags"
                                className="h-7 text-[11px]"
                                aria-label="Filter tags"
                              />
                            </div>
                            {filteredTagOptions.length === 0 && (
                              <div className="px-2 py-1 text-[11px] text-[var(--vscode-descriptionForeground)]">
                                No tags yet
                              </div>
                            )}
                            {tagQuery.trim() && !tagCounts.has(tagQuery.trim()) && (
                              <DropdownMenuItem
                                className="text-[11px] px-2 py-1"
                                onClick={() => {
                                  toggleTagFilter(tagQuery.trim());
                                  setTagQuery('');
                                }}
                              >
                                Add "{tagQuery.trim()}"
                              </DropdownMenuItem>
                            )}
                            {filteredTagOptions.map(([tag, count]) => (
                              <DropdownMenuItem
                                key={tag}
                                className="text-[11px] px-2 py-1"
                                onClick={() => toggleTagFilter(tag)}
                              >
                                <span className={cn(
                                  'mr-2 h-2 w-2 rounded-full border',
                                  activeTags.includes(tag)
                                    ? 'bg-[var(--lanonasis-accent)] border-[var(--lanonasis-accent)]'
                                    : 'border-[var(--vscode-panel-border)]'
                                )} />
                                <span className="flex-1 text-left">{tag}</span>
                                <span className="opacity-60">{count}</span>
                              </DropdownMenuItem>
                            ))}
                            {hasActiveFilters && (
                              <>
                                <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                                <DropdownMenuItem
                                  className="text-[11px] px-2 py-1"
                                  onClick={clearFilters}
                                >
                                  Clear filters
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] whitespace-nowrap"
                              aria-label="More filters"
                            >
                              Filters
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[220px] p-2">
                            <DropdownMenuLabel className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                              Status
                            </DropdownMenuLabel>
                            <div className="flex flex-wrap gap-1 px-1 py-1">
                              {(['all', 'active', 'archived', 'draft', 'deleted'] as Array<MemoryStatus | 'all'>).map((status) => (
                                <Button
                                  key={status}
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    'h-6 px-2 text-[11px]',
                                    statusFilter === status
                                      ? 'bg-[var(--lanonasis-accent)] text-[var(--lanonasis-accent-foreground)]'
                                      : 'text-[var(--vscode-descriptionForeground)]'
                                  )}
                                  onClick={() => setStatusFilter(status)}
                                  aria-pressed={statusFilter === status}
                                >
                                  {status === 'all' ? 'All' : status}
                                </Button>
                              ))}
                            </div>
                            <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                            <DropdownMenuLabel className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                              Date range
                            </DropdownMenuLabel>
                            <div className="px-1 py-1 space-y-2">
                              <Input
                                type="date"
                                value={dateRange.start}
                                onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
                                className="h-7 text-[11px]"
                                aria-label="Start date"
                              />
                              <Input
                                type="date"
                                value={dateRange.end}
                                onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
                                className="h-7 text-[11px]"
                                aria-label="End date"
                              />
                            </div>
                            {hasActiveFilters && (
                              <>
                                <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                                <DropdownMenuItem
                                  className="text-[11px] px-2 py-1"
                                  onClick={clearFilters}
                                >
                                  Clear filters
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    {hasActiveFilters && (
                      <div className="flex items-center justify-between text-[10px] text-[var(--vscode-descriptionForeground)]">
                        <span>
                          Showing {visibleMemories.length} of {filteredMemories.length}
                        </span>
                        <button
                          className="text-[10px] text-[var(--vscode-textLink-foreground)] hover:underline"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 mb-4">
                      <Button
                        className="flex-1 vscode-button h-7 gap-1.5"
                        onClick={() =>
                          postMessage('createMemory', {
                            title: 'New Memory',
                            content: 'Created from enhanced UI',
                            memory_type: 'context',
                            tags: [],
                          })
                        }
                        data-testid="btn-create"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create
                      </Button>
                      <Button
                        className="flex-1 vscode-button vscode-button-secondary h-7 gap-1.5"
                        onClick={refresh}
                        disabled={memoriesLoading}
                        data-testid="btn-sync"
                      >
                        <RefreshCw
                          className={cn('h-3.5 w-3.5', memoriesLoading && 'animate-spin')}
                        />
                        Sync
                      </Button>
                    </div>

                    {/* Loading state */}
                    {memoriesLoading && (
                      <div className="p-4 flex flex-col items-center justify-center gap-2">
                        <div className="h-5 w-5 border-2 border-[var(--vscode-button-background)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[12px] text-[var(--vscode-descriptionForeground)]">
                          Loading memories...
                        </span>
                      </div>
                    )}

                    {/* Error state */}
                    {!memoriesLoading && error && (
                      <div className="p-3 bg-[var(--vscode-inputValidation-errorBackground)] border border-[var(--vscode-inputValidation-errorBorder)] rounded text-[13px] flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-[var(--vscode-errorForeground)] shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-[var(--vscode-errorForeground)]">{error}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-6 text-[11px]"
                            onClick={refresh}
                          >
                            Try again
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Memory list */}
                    {!memoriesLoading && !error && (
                      <div className="space-y-0.5" data-tour="memories">
                        {visibleMemories.length === 0 ? (
                          <div className="p-4 text-center text-[13px] text-[var(--vscode-descriptionForeground)] space-y-3">
                            {hasSearch ? (
                              <>
                                <div className="text-[13px] text-[var(--vscode-editor-foreground)]">
                                  No matches for "{trimmedQuery}"
                                </div>
                                <div className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                                  Try refining your query or use a saved search.
                                </div>
                                {(recentSearches.length > 0 || topTags.length > 0) && (
                                  <div className="flex flex-wrap justify-center gap-2">
                                    {recentSearches.slice(0, 3).map((query) => (
                                      <button
                                        key={query}
                                        className="rounded-full bg-[var(--vscode-badge-background)]/20 px-2 py-0.5 text-[10px] text-[var(--vscode-badge-foreground)] hover:bg-[var(--vscode-badge-background)]/40"
                                        onClick={() => handleApplySavedSearch(query)}
                                      >
                                        {query}
                                      </button>
                                    ))}
                                    {topTags.slice(0, 3).map(([tag]) => (
                                      <button
                                        key={tag}
                                        className="rounded-full bg-[var(--vscode-badge-background)]/10 px-2 py-0.5 text-[10px] text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-badge-background)]/30"
                                        onClick={() => toggleTagFilter(tag)}
                                      >
                                        Tag: {tag}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="flex flex-wrap justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px]"
                                    onClick={() => setSearchQuery('')}
                                  >
                                    Clear search
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px]"
                                    onClick={handleCreateFromSearch}
                                  >
                                    Create memory from search
                                  </Button>
                                </div>
                              </>
                            ) : memories.length === 0 ? (
                              <>
                                <div className="text-[13px] text-[var(--vscode-editor-foreground)]">
                                  Your memory space is empty
                                </div>
                                <div className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                                  Capture notes, decisions, and context to power your assistant.
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px]"
                                    onClick={() =>
                                      postMessage('createMemory', {
                                        title: 'New Memory',
                                        content: 'Captured from the sidebar',
                                        memory_type: 'context',
                                        tags: [],
                                      })
                                    }
                                  >
                                    Create memory
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px]"
                                    onClick={handleQuickCapture}
                                  >
                                    Quick capture
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-[13px] text-[var(--vscode-editor-foreground)]">
                                  No memories match your filters
                                </div>
                                <div className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                                  Adjust your filters or clear them to see more.
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px]"
                                  onClick={clearFilters}
                                >
                                  Clear filters
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          shouldVirtualize ? (
                            <VirtualSectionList
                              items={virtualItems}
                              className="pr-1"
                              maxHeight={460}
                            />
                          ) : (
                            visibleTypes.map((type) => {
                              const group = groupedMemories[type] || [];
                              if (group.length === 0) return null;
                              const isOpen = !collapsedTypes[type];
                              return (
                                <Collapsible
                                  key={type}
                                  open={isOpen}
                                  className="mb-2"
                                >
                                  <div
                                    className="flex items-center gap-2 px-1 py-1 text-[11px] text-[var(--vscode-sideBarSectionHeader-foreground)] uppercase font-semibold cursor-pointer"
                                    onClick={() => toggleTypeSection(type)}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        'h-3.5 w-3.5 text-[var(--vscode-icon-foreground)] transition-transform',
                                        isOpen && 'rotate-90'
                                      )}
                                    />
                                    <span>{typeLabels[type] || type}</span>
                                    <span className="ml-auto rounded-full bg-[var(--vscode-badge-background)]/20 px-2 py-0.5 text-[10px] text-[var(--vscode-badge-foreground)] normal-case">
                                      {group.length}
                                    </span>
                                  </div>
                                  <CollapsibleContent className="space-y-0.5">
                                    {group.map((memory) => (
                                      <MemoryCard
                                        key={memory.id}
                                        memory={memory}
                                        onAttach={handleAttachMemory}
                                        onCopy={handleCopyMemory}
                                        onEdit={handleEditMemory}
                                        onDelete={handleDeleteRequest}
                                        highlightQuery={searchQuery}
                                        showRelevance={Boolean(trimmedQuery)}
                                        typeLabel={typeLabels[memory.type] || memory.type}
                                      />
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              );
                            })
                          )
                        )}
                      </div>
                    )}
                  </div>
                ) : showOnboarding ? null : (
                  <WelcomeView onLogin={login} isLoading={authLoading} />
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {clipboardContent && (
          <div className="px-3 py-2 bg-[var(--vscode-textCodeBlock-background)] border-t border-[var(--vscode-panel-border)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[var(--vscode-descriptionForeground)] uppercase">
                Clipboard Content
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1"
                  onClick={attachClipboardContent}
                  title="Attach to chat"
                >
                  <Paperclip className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1"
                  onClick={() => setClipboardContent(null)}
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="text-[11px] text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded p-2 max-h-24 overflow-y-auto">
              {clipboardContent.length > 200
                ? `${clipboardContent.slice(0, 200)}...`
                : clipboardContent}
            </div>
          </div>
        )}

        {/* Attached Memory Context Bar */}
        {attachedMemories.length > 0 && (
          <div className="px-3 py-2 bg-[var(--vscode-textCodeBlock-background)] border-t border-[var(--vscode-panel-border)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[var(--vscode-descriptionForeground)] uppercase">
                Context ({attachedMemories.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 text-[10px] px-1"
                onClick={clearContext}
              >
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {attachedMemories.map((memory) => (
                <div
                  key={memory.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]"
                >
                  <Paperclip className="h-3 w-3 opacity-70" />
                  <span className="max-w-[100px] truncate">{memory.title}</span>
                  <button
                    className="ml-1 hover:text-[var(--vscode-errorForeground)] transition-colors"
                    onClick={() => removeMemory(memory.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Chat Interface */}
        <div data-tour="chat">
          <ChatInterface
            value={chatInput}
            onChange={setChatInput}
            onSend={handleChatSend}
            isAuthenticated={isAuthenticated}
            isLoading={isChatLoading}
            attachedCount={attachedMemories.length}
            onPaste={handlePasteToMemory}
          />
        </div>

        {/* API Key Manager Modal */}
        <ApiKeyManager isOpen={showApiKeys} onClose={() => setShowApiKeys(false)} />

        <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
          <DialogContent className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] text-[var(--vscode-editor-foreground)] max-w-lg p-0 overflow-hidden">
            <div className="p-4 border-b border-[var(--vscode-panel-border)]">
              <DialogHeader>
                <DialogTitle className="text-[14px]">Customize sidebar</DialogTitle>
                <DialogDescription className="text-[11px]">
                  Reorder sections, hide types, and adjust the accent theme.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-[11px] font-semibold uppercase text-[var(--vscode-descriptionForeground)]">
                  Memory sections
                </h4>
                <div className="mt-2 space-y-2">
                  {customizeTypes.map((type, index) => (
                    <div
                      key={type}
                      className={cn(
                        'flex items-center gap-2 rounded-sm border border-[var(--vscode-panel-border)] px-2 py-1',
                        sidebarPreferences.hiddenTypes.includes(type) && 'opacity-60'
                      )}
                    >
                      <span className="flex-1 text-[12px]">
                        {typeLabels[type] || type}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        disabled={index === 0}
                        onClick={() => moveType(type, 'up')}
                      >
                        Up
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        disabled={index === customizeTypes.length - 1}
                        onClick={() => moveType(type, 'down')}
                      >
                        Down
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => toggleHiddenType(type)}
                      >
                        {sidebarPreferences.hiddenTypes.includes(type) ? 'Show' : 'Hide'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-semibold uppercase text-[var(--vscode-descriptionForeground)]">
                  Theme
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['default', 'sunset', 'ocean', 'slate'].map((theme) => (
                    <Button
                      key={theme}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-6 text-[10px]',
                        sidebarPreferences.theme === theme
                          ? 'bg-[var(--lanonasis-accent)] text-[var(--lanonasis-accent-foreground)]'
                          : 'text-[var(--vscode-descriptionForeground)]'
                      )}
                      onClick={() => handleThemeChange(theme)}
                    >
                      {theme}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-[var(--vscode-panel-border)] flex justify-end">
              <Button variant="ghost" size="sm" className="h-6" onClick={() => setShowCustomize(false)}>
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
          <DialogContent className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] text-[var(--vscode-editor-foreground)] max-w-sm p-4">
            <DialogHeader>
              <DialogTitle className="text-[14px]">Delete memory</DialogTitle>
              <DialogDescription className="text-[11px]">
                {pendingDelete ? `This will permanently remove "${pendingDelete.title}".` : 'This action cannot be undone.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2">
              <Button variant="ghost" size="sm" className="h-6" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[var(--vscode-errorForeground)]"
                onClick={handleConfirmDelete}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <GuidedTourOverlay
        open={tourOpen}
        steps={tourSteps}
        scrollContainerRef={scrollAreaRef}
        onClose={() => setTourOpen(false)}
        onComplete={() => {
          setTourOpen(false);
          completeStep('tour');
        }}
      />
    </div>
  );
};
