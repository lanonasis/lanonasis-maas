import React, { useState, useCallback } from 'react';
import { cn } from '../utils/cn';
import Icon from './Icon';

export interface SearchInterfaceProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({ 
  onSearch, 
  onClear, 
  isLoading = false, 
  placeholder = "Search memories...",
  className 
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onClear();
  }, [onClear]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
        isFocused 
          ? "border-[#007ACC] bg-[#2A2D2E]" 
          : "border-[#2D2D2D] bg-[#252526] hover:border-[#3C3C3C]"
      )}>
        {/* Search Icon */}
        <Icon 
          type="hash" 
          className="h-4 w-4 text-[#888888] flex-shrink-0" 
        />
        
        {/* Search Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[#CCCCCC] placeholder-[#888888] outline-none text-sm"
          disabled={isLoading}
        />
        
        {/* Loading Spinner */}
        {isLoading && (
          <div 
            role="progressbar"
            aria-label="Loading..."
            className="animate-spin h-4 w-4 border-2 border-[#007ACC] border-t-transparent rounded-full flex-shrink-0" 
          />
        )}
        
        {/* Clear Button */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded hover:bg-[#007ACC]/20 transition-colors flex-shrink-0"
            title="Clear search"
          >
            <Icon type="settings" className="h-3 w-3 text-[#888888] hover:text-[#CCCCCC]" />
          </button>
        )}
      </div>
      
      {/* Search Hint */}
      {isFocused && !query && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-[#252526] border border-[#2D2D2D] rounded-lg text-xs text-[#888888] z-10">
          <div className="space-y-1">
            <div>💡 <span className="text-[#CCCCCC]">Search tips:</span></div>
            <div>• Use keywords to find memories</div>
            <div>• Press <kbd className="px-1 py-0.5 bg-[#2D2D2D] rounded text-[#CCCCCC]">Enter</kbd> to search</div>
            <div>• Press <kbd className="px-1 py-0.5 bg-[#2D2D2D] rounded text-[#CCCCCC]">Escape</kbd> to clear</div>
          </div>
        </div>
      )}
    </form>
  );
};

export default SearchInterface;
