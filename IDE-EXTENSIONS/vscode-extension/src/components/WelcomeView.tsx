import React from 'react';
import { Lightbulb, Globe } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';

export interface WelcomeViewProps {
  onLogin: (mode?: 'oauth' | 'apikey') => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onLogin }) => {
  return (
    <div className="p-4 space-y-6 select-none">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--vscode-editor-foreground)]">
          Welcome to LanOnasis Memory
        </h2>
        <p className="text-[13px] text-[var(--vscode-descriptionForeground)] leading-relaxed">
          Authenticate to access synchronized context and scoped API keys.
        </p>
        <div className="space-y-2 pt-2">
          <Button
            className="w-full vscode-button"
            onClick={() => onLogin('oauth')}
            data-testid="btn-connect-browser"
          >
            Connect in Browser
          </Button>
          <Button
            className="w-full vscode-button vscode-button-secondary"
            onClick={() => onLogin('apikey')}
            data-testid="btn-enter-key"
          >
            Enter API Key
          </Button>
        </div>
      </div>
      <Separator className="bg-[var(--vscode-panel-border)]" />
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold text-[var(--vscode-editor-foreground)] uppercase opacity-80">
          Features
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Lightbulb className="h-4 w-4 text-[var(--vscode-button-background)] mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">
                Intelligent Memory
              </h4>
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)] leading-relaxed opacity-80">
                Vector search and semantic understanding for your codebase.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Globe className="h-4 w-4 text-[var(--vscode-button-background)] mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">
                Real-time Sync
              </h4>
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)] leading-relaxed opacity-80">
                Synchronized context across all your devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

