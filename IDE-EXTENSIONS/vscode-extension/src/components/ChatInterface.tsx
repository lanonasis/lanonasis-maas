import React from 'react';
import Button from '@/components/ui/Button';
import { Send, Paperclip, ClipboardPaste } from 'lucide-react';

interface ChatInterfaceProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (query: string) => void;
  isAuthenticated: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  attachedCount?: number;
  onPaste?: () => void;
}

export const ChatInterface = ({
  value,
  onChange,
  onSend,
  isAuthenticated,
  disabled = false,
  isLoading = false,
  attachedCount = 0,
  onPaste,
}: ChatInterfaceProps) => {
  const handleSend = () => {
    if (value.trim() && isAuthenticated && !disabled && !isLoading) {
      onSend(value.trim());
      onChange(''); // Clear input after sending
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 bg-[var(--vscode-sideBar-background)] border-t border-[var(--vscode-panel-border)]">
      <div className="relative bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] focus-within:border-[var(--vscode-focusBorder)] rounded-[2px] transition-colors">
        <div className="p-2 pb-8">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={
              isAuthenticated 
                ? attachedCount > 0 
                  ? `Ask about ${attachedCount} attached memor${attachedCount > 1 ? 'ies' : 'y'}...`
                  : 'Ask a question or search memories...' 
                : 'Connect to start chatting'
            }
            disabled={!isAuthenticated || disabled || isLoading}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[40px] bg-transparent border-none text-[13px] text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            data-testid="textarea-chat"
          />
        </div>
        <div className="absolute left-2 bottom-1.5 flex gap-1">
          {/* Context indicator */}
          {attachedCount > 0 && (
            <div className="flex items-center gap-1 px-1.5 h-6 rounded-[2px] bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] text-[10px]">
              <Paperclip className="h-3 w-3" />
              <span>{attachedCount}</span>
            </div>
          )}
          
          {/* Paste from clipboard button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-[var(--vscode-icon-foreground)] hover:bg-[var(--vscode-list-hoverBackground)] rounded-[2px]"
            disabled={!isAuthenticated || disabled}
            onClick={onPaste}
            title="Paste from clipboard to create memory"
            data-testid="btn-paste"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
          {/* Character count for long messages */}
          {value.length > 100 && (
            <span className="text-[10px] text-[var(--vscode-descriptionForeground)] opacity-60 mr-1">
              {value.length}
            </span>
          )}
          
          <Button
            size="icon"
            className="h-6 w-6 bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)] text-[var(--vscode-button-foreground)] rounded-[2px] disabled:opacity-50"
            disabled={!isAuthenticated || disabled || isLoading || !value.trim()}
            onClick={handleSend}
            data-testid="btn-send"
          >
            {isLoading ? (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Help text */}
      <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--vscode-descriptionForeground)] opacity-60">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span>⌘⇧S to quick capture</span>
      </div>
    </div>
  );
};

