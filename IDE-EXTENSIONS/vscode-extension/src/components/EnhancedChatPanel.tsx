import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  History,
  Plus,
  Trash2,
  Copy,
  Check,
  Save,
  X,
  MessageSquare,
  Clock,
  ChevronDown,
  Clipboard,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '../utils/cn';
import { useChatHistory, ChatMessage, ChatSession } from '../hooks/useChatHistory';
import type { Memory } from '../shared/types';

interface EnhancedChatPanelProps {
  isAuthenticated: boolean;
  attachedMemories?: Memory[];
  onAttachMemory?: () => void;
  onRemoveAttachedMemory?: (memoryId: string) => void;
  onSaveAsMemory?: (content: string) => void;
  onPasteFromClipboard?: () => void;
}

export const EnhancedChatPanel: React.FC<EnhancedChatPanelProps> = ({
  isAuthenticated,
  attachedMemories = [],
  onAttachMemory,
  onRemoveAttachedMemory,
  onSaveAsMemory,
  onPasteFromClipboard,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    sessions,
    addMessage,
    clearHistory,
    startNewSession,
    loadSession,
    deleteSession,
    saveCurrentSession,
  } = useChatHistory();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to VS Code extension and handle response
  const postMessage = (type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  };

  // Listen for chat responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'chatResponse') {
        const response = message.data?.response || 'No response received.';
        addMessage('assistant', response);
        setIsLoading(false);
      } else if (message.type === 'chatError') {
        addMessage('assistant', `Error: ${message.data || 'Failed to process query'}`);
        setIsLoading(false);
      } else if (message.type === 'chatLoading') {
        setIsLoading(message.data === true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addMessage]);

  const handleSend = () => {
    if (!inputValue.trim() || !isAuthenticated || isLoading) return;

    // Add user message to history
    const memoryIds = attachedMemories.map(m => m.id);
    addMessage('user', inputValue.trim(), memoryIds);
    
    // Send to extension
    setIsLoading(true);
    postMessage('chatQuery', {
      query: inputValue.trim(),
      attachedMemories: memoryIds
    });
    
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--vscode-sideBar-background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--vscode-panel-border)]">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--vscode-sideBarTitle-foreground)]">
          Memory Assistant
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
            onClick={() => setShowHistory(!showHistory)}
            title="Chat History"
          >
            <History className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
            onClick={startNewSession}
            title="New Chat"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
              onClick={clearHistory}
              title="Clear Chat"
            >
              <Trash2 className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
            </Button>
          )}
        </div>
      </div>

      {/* History Sidebar (collapsible) */}
      {showHistory && (
        <div className="border-b border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBarSectionHeader-background)]">
          <div className="p-2">
            <div className="text-[11px] font-medium text-[var(--vscode-descriptionForeground)] uppercase mb-2">
              Recent Chats
            </div>
            <ScrollArea className="max-h-[150px]">
              {sessions.length === 0 ? (
                <div className="text-[12px] text-[var(--vscode-descriptionForeground)] opacity-70 p-2">
                  No chat history yet
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.slice(0, 10).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-1.5 rounded-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer group"
                      onClick={() => {
                        loadSession(session.id);
                        setShowHistory(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageSquare className="h-3 w-3 text-[var(--vscode-icon-foreground)] opacity-60 shrink-0" />
                        <span className="text-[12px] truncate">{session.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--vscode-descriptionForeground)] opacity-60">
                          {formatTimestamp(session.updatedAt)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 hover:bg-[var(--vscode-inputValidation-errorBackground)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Attached Memories */}
      {attachedMemories.length > 0 && (
        <div className="px-3 py-2 border-b border-[var(--vscode-panel-border)] bg-[var(--vscode-textBlockQuote-background)]">
          <div className="text-[10px] font-medium text-[var(--vscode-descriptionForeground)] uppercase mb-1.5">
            📎 Context ({attachedMemories.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {attachedMemories.map((memory) => (
              <div
                key={memory.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] text-[11px]"
              >
                <span className="max-w-[100px] truncate">{memory.title}</span>
                {onRemoveAttachedMemory && (
                  <button
                    onClick={() => onRemoveAttachedMemory(memory.id)}
                    className="hover:opacity-80"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        {!isAuthenticated ? (
          <div className="flex items-center justify-center h-full text-[13px] text-[var(--vscode-descriptionForeground)] italic">
            Connect to start chatting with your memories
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquare className="h-8 w-8 text-[var(--vscode-icon-foreground)] opacity-30 mb-3" />
            <p className="text-[13px] text-[var(--vscode-descriptionForeground)] mb-2">
              Ready to assist with your memories
            </p>
            <p className="text-[11px] text-[var(--vscode-descriptionForeground)] opacity-70">
              Ask questions, recall context, or refine prompts
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'rounded-sm p-2.5',
                  message.role === 'user'
                    ? 'bg-[var(--vscode-button-background)]/10 ml-4'
                    : 'bg-[var(--vscode-textBlockQuote-background)] mr-4'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[var(--vscode-descriptionForeground)]">
                      {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
                    </span>
                    <span className="text-[10px] text-[var(--vscode-descriptionForeground)] opacity-60">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      title="Copy"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    {message.role === 'assistant' && onSaveAsMemory && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onSaveAsMemory(message.content)}
                        title="Save as Memory"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-[13px] text-[var(--vscode-editor-foreground)] whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
                {message.attachedMemories && message.attachedMemories.length > 0 && (
                  <div className="mt-2 text-[10px] text-[var(--vscode-descriptionForeground)] opacity-70">
                    📎 Referenced {message.attachedMemories.length} memories
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="bg-[var(--vscode-textBlockQuote-background)] rounded-sm p-2.5 mr-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-[var(--vscode-button-background)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px] text-[var(--vscode-descriptionForeground)]">
                    Searching memories...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t border-[var(--vscode-panel-border)]">
        <div className="relative bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] focus-within:border-[var(--vscode-focusBorder)] rounded-sm transition-colors">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAuthenticated ? 'Ask about your memories...' : 'Connect to chat'}
            disabled={!isAuthenticated || isLoading}
            className="w-full min-h-[60px] max-h-[120px] p-2 pb-8 bg-transparent border-none text-[13px] text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="textarea-chat"
          />
          <div className="absolute left-2 bottom-1.5 flex gap-1">
            {onAttachMemory && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-[var(--vscode-icon-foreground)] hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                disabled={!isAuthenticated || isLoading}
                onClick={onAttachMemory}
                title="Attach Memory"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
            )}
            {onPasteFromClipboard && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-[var(--vscode-icon-foreground)] hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                disabled={!isAuthenticated || isLoading}
                onClick={onPasteFromClipboard}
                title="Paste from Clipboard"
              >
                <Clipboard className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="absolute right-2 bottom-1.5">
            <Button
              size="icon"
              className="h-6 w-6 bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)] text-[var(--vscode-button-foreground)] rounded-sm disabled:opacity-50"
              disabled={!isAuthenticated || isLoading || !inputValue.trim()}
              onClick={handleSend}
              title="Send (Enter)"
            >
              {isLoading ? (
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex gap-2">
            {onAttachMemory && (
              <button
                className="text-[10px] text-[var(--vscode-textLink-foreground)] hover:underline disabled:opacity-50"
                onClick={onAttachMemory}
                disabled={!isAuthenticated}
              >
                + Attach Memory
              </button>
            )}
          </div>
          <div className="text-[10px] text-[var(--vscode-descriptionForeground)] opacity-60">
            Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

