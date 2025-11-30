import React from 'react';
import Button from '@/components/ui/Button';
import { Send } from 'lucide-react';

interface ChatInterfaceProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (query: string) => void;
  isAuthenticated: boolean;
  disabled?: boolean;
  isLoading?: boolean;
}

function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export const ChatInterface = ({
  value,
  onChange,
  onSend,
  isAuthenticated,
  disabled = false,
  isLoading = false,
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
              isAuthenticated ? 'Refine context...' : 'Connect to chat'
            }
            disabled={!isAuthenticated || disabled || isLoading}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[40px] bg-transparent border-none text-[13px] text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            data-testid="textarea-chat"
          />
        </div>
        <div className="absolute left-2 bottom-1.5 flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-[var(--vscode-icon-foreground)] hover:bg-[var(--vscode-list-hoverBackground)] rounded-[2px]"
            disabled={!isAuthenticated || disabled}
            data-testid="btn-attach"
          >
            <PaperclipIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="absolute right-2 bottom-1.5">
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
    </div>
  );
};

