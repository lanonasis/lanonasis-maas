import React, { useState, useEffect } from 'react';
import { Text, useInput } from 'ink';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
  mask?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder = '',
  focus = true,
  mask
}) => {
  const [cursorOffset, setCursorOffset] = useState(0);

  useInput((input, key) => {
    if (!focus) return;

    if (key.leftArrow) {
      setCursorOffset(Math.max(0, cursorOffset - 1));
    } else if (key.rightArrow) {
      setCursorOffset(Math.min(value.length, cursorOffset + 1));
    } else if (key.backspace || key.delete) {
      if (cursorOffset > 0) {
        const newValue = value.slice(0, cursorOffset - 1) + value.slice(cursorOffset);
        onChange(newValue);
        setCursorOffset(cursorOffset - 1);
      }
    } else if (input && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorOffset) + input + value.slice(cursorOffset);
      onChange(newValue);
      setCursorOffset(cursorOffset + input.length);
    }
  });

  const displayValue = mask 
    ? mask.repeat(value.length) 
    : value;

  if (!value && placeholder) {
    return (
      <Text color="gray" dimColor>
        {placeholder}
      </Text>
    );
  }

  // Simple display without cursor positioning for now
  // Full cursor support would require more complex logic
  return (
    <Text color={focus ? 'white' : 'gray'}>
      {displayValue}
      {focus && <Text color="green">█</Text>}
    </Text>
  );
};

export default TextInput;
