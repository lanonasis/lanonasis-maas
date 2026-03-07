import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MemoryClient, createMemoryClient } from '@lanonasis/memory-client';
import { ReplConfig } from '../config/types.js';
import StatusBar from './components/StatusBar.js';
import MemoryList from './components/MemoryList.js';
import MemoryDetail from './components/MemoryDetail.js';
import SearchBox from './components/SearchBox.js';
import HelpOverlay from './components/HelpOverlay.js';

interface Memory {
  id: string;
  title: string;
  content: string;
  memory_type: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  similarity?: number;
}

type View = 'list' | 'search' | 'detail' | 'help';

interface DashboardAppProps {
  config: ReplConfig;
}

export const DashboardApp: React.FC<DashboardAppProps> = ({ config }) => {
  const { exit } = useApp();
  const [client] = useState(() => createMemoryClient({
    apiUrl: config.apiUrl,
    authToken: config.authToken,
    timeout: 30000
  }));

  const [view, setView] = useState<View>('list');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [error, setError] = useState<string | null>(null);

  // Fetch memories on mount
  const fetchMemories = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      const result = await client.listMemories({ limit: 50 });
      if (result.data?.data) {
        setMemories(result.data.data);
        setConnectionStatus('connected');
        setError(null);
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setError('Failed to fetch memories');
    }
  }, [client]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Handle global keyboard shortcuts
  useInput((input, key) => {
    // Global shortcuts that work in any view
    if (input === '?' && view !== 'help') {
      setView('help');
      return;
    }

    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    // View-specific shortcuts
    if (view === 'list') {
      if (input === '/') {
        setView('search');
      } else if (input === 'r') {
        fetchMemories();
      } else if (input === 'q') {
        exit();
      }
    } else if (view === 'search') {
      if (key.escape) {
        setView('list');
        setSearchQuery('');
      }
    } else if (view === 'detail') {
      if (key.escape || input === 'q') {
        setView('list');
        setSelectedMemory(null);
      }
    }
  });

  // Handle memory selection
  const handleSelectMemory = (memory: Memory) => {
    setSelectedMemory(memory);
    setView('detail');
  };

  // Handle search
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const result = await client.searchMemories({
        query,
        status: 'active',
        limit: 20,
        threshold: 0.5
      });
      
      if (result.data?.results) {
        setMemories(result.data.results.map((r: any) => ({
          ...r,
          similarity: r.similarity
        })));
        setSelectedIndex(0);
        setView('list');
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle memory deletion
  const handleDelete = async () => {
    if (!selectedMemory) return;
    
    try {
      await client.deleteMemory(selectedMemory.id);
      setView('list');
      setSelectedMemory(null);
      await fetchMemories();
    } catch (err) {
      setError('Failed to delete memory');
    }
  };

  // Render main content based on view
  const renderContent = () => {
    if (view === 'help') {
      return (
        <HelpOverlay onClose={() => setView('list')} />
      );
    }

    if (view === 'detail' && selectedMemory) {
      return (
        <MemoryDetail
          memory={selectedMemory}
          onBack={() => {
            setView('list');
            setSelectedMemory(null);
          }}
          onEdit={() => {/* TODO: Implement edit */}}
          onDelete={handleDelete}
        />
      );
    }

    if (view === 'search') {
      return (
        <Box flexDirection="column" height="100%">
          <SearchBox
            query={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            onExit={() => {
              setView('list');
              setSearchQuery('');
            }}
            isSearching={isSearching}
          />
          <Box flexGrow={1} marginTop={1}>
            <MemoryList
              memories={memories}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onSelectMemory={handleSelectMemory}
              view="search"
            />
          </Box>
        </Box>
      );
    }

    // Default list view
    return (
      <MemoryList
        memories={memories}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onSelectMemory={handleSelectMemory}
        view="list"
      />
    );
  };

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan" backgroundColor="blue">
          {' '}🧠 LZero Memory Dashboard {' '}
        </Text>
        <Text color="gray"> — Your Second Brain</Text>
      </Box>

      {/* Error display */}
      {error && (
        <Box marginBottom={1}>
          <Text color="red" bold>
            ⚠️ {error}
          </Text>
        </Box>
      )}

      {/* Main content area */}
      <Box flexGrow={1} flexDirection="column">
        {renderContent()}
      </Box>

      {/* Status bar */}
      <Box marginTop={1}>
        <StatusBar
          mode={config.useMCP ? 'local' : 'remote'}
          memoryCount={memories.length}
          userName={config.userContext?.name || config.userProfile?.name}
          connectionStatus={connectionStatus}
          currentView={view}
        />
      </Box>

      {/* Footer hints */}
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Text color="gray" dimColor>
          Press <Text color="yellow">?</Text> for help
        </Text>
        <Text color="gray" dimColor>
          <Text color="yellow">/</Text> to search
        </Text>
        <Text color="gray" dimColor>
          <Text color="yellow">q</Text> to quit
        </Text>
      </Box>
    </Box>
  );
};

export default DashboardApp;
