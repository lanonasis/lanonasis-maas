import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  mode: 'remote' | 'local';
  memoryCount?: number;
  userName?: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  currentView: 'list' | 'search' | 'detail' | 'help';
}

export const StatusBar: React.FC<StatusBarProps> = ({
  mode,
  memoryCount = 0,
  userName,
  connectionStatus,
  currentView
}) => {
  const statusColor = {
    connected: 'green',
    disconnected: 'red',
    connecting: 'yellow'
  }[connectionStatus];

  const statusIcon = {
    connected: '●',
    disconnected: '○',
    connecting: '◐'
  }[connectionStatus];

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      height={3}
      flexDirection="row"
      justifyContent="space-between"
    >
      <Box flexDirection="row" gap={2}>
        <Text color="cyan" bold>
          🧠 LZero
        </Text>
        <Text color="gray">|</Text>
        <Text color={statusColor as any}>
          {statusIcon} {connectionStatus}
        </Text>
        <Text color="gray">|</Text>
        <Text color="white">
          Mode: {mode === 'remote' ? '🌐 Remote' : '💻 Local'}
        </Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text color="yellow">
          📚 {memoryCount} memories
        </Text>
        <Text color="gray">|</Text>
        <Text color="blue">
          👤 {userName || 'Guest'}
        </Text>
        <Text color="gray">|</Text>
        <Text color="magenta">
          📍 {currentView}
        </Text>
      </Box>
    </Box>
  );
};

export default StatusBar;
