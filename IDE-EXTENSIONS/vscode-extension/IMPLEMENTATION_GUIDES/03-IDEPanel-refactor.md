# Implementation Guide: Refactor IDEPanel Component

## Overview

Split the monolithic 700+ line `IDEPanel.tsx` into focused, maintainable components.

**Priority:** HIGH
**Issue:** #17

---

## Current Structure Analysis

**IDEPanel.tsx breakdown:**
- Lines 1-50: Imports
- Lines 51-115: Inline hooks (useChatHistory, useMemoryContext)
- Lines 116-215: State initialization (13+ state variables)
- Lines 216-300: Message handlers
- Lines 301-400: Effect hooks
- Lines 401-500: Helper functions
- Lines 501-600: Menu rendering
- Lines 601-700+: Main JSX render

---

## Target Architecture

```
src/components/
├── IDEPanel.tsx              # Orchestration only (~150 lines)
├── layout/
│   ├── Header.tsx            # Logo, menu, actions
│   └── TabBar.tsx            # Tab navigation
├── panels/
│   ├── MemoriesPanel.tsx     # Memory list and search
│   ├── ChatPanel.tsx         # Chat interface
│   ├── SettingsPanel.tsx     # Settings and config
│   └── ApiKeyManager.tsx     # API key management
├── memory/
│   ├── MemoryList.tsx        # Memory card list
│   ├── MemoryCard.tsx        # (existing)
│   └── MemoryFilters.tsx     # Type/date filters
└── shared/
    └── EmptyState.tsx        # Reusable empty states
```

---

## Implementation Steps

### Step 1: Extract Header Component

**File:** `src/components/layout/Header.tsx`

```typescript
import React from 'react';
import { Settings, LogOut, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';

interface HeaderProps {
  isAuthenticated: boolean;
  userName?: string;
  onSettings: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}

export function Header({ isAuthenticated, userName, onSettings, onLogout, onRefresh }: HeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-[var(--vscode-panel-border)]">
      <div className="flex items-center gap-2">
        <img src={logoUrl} alt="Logo" className="h-5 w-5" />
        <span className="font-medium">Memory Assistant</span>
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onSettings}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRefresh}>
              Refresh
            </DropdownMenuItem>
            {isAuthenticated && (
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

### Step 2: Extract TabBar Component

**File:** `src/components/layout/TabBar.tsx`

```typescript
import React from 'react';
import { Brain, MessageSquare, Key, Settings } from 'lucide-react';

type TabId = 'memories' | 'chat' | 'apikeys' | 'settings';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs = [
  { id: 'memories' as const, label: 'Memories', icon: Brain },
  { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
  { id: 'apikeys' as const, label: 'API Keys', icon: Key },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex border-b border-[var(--vscode-panel-border)]">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 p-2 text-sm flex items-center justify-center gap-1
            ${activeTab === tab.id
              ? 'bg-[var(--vscode-tab-activeBackground)] border-b-2 border-[var(--vscode-focusBorder)]'
              : 'hover:bg-[var(--vscode-list-hoverBackground)]'
            }
          `}
        >
          <tab.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### Step 3: Extract MemoriesPanel Component

**File:** `src/components/panels/MemoriesPanel.tsx`

```typescript
import React from 'react';
import { useMemories } from '../../hooks/useMemories';
import { SearchBar } from '../SearchBar';
import { MemoryCard } from '../MemoryCard';

interface MemoriesPanelProps {
  onMemorySelect?: (memoryId: string) => void;
  onMemoryDelete?: (memoryId: string) => void;
}

export function MemoriesPanel({ onMemorySelect, onMemoryDelete }: MemoriesPanelProps) {
  const {
    memories,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
  } = useMemories();

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-[var(--vscode-errorForeground)]">{error}</p>
        <Button onClick={refresh} variant="link">Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search memories..."
          isLoading={isLoading}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <LoadingSkeleton count={3} />
        ) : memories.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="No memories found"
            description={searchQuery ? "Try a different search" : "Create your first memory"}
          />
        ) : (
          memories.map(memory => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onClick={() => onMemorySelect?.(memory.id)}
              onDelete={() => onMemoryDelete?.(memory.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

### Step 4: Extract ChatPanel Component

**File:** `src/components/panels/ChatPanel.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useChatHistory } from '../../hooks/useChatHistory';
import { useMemoryContext } from '../../hooks/useMemoryContext';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AttachedMemories } from './AttachedMemories';

export function ChatPanel() {
  const { messages, addMessage, clearHistory } = useChatHistory();
  const { attachedMemories, attachMemory, detachMemory } = useMemoryContext();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachedMemories: attachedMemories.map(m => m.id),
    });

    setIsLoading(true);
    window.vscode.postMessage({
      type: 'chatQuery',
      data: { query: content, attachedMemories }
    });
  };

  // Message listener for responses
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'chatResponse') {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: event.data.data,
          timestamp: new Date(),
        });
        setIsLoading(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Attached Memories */}
      {attachedMemories.length > 0 && (
        <AttachedMemories
          memories={attachedMemories}
          onDetach={detachMemory}
        />
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        onClear={clearHistory}
      />
    </div>
  );
}
```

### Step 5: Create Context for Shared State

**File:** `src/context/IDEPanelContext.tsx`

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';

interface IDEPanelContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

const IDEPanelContext = createContext<IDEPanelContextValue | null>(null);

export function IDEPanelProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('memories');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <IDEPanelContext.Provider value={{
      isAuthenticated,
      setIsAuthenticated,
      activeTab,
      setActiveTab,
      showSettings,
      setShowSettings,
    }}>
      {children}
    </IDEPanelContext.Provider>
  );
}

export function useIDEPanel() {
  const context = useContext(IDEPanelContext);
  if (!context) throw new Error('useIDEPanel must be used within IDEPanelProvider');
  return context;
}
```

### Step 6: Refactor IDEPanel to Orchestrator

**File:** `src/components/IDEPanel.tsx` (refactored)

```typescript
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { IDEPanelProvider, useIDEPanel } from '../context/IDEPanelContext';
import { Header } from './layout/Header';
import { TabBar } from './layout/TabBar';
import { MemoriesPanel } from './panels/MemoriesPanel';
import { ChatPanel } from './panels/ChatPanel';
import { ApiKeyManager } from './ApiKeyManager';
import { SettingsPanel } from './panels/SettingsPanel';
import { AuthFlow } from './AuthFlow';

function IDEPanelContent() {
  const { isAuthenticated, logout } = useAuth();
  const { activeTab, setActiveTab, showSettings, setShowSettings } = useIDEPanel();

  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  const renderPanel = () => {
    switch (activeTab) {
      case 'memories':
        return <MemoriesPanel />;
      case 'chat':
        return <ChatPanel />;
      case 'apikeys':
        return <ApiKeyManager />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <MemoriesPanel />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--vscode-sideBar-background)]">
      <Header
        isAuthenticated={isAuthenticated}
        onSettings={() => setActiveTab('settings')}
        onLogout={logout}
        onRefresh={() => window.vscode.postMessage({ type: 'refresh' })}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        {renderPanel()}
      </div>
    </div>
  );
}

export function IDEPanel() {
  return (
    <IDEPanelProvider>
      <IDEPanelContent />
    </IDEPanelProvider>
  );
}
```

---

## File Creation Checklist

- [ ] `src/components/layout/Header.tsx`
- [ ] `src/components/layout/TabBar.tsx`
- [ ] `src/components/panels/MemoriesPanel.tsx`
- [ ] `src/components/panels/ChatPanel.tsx`
- [ ] `src/components/panels/ChatMessage.tsx`
- [ ] `src/components/panels/ChatInput.tsx`
- [ ] `src/components/panels/SettingsPanel.tsx`
- [ ] `src/context/IDEPanelContext.tsx`
- [ ] Refactor `src/components/IDEPanel.tsx`

---

## Definition of Done

- [ ] IDEPanel.tsx is under 150 lines
- [ ] Each extracted component is under 200 lines
- [ ] All functionality works as before
- [ ] No TypeScript errors
- [ ] Components are individually testable
- [ ] Props and context flow is clear
