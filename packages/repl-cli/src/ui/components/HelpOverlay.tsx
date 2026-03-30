import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HelpOverlayProps {
  onClose: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === 'q' || input === '?') {
      onClose();
    }
  });

  return (
    <Box
      borderStyle="double"
      borderColor="yellow"
      padding={1}
      flexDirection="column"
      height="100%"
    >
      <Box justifyContent="center">
        <Text bold color="yellow">
          🌟 LZero Dashboard - Keyboard Shortcuts
        </Text>
      </Box>

      <Box marginY={1}>
        <Text color="gray">
          {'─'.repeat(70)}
        </Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        <Text bold color="cyan">Navigation</Text>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">↑/↓</Text>
          <Text color="white">Navigate memories</Text>
        </Box>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">Enter</Text>
          <Text color="white">Select/open memory</Text>
        </Box>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">ESC/q</Text>
          <Text color="white">Go back / Exit</Text>
        </Box>

        <Box marginY={1} />

        <Text bold color="cyan">Views</Text>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">l</Text>
          <Text color="white">List all memories</Text>
        </Box>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">/</Text>
          <Text color="white">Search memories</Text>
        </Box>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">r</Text>
          <Text color="white">Refresh list</Text>
        </Box>

        <Box marginY={1} />

        <Text bold color="cyan">Actions</Text>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">c</Text>
          <Text color="white">Create new memory</Text>
        </Box>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">e</Text>
          <Text color="white">Edit selected memory</Text>
        </Box>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">d</Text>
          <Text color="red">Delete selected memory</Text>
        </Box>

        <Box marginY={1} />

        <Text bold color="cyan">Other</Text>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">?</Text>
          <Text color="white">Toggle this help</Text>
        </Box>
        <Box flexDirection="row" gap={4}>
          <Text color="gray">Ctrl+C</Text>
          <Text color="white">Exit dashboard</Text>
        </Box>
      </Box>

      <Box marginY={1}>
        <Text color="gray">
          {'─'.repeat(70)}
        </Text>
      </Box>

      <Box justifyContent="center">
        <Text color="gray">
          Press <Text color="yellow">ESC</Text> or <Text color="yellow">q</Text> to close
        </Text>
      </Box>
    </Box>
  );
};

export default HelpOverlay;
