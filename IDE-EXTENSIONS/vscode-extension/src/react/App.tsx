import React, { useState, useEffect, useCallback } from 'react';
import MemoryCard from '../components/MemoryCard';
import SearchInterface from '../components/SearchInterface';
import AuthFlow from '../components/AuthFlow';
import Button from '../components/ui/Button';
import type { PrototypeMemory } from '../bridges/PrototypeUIBridge';

// Simple icon components (only used ones)
const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// VS Code message types
interface VSCodeMessage {
  type: string;
  data?: unknown;
}

const App: React.FC = () => {
  const [memories, setMemories] = useState<PrototypeMemory[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const [_selectedMemory, _setSelectedMemory] = useState<PrototypeMemory | null>(null);

  // Note: selectedMemory is reserved for future memory selection UI features
  // Currently unused but kept for planned enhancements

  // Send messages to VS Code extension
  const postMessage = (type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as VSCodeMessage;
      
      switch (message.type) {
        case 'authState':
          if (message.data && typeof message.data === 'object' && 'authenticated' in message.data) {
            setIsAuthenticated((message.data as { authenticated: boolean }).authenticated);
            setError((message.data as { error?: string }).error || null);
          }
          break;
        case 'memories':
          if (Array.isArray(message.data)) {
            setMemories(message.data as PrototypeMemory[]);
          }
          break;
        case 'memory':
          if (message.data && typeof message.data === 'object') {
            _setSelectedMemory(message.data as PrototypeMemory);
          }
          break;
        case 'error':
          setError(typeof message.data === 'string' ? message.data : 'Unknown error');
          setIsLoading(false);
          setIsSearching(false);
          break;
        case 'loading':
          setIsLoading(typeof message.data === 'boolean' ? message.data : true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Request initial data
  useEffect(() => {
    postMessage('getAuthState');
    postMessage('getMemories');
  }, []);

  // Search functionality
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setError(null);
    postMessage('searchMemories', query);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setError(null);
    postMessage('getMemories');
  }, []);

  // Authentication
  const handleLogin = useCallback(() => {
    setError(null);
    postMessage('authenticate');
  }, []);

  const handleLogout = useCallback(() => {
    postMessage('logout');
  }, []);

  // Memory selection
  const handleMemorySelect = useCallback((memory: PrototypeMemory) => {
    // TODO: Implement memory selection UI in future version
    console.log('Memory selected:', memory.id);
    postMessage('selectMemory', memory.id);
  }, []);

  // Refresh memories
  const handleRefresh = useCallback(() => {
    setError(null);
    setIsLoading(true);
    postMessage('getMemories');
  }, []);

  // Create memory
  const handleCreateMemory = useCallback(() => {
    postMessage('createMemory', {
      title: 'New Memory',
      content: 'Created from enhanced UI',
      memory_type: 'context',
      tags: ['enhanced-ui']
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-[#1E1E1E]">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-[#007ACC] border-t-transparent rounded-full mx-auto" />
          <p className="text-[#888888] text-sm">Loading Lanonasis Memory...</p>
        </div>
      </div>
    );
  }

  // Authentication required
  if (!isAuthenticated) {
    return (
      <div className="h-full bg-[#1E1E1E] text-[#CCCCCC] font-sans">
        <div className="p-4">
          <AuthFlow
            isAuthenticated={false}
            isLoading={isLoading}
            onLogin={handleLogin}
            error={error}
          />
        </div>
      </div>
    );
  }

  // Main authenticated view
  return (
    <div className="h-full bg-[#1E1E1E] text-[#CCCCCC] font-sans">
      <div className="border-b border-[#2D2D2D] p-4 space-y-3">
        <AuthFlow
          isAuthenticated={true}
          isLoading={false}
          onLogin={handleLogin}
          onLogout={handleLogout}
          error={error}
          className="mb-4"
        />
        
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#CCCCCC]">Memory Assistant</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-8 w-8 text-[#888888] hover:text-[#CCCCCC]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <SearchInterface
          onSearch={handleSearch}
          onClear={handleClearSearch}
          isLoading={isSearching}
          placeholder="Search memories..."
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#888888]">
            {memories.length} memories found
          </h2>
          <Button
            onClick={handleCreateMemory}
            className="bg-[#007ACC] hover:bg-[#005A9E] text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Memory
          </Button>
        </div>

        {memories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#888888] text-sm">
              {searchQuery ? 'No memories found matching your search.' : 'No memories yet. Create your first memory to get started.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                id={memory.id}
                title={memory.title}
                type={memory.type}
                date={memory.date}
                tags={memory.tags}
                content={memory.content}
                iconType={memory.iconType}
                onSelect={() => handleMemorySelect(memory)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
