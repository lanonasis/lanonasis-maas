import React from 'react';
import { Box, Text, useInput } from 'ink';

interface Memory {
  id: string;
  title: string;
  content: string;
  memory_type: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

interface MemoryDetailProps {
  memory: Memory;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MemoryDetail: React.FC<MemoryDetailProps> = ({
  memory,
  onBack,
  onEdit,
  onDelete
}) => {
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
    } else if (input === 'e') {
      onEdit();
    } else if (input === 'd') {
      onDelete();
    }
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Box
      borderStyle="double"
      borderColor="cyan"
      padding={1}
      flexDirection="column"
      height="100%"
    >
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan" wrap="wrap">
          📄 {memory.title}
        </Text>
        <Text color="gray">
          ID: {memory.id.substring(0, 8)}...
        </Text>
      </Box>

      <Box flexDirection="row" gap={2} marginBottom={1}>
        <Text color="yellow">
          Type: {memory.memory_type}
        </Text>
        <Text color="gray">|</Text>
        <Text color="green">
          Created: {formatDate(memory.created_at)}
        </Text>
        {memory.updated_at !== memory.created_at && (
          <>
            <Text color="gray">|</Text>
            <Text color="blue">
              Updated: {formatDate(memory.updated_at)}
            </Text>
          </>
        )}
      </Box>

      {memory.tags && memory.tags.length > 0 && (
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color="gray">Tags:</Text>
          {memory.tags.map((tag, index) => (
            <Text key={index} color="magenta">
              #{tag}
            </Text>
          ))}
        </Box>
      )}

      <Box marginY={1}>
        <Text color="gray">
          {'─'.repeat(70)}
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        <Text color="white" wrap="wrap">
          {memory.content}
        </Text>
      </Box>

      <Box marginY={1}>
        <Text color="gray">
          {'─'.repeat(70)}
        </Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text color="gray">
          [<Text color="yellow">q</Text>/<Text color="yellow">ESC</Text>] Back
        </Text>
        <Text color="gray">
          [<Text color="yellow">e</Text>] Edit
        </Text>
        <Text color="gray">
          [<Text color="red">d</Text>] Delete
        </Text>
      </Box>
    </Box>
  );
};

export default MemoryDetail;
