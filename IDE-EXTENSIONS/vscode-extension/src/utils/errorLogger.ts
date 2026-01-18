import * as vscode from 'vscode';
import { classifyError, type ExtensionError } from './extensionErrors';

export interface ErrorLogEntry {
  timestamp: string;
  severity: ExtensionError['severity'];
  category: ExtensionError['category'];
  message: string;
  details?: string;
  context?: string;
  stack?: string;
  code?: string;
}

const LOG_STORAGE_KEY = 'lanonasis.errorLogs';
const MAX_LOG_ENTRIES = 200;

export async function logExtensionError(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  error: unknown,
  contextLabel?: string
): Promise<ExtensionError> {
  const classified = classifyError(error);
  const details = classified.details ? redactSensitive(classified.details) : undefined;
  const stack = error instanceof Error && error.stack ? redactSensitive(error.stack) : undefined;

  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    severity: classified.severity,
    category: classified.category,
    message: redactSensitive(classified.message),
    details,
    context: contextLabel,
    stack,
    code: classified.code
  };

  output.appendLine(`[${entry.severity.toUpperCase()}] [${entry.category}] ${entry.message}${contextLabel ? ` (${contextLabel})` : ''}`);
  if (details) {
    output.appendLine(`[Details] ${details}`);
  }
  if (stack) {
    output.appendLine(`[Stack] ${stack}`);
  }

  try {
    const existing = context.globalState.get<ErrorLogEntry[]>(LOG_STORAGE_KEY, []);
    const next = [...existing, entry].slice(-MAX_LOG_ENTRIES);
    await context.globalState.update(LOG_STORAGE_KEY, next);
  } catch {
    // Ignore storage errors to avoid cascading failures.
  }

  return classified;
}

export function getErrorLogs(context: vscode.ExtensionContext): ErrorLogEntry[] {
  return context.globalState.get<ErrorLogEntry[]>(LOG_STORAGE_KEY, []);
}

export function formatErrorLogs(logs: ErrorLogEntry[], limit: number = 25): string {
  const entries = logs.slice(-limit);
  if (entries.length === 0) return 'No recent error logs.';

  return entries.map((entry) => {
    const parts = [
      `[${entry.timestamp}] ${entry.severity.toUpperCase()} ${entry.category}: ${entry.message}`,
      entry.context ? `Context: ${entry.context}` : undefined,
      entry.details ? `Details: ${entry.details}` : undefined
    ].filter(Boolean);
    return parts.join('\n');
  }).join('\n\n');
}

function redactSensitive(value: string): string {
  let redacted = value;
  redacted = redacted.replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, 'Bearer [REDACTED]');
  redacted = redacted.replace(/(api[_-]?key|token)=([A-Za-z0-9._-]+)/gi, '$1=[REDACTED]');
  redacted = redacted.replace(/(X-API-Key:\s*)([A-Za-z0-9._-]+)/gi, '$1[REDACTED]');
  return redacted;
}
