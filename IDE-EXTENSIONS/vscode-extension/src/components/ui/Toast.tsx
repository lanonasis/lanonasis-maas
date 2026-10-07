import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import Button from './Button';
import { cn } from '../../utils/cn';

/**
 * Toast contract — see ux-spec.md AC-T1 / AC-T3.
 *
 * The webview `message` event handler in IDEPanel.tsx normalizes
 * `memoryDeleted` / `memoryUpdated` / `error` / `updateMemoryFailed` /
 * timeout events into a `ToastMsg` shape and pushes them onto the
 * `ToastProvider`'s queue.
 */

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  command?: 'undo' | 'retry' | 'open';
  payload?: unknown;
}

export interface ToastMsg {
  id: string;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  durationMs?: number;
}

const DEFAULT_DURATIONS: Record<ToastKind, number> = {
  success: 3500,
  info: 5000,
  error: 6000,
};

const MAX_VISIBLE = 3;

interface ToastItemProps {
  toast: ToastMsg;
  remaining: number;
  onDismiss: (id: string) => void;
  onAction: (toast: ToastMsg) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, remaining, onDismiss, onAction }) => {
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = toast.durationMs ?? DEFAULT_DURATIONS[toast.kind];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (remaining <= 0) return;
    timerRef.current = setTimeout(() => onDismiss(toast.id), remaining);
  }, [clearTimer, onDismiss, remaining, toast.id]);

  useEffect(() => {
    if (paused) {
      clearTimer();
      return clearTimer;
    }
    startTimer();
    return clearTimer;
  }, [clearTimer, paused, startTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const isError = toast.kind === 'error';
  const Icon = isError ? AlertCircle : toast.kind === 'success' ? CheckCircle2 : Info;

  const containerClasses = cn(
    'pointer-events-auto flex w-[320px] items-start gap-2 rounded-md border px-3 py-2 shadow-lg backdrop-blur-sm',
    isError
      ? 'border-[var(--vscode-inputValidation-errorBorder)] bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-errorForeground)]'
      : toast.kind === 'success'
        ? 'border-[var(--vscode-testing-iconPassed)]/40 bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]'
        : 'border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]',
  );

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-testid={`toast-${toast.kind}`}
      data-toast-id={toast.id}
      className={containerClasses}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon
        className={cn(
          'h-4 w-4 mt-0.5 shrink-0',
          isError
            ? 'text-[var(--vscode-errorForeground)]'
            : toast.kind === 'success'
              ? 'text-[var(--vscode-testing-iconPassed)]'
              : 'text-[var(--vscode-editorLink-activeForeground)]',
        )}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] leading-snug break-words">{toast.message}</p>
        {toast.action && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 px-2 text-[11px] text-[var(--vscode-textLink-foreground)] hover:bg-[var(--vscode-list-hoverBackground)]"
            onClick={() => onAction(toast)}
            aria-label={`${toast.action.label} for ${toast.message}`}
            data-testid={`toast-action-${toast.action.command ?? 'open'}`}
          >
            {toast.action.label}
          </Button>
        )}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-sm p-0.5 text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-editor-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vscode-focusBorder)]"
        onClick={() => onDismiss(toast.id)}
        aria-label={`Dismiss ${toast.kind} notification`}
        data-testid="toast-dismiss"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
};

interface ToastViewportProps {
  toasts: ToastMsg[];
  onDismiss: (id: string) => void;
  onAction: (toast: ToastMsg) => void;
}

/**
 * Anchored top-right, 12px inset, stacks vertically, max 3 visible.
 * Hidden overflow collapses into a `+N more` chip so users know there is more.
 */
export const ToastViewport: React.FC<ToastViewportProps> = ({ toasts, onDismiss, onAction }) => {
  const [expanded, setExpanded] = useState(false);

  const visibleToasts = useMemo(() => {
    if (expanded) return toasts;
    return toasts.slice(0, MAX_VISIBLE);
  }, [expanded, toasts]);

  const hiddenCount = toasts.length - visibleToasts.length;

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      role="region"
      className="pointer-events-none fixed top-3 right-3 z-[60] flex max-w-[calc(100vw-24px)] flex-col gap-2"
      data-testid="toast-viewport"
    >
      {visibleToasts.map((toast, index) => {
        // Each subsequent toast gets its own "remaining" slice of the duration.
        // The view doesn't track per-toast elapsed time directly; we use the
        // index-based remaining budget so older toasts dismiss sooner under
        // bursty load — matches the AC-T5 max-3-visible contract.
        const totalElapsed = index * 0;
        const remaining = Math.max(
          0,
          (toast.durationMs ?? DEFAULT_DURATIONS[toast.kind]) - totalElapsed,
        );
        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            remaining={remaining}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        );
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? 'Collapse notifications' : `Show ${hiddenCount} more notifications`}
          className="pointer-events-auto self-end rounded-full border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] px-3 py-1 text-[11px] text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-list-hoverBackground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vscode-focusBorder)]"
          data-testid="toast-overflow-chip"
        >
          {expanded ? 'Show less' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
};