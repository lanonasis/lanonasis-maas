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

  useEffect(() => {
    setCursorOffset(prev => Math.min(prev, value.length));
  }, [value]);

  useInput((input, key) => {
    if (!focus) return;

    if (key.leftArrow) {
      setCursorOffset(Math.max(0, cursorOffset - 1));
    } else if (key.rightArrow) {
      setCursorOffset(Math.min(value.length, cursorOffset + 1));
    } else if (key.backspace) {
      if (cursorOffset > 0) {
        const newValue = value.slice(0, cursorOffset - 1) + value.slice(cursorOffset);
        onChange(newValue);
        setCursorOffset(cursorOffset - 1);
      }
    } else if (key.delete) {
      if (cursorOffset < value.length) {
        const newValue = value.slice(0, cursorOffset) + value.slice(cursorOffset + 1);
        onChange(newValue);
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

  const left = displayValue.slice(0, cursorOffset);
  const right = displayValue.slice(cursorOffset);

  return (
    <Text color={focus ? 'white' : 'gray'}>
      {left}
      {focus && <Text color="green">█</Text>}
      {right}
    </Text>
  );
};

export default TextInput;
