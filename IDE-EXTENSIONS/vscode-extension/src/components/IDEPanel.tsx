import React, { useState } from 'react';
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
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { cn } from '../utils/cn';
import { MOCK_MEMORIES } from '@/shared/mock-data';
import { useAuth } from '../hooks/useAuth';
import { useMemories } from '../hooks/useMemories';
import { MemoryCard } from './MemoryCard';
import { SearchBar } from './SearchBar';
import { ChatInterface } from './ChatInterface';
import { ApiKeyManager } from './ApiKeyManager';
import { WelcomeView } from './WelcomeView';

export const IDEPanel = () => {
  const { isAuthenticated, login, logout } = useAuth();
  const { searchQuery, setSearchQuery, filteredMemories } = useMemories(MOCK_MEMORIES);
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(true);

  // Send messages to VS Code extension
  const postMessage = (type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  };

  // Handle chat queries
  const handleChatSend = (query: string) => {
    if (!query.trim() || !isAuthenticated) return;
    
    setIsChatLoading(true);
    setChatResponse(null);
    postMessage('chatQuery', query);
  };

  // Listen for chat responses
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'chatResponse') {
        setChatResponse(message.data?.response || 'No response received.');
        setIsChatLoading(false);
      } else if (message.type === 'chatError') {
        setChatResponse(`Error: ${message.data || 'Failed to process query'}`);
        setIsChatLoading(false);
      } else if (message.type === 'chatLoading') {
        setIsChatLoading(message.data === true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex h-screen w-full bg-[var(--vscode-sideBar-background)] text-[var(--vscode-sideBar-foreground)] font-sans overflow-hidden justify-center select-none">
      {/* Sidebar Container */}
      <div className="w-full max-w-[400px] h-full flex flex-col bg-[var(--vscode-sideBar-background)] relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--vscode-sideBar-background)]">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--vscode-sideBarTitle-foreground)]">
            LanOnasis Memory
          </span>
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
            {/* Memory Assistant Section */}
            <Collapsible
              open={isAssistantOpen}
              onOpenChange={setIsAssistantOpen}
            >
              <div
                className="vscode-section-header group"
                onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                data-testid="header-assistant"
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-[var(--vscode-icon-foreground)] transition-transform mr-0.5 opacity-80',
                    isAssistantOpen && 'rotate-90'
                  )}
                />
                <span className="text-[11px] font-bold text-[var(--vscode-sideBarSectionHeader-foreground)] uppercase">
                  Memory Assistant
                </span>
              </div>
              <CollapsibleContent>
                <div className="min-h-[80px] p-4 space-y-3">
                  {!isAuthenticated ? (
                    <div className="text-[13px] text-[var(--vscode-descriptionForeground)] flex items-center justify-center text-center italic opacity-80">
                      Please connect to enable AI assistance.
                    </div>
                  ) : isChatLoading ? (
                    <div className="flex items-center gap-2 text-[13px] text-[var(--vscode-descriptionForeground)]">
                      <div className="h-4 w-4 border-2 border-[var(--vscode-button-background)] border-t-transparent rounded-full animate-spin" />
                      <span>Searching memories...</span>
                    </div>
                  ) : chatResponse ? (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13px] text-[var(--vscode-editor-foreground)] whitespace-pre-wrap flex-1">
                          {chatResponse}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => setChatResponse(null)}
                          data-testid="btn-clear-chat"
                        >
                          <span className="text-[10px]">×</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[13px] text-[var(--vscode-descriptionForeground)] flex items-center justify-center text-center italic opacity-80">
                      Ready to assist. Ask me to recall context or refine prompts.
                    </div>
                  )}
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
                      isMemoriesOpen && 'rotate-90'
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
                    onClick={() => {
                      // Focus search bar or trigger search
                      const searchInput = document.querySelector('[data-testid="input-search"]') as HTMLInputElement;
                      if (searchInput) {
                        searchInput.focus();
                      }
                    }}
                    data-testid="btn-search"
                  >
                    <Search className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm"
                    onClick={() => {
                      setSearchQuery('');
                      postMessage('getMemories');
                    }}
                    data-testid="btn-refresh"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                </div>
              </div>
              <CollapsibleContent className="flex-1">
                {isAuthenticated ? (
                  <div className="p-2 space-y-2">
                    <SearchBar
                      value={searchQuery}
                      onChange={setSearchQuery}
                    />
                    <div className="flex gap-2 mb-4">
                      <Button
                        className="flex-1 vscode-button h-7 gap-1.5"
                        onClick={() => postMessage('createMemory', {
                          title: 'New Memory',
                          content: 'Created from enhanced UI',
                          memory_type: 'context',
                          tags: []
                        })}
                        data-testid="btn-create"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create
                      </Button>
                      <Button
                        className="flex-1 vscode-button vscode-button-secondary h-7 gap-1.5"
                        onClick={() => postMessage('getMemories')}
                        data-testid="btn-sync"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync
                      </Button>
                    </div>
                    <div className="space-y-0.5">
                      {filteredMemories.map(memory => (
                        <MemoryCard key={memory.id} memory={memory} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <WelcomeView onLogin={login} />
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Bottom Chat Interface */}
        <ChatInterface
          value={chatInput}
          onChange={setChatInput}
          onSend={handleChatSend}
          isAuthenticated={isAuthenticated}
          isLoading={isChatLoading}
        />

        {/* API Key Manager Modal */}
        <ApiKeyManager
          isOpen={showApiKeys}
          onClose={() => setShowApiKeys(false)}
        />
      </div>
    </div>
  );
};

