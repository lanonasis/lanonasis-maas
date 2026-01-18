import React from 'react';
import { Lightbulb, Globe, Sparkles, Layers, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';

export interface WelcomeViewProps {
  onLogin: (mode?: 'oauth' | 'apikey') => void;
  isLoading?: boolean;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onLogin, isLoading }) => {
  return (
    <div className="p-4 space-y-5 select-none">
      <div className="relative overflow-hidden rounded-lg border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--vscode-button-background)]/15 via-transparent to-[var(--vscode-button-background)]/10" />
        <div className="relative p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--vscode-button-background)]" />
            <h2 className="text-[13px] font-semibold text-[var(--vscode-editor-foreground)]">
              Welcome to LanOnasis Memory
            </h2>
          </div>
          <p className="text-[12px] text-[var(--vscode-descriptionForeground)] leading-relaxed">
            Capture decisions, recall context, and sync your knowledge across IDEs.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['Capture', 'Search', 'Reuse'].map((label) => (
              <div
                key={label}
                className="rounded-md border border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBar-background)] px-2 py-2"
              >
                <div className="text-[10px] uppercase tracking-wide text-[var(--vscode-descriptionForeground)]">
                  {label}
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--vscode-editorGroup-border)]" />
                <div className="mt-1 h-1 w-2/3 rounded-full bg-[var(--vscode-button-background)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[12px] text-[var(--vscode-descriptionForeground)]">
          Authenticate to access synchronized context and scoped API keys.
        </p>
        <div className="space-y-2">
          <Button
            className="w-full vscode-button"
            onClick={() => onLogin('oauth')}
            disabled={isLoading}
            data-testid="btn-connect-browser"
            aria-busy={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect in Browser'}
          </Button>
          <Button
            className="w-full vscode-button vscode-button-secondary"
            onClick={() => onLogin('apikey')}
            disabled={isLoading}
            data-testid="btn-enter-key"
            aria-busy={isLoading}
          >
            {isLoading ? 'Validating...' : 'Enter API Key'}
          </Button>
          <a
            className="block text-[12px] text-[#4FA3FF] hover:underline text-center"
            href="https://docs.lanonasis.com/api-keys"
            target="_blank"
            rel="noreferrer noopener"
          >
            Get API Key (docs)
          </a>
        </div>
      </div>

      <Separator className="bg-[var(--vscode-panel-border)]" />

      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-[var(--vscode-editor-foreground)] uppercase opacity-80">
          Highlights
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
          <div className="flex gap-3">
            <Layers className="h-4 w-4 text-[var(--vscode-button-background)] mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">
                Structured Context
              </h4>
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)] leading-relaxed opacity-80">
                Keep decisions, snippets, and knowledge organized by type.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Zap className="h-4 w-4 text-[var(--vscode-button-background)] mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">
                Fast Capture
              </h4>
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)] leading-relaxed opacity-80">
                Save selections or clipboard content without leaving your editor.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-[var(--vscode-panel-border)]" />

      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-[var(--vscode-editor-foreground)] uppercase opacity-80">
          Tutorials
        </h3>
        <div className="space-y-2">
          {[
            { title: 'Quick Start', duration: '2 min', href: 'https://docs.lanonasis.com/videos#quick-start' },
            { title: 'Feature Overview', duration: '5 min', href: 'https://docs.lanonasis.com/videos#overview' },
            { title: 'Deep Dive', duration: '10 min', href: 'https://docs.lanonasis.com/videos#deep-dive' },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBar-background)] px-3 py-2"
            >
              <div className="space-y-0.5">
                <p className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">
                  {item.title}
                </p>
                <p className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                  {item.duration} walkthrough
                </p>
              </div>
              <a
                className="vscode-button px-3 py-1 text-[11px] text-center"
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                Watch
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
