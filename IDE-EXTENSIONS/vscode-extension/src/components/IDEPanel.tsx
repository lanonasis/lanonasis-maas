import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  X,
  Paperclip,
  Clipboard,
  Trash2,
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
import { cn } from '../utils/cn';
import { useAuth } from '../hooks/useAuth';
import { useMemories } from '../hooks/useMemories';
import { MemoryCard } from './MemoryCard';
import { SearchBar } from './SearchBar';
import { ChatInterface } from './ChatInterface';
import { ApiKeyManager } from './ApiKeyManager';
import { WelcomeView } from './WelcomeView';
import type { Memory } from '../shared/types';

// Chat message type for history
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachedMemories?: Array<{ id: string; title: string }>;
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

  const userDisplayName = user?.name || user?.email || null;
  const userSubLabel = user?.name && user?.email ? user.email : null;

  const chatScrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex h-screen w-full bg-[var(--vscode-sideBar-background)] text-[var(--vscode-sideBar-foreground)] font-sans overflow-hidden justify-center select-none">
      {/* Sidebar Container */}
      <div className="w-full max-w-[400px] h-full flex flex-col bg-[var(--vscode-sideBar-background)] relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--vscode-sideBar-background)]">
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
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col min-h-full">
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
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
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
                      <div className="space-y-0.5">
                        {filteredMemories.length === 0 ? (
                          <div className="p-4 text-center text-[13px] text-[var(--vscode-descriptionForeground)]">
                            {searchQuery
                              ? 'No memories found matching your search.'
                              : 'No memories yet. Create your first memory!'}
                          </div>
                        ) : (
                          filteredMemories.map((memory) => (
                            <MemoryCard
                              key={memory.id}
                              memory={memory}
                              onAttach={handleAttachMemory}
                              onCopy={handleCopyMemory}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <WelcomeView onLogin={login} />
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
        <ChatInterface
          value={chatInput}
          onChange={setChatInput}
          onSend={handleChatSend}
          isAuthenticated={isAuthenticated}
          isLoading={isChatLoading}
          attachedCount={attachedMemories.length}
          onPaste={handlePasteToMemory}
        />

        {/* API Key Manager Modal */}
        <ApiKeyManager isOpen={showApiKeys} onClose={() => setShowApiKeys(false)} />
      </div>
    </div>
  );
};
