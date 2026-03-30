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
  similarity_score?: number;
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
  const [originalMemories, setOriginalMemories] = useState<Memory[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch memories on mount
  const fetchMemories = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      const result = await client.listMemories({ limit: 50 });
      if (result.error) {
        setConnectionStatus('disconnected');
        setError(typeof result.error === 'string' ? result.error : 'Failed to fetch memories');
        return;
      }

      if (result.data?.data) {
        setMemories(result.data.data);
        setOriginalMemories(result.data.data);
        setConnectionStatus('connected');
        setError(null);
      } else {
        setConnectionStatus('disconnected');
        setError('No data received from server');
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
      } else if (input === 'l') {
        setView('list');
      } else if (input === 'c') {
        setStatusMessage('Create memory: coming soon');
        setTimeout(() => setStatusMessage(null), 3000);
      } else if (input === 'e') {
        setStatusMessage('Edit memory: coming soon');
        setTimeout(() => setStatusMessage(null), 3000);
      } else if (input === 'd') {
        setStatusMessage('Delete memory: coming soon');
        setTimeout(() => setStatusMessage(null), 3000);
      } else if (input === 'q') {
        exit();
      }
    } else if (view === 'search') {
      if (key.escape) {
        setMemories(originalMemories);
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

    if (originalMemories.length === 0 && memories.length > 0) {
      setOriginalMemories(memories);
    }

    setIsSearching(true);
    try {
      const result = await client.searchMemories({
        query,
        status: 'active',
        limit: 20,
        threshold: 0.5
      });

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Search failed');
        return;
      }

      if (result.data?.results) {
        setMemories(result.data.results.map((r: any) => ({
          ...r,
          similarity_score: r.similarity_score
        })));
        setSelectedIndex(0);
        setView('list');
        setError(null);
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
      const result: { data?: unknown; error?: string } = await client.deleteMemory(selectedMemory.id);
      if (result && 'error' in result && result.error) {
        setError(`Failed to delete memory: ${result.error}`);
        return;
      }
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
          onEdit={() => setError('Edit coming soon — use the CLI: lrepl update <id>')}
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

      {/* Status message display */}
      {statusMessage && (
        <Box marginBottom={1}>
          <Text color="yellow">
            ℹ {statusMessage}
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
