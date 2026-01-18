import React from 'react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search memories...',
  disabled = false,
}: SearchBarProps) => {
  return (
    <div className="relative mb-3" data-tour="search">
      <Input
        placeholder={placeholder}
        className="vscode-input h-7 text-[13px] pl-2"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-label={placeholder}
        data-testid="input-search"
      />
    </div>
  );
};
