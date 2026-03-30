import React from 'react';
import { Box, Text, useInput } from 'ink';

interface Memory {
  id: string;
  title: string;
  content: string;
  memory_type: string;
  tags?: string[];
  created_at?: string;
  similarity_score?: number;
}

interface MemoryListProps {
  memories: Memory[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSelectMemory: (memory: Memory) => void;
  view: 'list' | 'search';
}

export const MemoryList: React.FC<MemoryListProps> = ({
  memories,
  selectedIndex,
  onSelect,
  onSelectMemory,
  view
}) => {
  useInput((input, key) => {
    if (memories.length === 0) return;
    const displayCount = Math.min(memories.length, 20);
    if (key.upArrow) {
      onSelect(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      const newIndexDown = Math.min(displayCount - 1, selectedIndex + 1);
      onSelect(Math.max(0, newIndexDown));
    } else if (key.return && view !== 'search') {
      if (memories[selectedIndex]) {
        onSelectMemory(memories[selectedIndex]);
      }
    }
  });

  if (memories.length === 0) {
    return (
      <Box
        borderStyle="single"
        borderColor="gray"
        padding={1}
        height="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="gray" dimColor>
          {view === 'search' ? '🔍 No search results' : '📭 No memories found'}
        </Text>
        <Text color="gray" dimColor>
          {view === 'search' 
            ? 'Try a different search query' 
            : 'Type "create" to add your first memory'}
        </Text>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="single"
      borderColor="cyan"
      flexDirection="column"
      height="100%"
      paddingY={1}
    >
      <Box paddingX={1} marginBottom={1}>
        <Text bold color="cyan">
          {view === 'search' ? '🔍 Search Results' : '📚 Recent Memories'}
        </Text>
        <Text color="gray"> ({memories.length} items)</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {memories.slice(0, 20).map((memory, index) => {
          const isSelected = index === selectedIndex;
          const relevance = typeof memory.similarity_score === 'number'
            ? Math.round(memory.similarity_score * 100)
            : null;

          return (
            <Box
              key={memory.id}
              paddingX={1}
              backgroundColor={isSelected ? 'blue' : undefined}
              flexDirection="column"
            >
              <Box flexDirection="row" gap={1}>
                <Text color={isSelected ? 'white' : 'cyan'} bold={isSelected}>
                  {isSelected ? '▶' : ' '} {memory.title}
                </Text>
                {relevance !== undefined && relevance !== null && (
                  <Text color={isSelected ? 'yellow' : 'green'}>
                    ({relevance}%)
                  </Text>
                )}
              </Box>
              
              <Box flexDirection="row" gap={1} marginLeft={2}>
                <Text 
                  color={isSelected ? 'gray' : 'white'} 
                  dimColor={!isSelected}
                  wrap="truncate-end"
                >
                  {memory.content.substring(0, 80)}
                  {memory.content.length > 80 ? '...' : ''}
                </Text>
              </Box>

              {memory.tags && memory.tags.length > 0 && (
                <Box flexDirection="row" gap={1} marginLeft={2}>
                  {memory.tags.slice(0, 3).map((tag, tagIndex) => (
                    <Text 
                      key={tagIndex} 
                      color={isSelected ? 'yellow' : 'magenta'}
                      dimColor={!isSelected}
                    >
                      #{tag}
                    </Text>
                  ))}
                </Box>
              )}
              
              {index < Math.min(memories.length, 20) - 1 && (
                <Box marginY={1}>
                  <Text color="gray" dimColor>
                    {'─'.repeat(60)}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
        
        {memories.length > 20 && (
          <Box paddingX={1} marginTop={1}>
            <Text color="gray" dimColor>
              ... and {memories.length - 20} more memories
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MemoryList;
