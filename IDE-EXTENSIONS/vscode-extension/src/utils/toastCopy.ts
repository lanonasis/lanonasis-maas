/**
 * Toast copy templates — verbatim from ux-spec.md AC-T3.
 *
 * Centralized so the provider, IDEPanel, and tests all share the
 * exact strings (and the truncation rule).
 */

import type { ToastAction, ToastKind } from '../components/ui/Toast';

export interface MemoryLike {
  title: string;
}

export interface DeleteErrorPayload {
  title: string;
  message: string;
  status?: number;
}

export interface UpdateErrorPayload {
  message: string;
  status?: number;
}

/** Truncate to 60 chars with ellipsis (per AC-T3 footnote). */
export function truncatedTitle(title: string): string {
  return title.length > 60 ? `${title.slice(0, 57)}…` : title;
}

/** AC-T3: memoryDeleted (success). */
export function deletedSuccessToast(memory: MemoryLike): {
  kind: ToastKind;
  message: string;
  action?: ToastAction;
} {
  return {
    kind: 'success',
    message: `Deleted "${truncatedTitle(memory.title)}"`,
    action: { label: 'Undo', command: 'undo' },
  };
}

/** AC-T3: memoryUpdated (success). */
export function updatedSuccessToast(memory: MemoryLike): {
  kind: ToastKind;
  message: string;
} {
  return {
    kind: 'success',
    message: `Updated "${truncatedTitle(memory.title)}"`,
  };
}

/** AC-T3: provider error (delete). */
export function deleteErrorToast(payload: DeleteErrorPayload): {
  kind: ToastKind;
  message: string;
  action?: ToastAction;
} {
  const action = payload.status === 401
    ? { label: 'Sign in', command: 'open' as const, payload: 'authenticate' }
    : { label: 'Retry', command: 'retry' as const };
  return {
    kind: 'error',
    message: `Could not delete "${truncatedTitle(payload.title)}". ${payload.message}`,
    action,
  };
}

/** AC-T3: provider error (update) / updateMemoryFailed. */
export function updateErrorToast(payload: UpdateErrorPayload): {
  kind: ToastKind;
  message: string;
  action?: ToastAction;
} {
  const action = payload.status === 401
    ? { label: 'Sign in', command: 'open' as const, payload: 'authenticate' }
    : { label: 'Retry', command: 'retry' as const };
  return {
    kind: 'error',
    message: `Could not save changes. ${payload.message}`,
    action,
  };
}

/** AC-T3: delete timeout (no reply within 15s). */
export function deleteTimeoutToast(): {
  kind: ToastKind;
  message: string;
  action?: ToastAction;
} {
  return {
    kind: 'error',
    message: 'Delete timed out — the memory may still be on the server.',
    action: { label: 'Refresh', command: 'retry' },
  };
}

/** AC-O3: inline error copy for the card itself (not a toast). */
export function inlineUpdateErrorText(message: string): string {
  return `Update failed: ${message}. Retry?`;
}