import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from './TextInput';

interface SearchBoxProps {
  query: string;
  onChange: (query: string) => void;
  onSearch: (query: string) => void;
  onExit: () => void;
  isSearching: boolean;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  query,
  onChange,
  onSearch,
  onExit,
  isSearching
}) => {
  useInput((input, key) => {
    if (key.escape) {
      onExit();
    } else if (key.return && query.trim()) {
      onSearch(query);
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor="green"
      paddingX={1}
      flexDirection="column"
    >
      <Box flexDirection="row" gap={1}>
        <Text color="green">🔍</Text>
        <Text bold color="white">
          Semantic Search
        </Text>
        {isSearching && (
          <Text color="yellow">⚡ Searching...</Text>
        )}
      </Box>
      
      <Box flexDirection="row" gap={1} marginTop={1}>
        <Text color="gray">Query:</Text>
        <TextInput
          value={query}
          onChange={onChange}
          placeholder="Type to search your memories..."
          focus
        />
      </Box>

      <Box flexDirection="row" gap={2} marginTop={1}>
        <Text color="gray" dimColor>
          Press Enter to search
        </Text>
        <Text color="gray" dimColor>
          ESC to cancel
        </Text>
      </Box>
    </Box>
  );
};

export default SearchBox;
