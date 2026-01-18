import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Search,
  MousePointerClick,
  Globe,
  KeyRound
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '../utils/cn';
import type { OnboardingStatus, OnboardingStepId } from '../hooks/useOnboarding';

interface OnboardingPanelProps {
  status: OnboardingStatus;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  onLogin: (mode?: 'oauth' | 'apikey') => void;
  onCreateSampleMemory: () => void;
  onSearchMemories: () => void;
  onStartTour: () => void;
  onSkip: () => void;
}

export const OnboardingPanel: React.FC<OnboardingPanelProps> = ({
  status,
  isAuthenticated,
  isAuthLoading,
  onLogin,
  onCreateSampleMemory,
  onSearchMemories,
  onStartTour,
  onSkip
}) => {
  const progressPercent = useMemo(() => {
    if (!status.totalCount) return 0;
    return Math.round((status.completedCount / status.totalCount) * 100);
  }, [status.completedCount, status.totalCount]);

  const steps = useMemo(() => {
    return [
      {
        id: 'authenticate' as OnboardingStepId,
        title: 'Connect your account',
        description: 'Sign in with OAuth or add an API key to sync your memories.',
        completed: status.state.completedSteps.includes('authenticate'),
        action: isAuthenticated ? undefined : () => onLogin('oauth'),
        actionLabel: isAuthenticated ? 'Connected' : 'Connect in Browser'
      },
      {
        id: 'create_memory' as OnboardingStepId,
        title: 'Create a sample memory',
        description: 'Seed your memory bank with a starter example.',
        completed: status.state.completedSteps.includes('create_memory'),
        action: onCreateSampleMemory,
        actionLabel: 'Create sample'
      },
      {
        id: 'search' as OnboardingStepId,
        title: 'Search for context',
        description: 'Run a quick semantic search to see matching memories.',
        completed: status.state.completedSteps.includes('search'),
        action: onSearchMemories,
        actionLabel: 'Search now'
      },
      {
        id: 'tour' as OnboardingStepId,
        title: 'Take the quick tour',
        description: 'Explore key features and command shortcuts.',
        completed: status.state.completedSteps.includes('tour'),
        action: onStartTour,
        actionLabel: 'Start tour'
      }
    ];
  }, [isAuthenticated, onCreateSampleMemory, onLogin, onSearchMemories, onStartTour, status.state.completedSteps]);

  return (
    <div className="mx-3 my-3 rounded-lg border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] shadow-sm">
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--vscode-button-background)]" />
              <h2 className="text-[13px] font-semibold text-[var(--vscode-editor-foreground)]">
                Getting started
              </h2>
            </div>
            <p className="text-[12px] text-[var(--vscode-descriptionForeground)]">
              Complete these steps to unlock your memory workspace.
            </p>
          </div>
          <div className="text-[11px] font-medium text-[var(--vscode-descriptionForeground)]">
            {status.completedCount}/{status.totalCount} done
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-md border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--vscode-button-background)]/20 via-transparent to-[var(--vscode-button-background)]/20 animate-pulse" />
            <div className="relative z-10 p-3">
              <p className="text-[11px] font-medium text-[var(--vscode-editor-foreground)]">
                Quick preview
              </p>
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                Capture context, search instantly, and attach memories to chat.
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--vscode-editorGroup-border)]">
            <div
              className="h-1.5 rounded-full bg-[var(--vscode-button-background)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--vscode-descriptionForeground)]">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        <div className="rounded-md border border-[var(--vscode-panel-border)] bg-[var(--vscode-textBlockQuote-background)] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">
                Authentication guide
              </p>
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                Choose OAuth for one-click sign in or paste a scoped API key.
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">Secure</Badge>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              className="w-full vscode-button"
              onClick={() => onLogin('oauth')}
              disabled={isAuthLoading || isAuthenticated}
              aria-busy={isAuthLoading}
            >
              <span className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                {isAuthenticated ? 'Connected' : isAuthLoading ? 'Connecting…' : 'Connect in Browser'}
                <Badge variant="outline" className="ml-auto text-[9px]">Recommended</Badge>
              </span>
            </Button>
            <Button
              className="w-full vscode-button vscode-button-secondary"
              onClick={() => onLogin('apikey')}
              disabled={isAuthLoading || isAuthenticated}
              aria-busy={isAuthLoading}
            >
              <span className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" />
                {isAuthenticated ? 'Connected' : isAuthLoading ? 'Validating…' : 'Enter API Key'}
                <Badge variant="outline" className="ml-auto text-[9px]">Manual</Badge>
              </span>
            </Button>
            <a
              className="block text-[11px] text-[#4FA3FF] hover:underline text-center"
              href="https://docs.lanonasis.com/api-keys"
              target="_blank"
              rel="noreferrer noopener"
            >
              Get API Key (docs)
            </a>
            {isAuthenticated && (
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)] text-center">
                Connected. Next, create a sample memory to get started.
              </p>
            )}
          </div>
        </div>

        <Separator className="bg-[var(--vscode-panel-border)]" />

        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-3 rounded-md border px-3 py-2',
                step.completed
                  ? 'border-transparent bg-[var(--vscode-inputValidation-infoBackground)]/40'
                  : 'border-[var(--vscode-panel-border)]'
              )}
            >
              <div className="mt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--vscode-testing-iconPassed)]" />
                ) : step.id === 'search' ? (
                  <Search className="h-4 w-4 text-[var(--vscode-button-background)]" />
                ) : step.id === 'create_memory' ? (
                  <MousePointerClick className="h-4 w-4 text-[var(--vscode-button-background)]" />
                ) : step.id === 'tour' ? (
                  <Sparkles className="h-4 w-4 text-[var(--vscode-button-background)]" />
                ) : (
                  <KeyRound className="h-4 w-4 text-[var(--vscode-button-background)]" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">
                    {step.title}
                  </p>
                  {step.completed && (
                    <Badge variant="outline" className="text-[9px]">Done</Badge>
                  )}
                </div>
                <p className="text-[11px] text-[var(--vscode-descriptionForeground)]">
                  {step.description}
                </p>
                {step.action && !step.completed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-6 text-[11px]"
                    onClick={step.action}
                  >
                    {step.actionLabel}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--vscode-descriptionForeground)]">
          <span>Need a break? You can come back anytime.</span>
          <button
            className="text-[11px] text-[var(--vscode-textLink-foreground)] hover:underline"
            onClick={onSkip}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
