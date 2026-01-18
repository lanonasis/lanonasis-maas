export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'validation'
  | 'rate_limit'
  | 'server'
  | 'conflict'
  | 'not_found'
  | 'unknown';

export type ErrorSeverity = 'info' | 'warning' | 'error';

export interface ExtensionError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  actions?: string[];
  retryable?: boolean;
  code?: string;
}

function getErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const maybeCode = (error as { code?: string | number; statusCode?: string | number }).code
    ?? (error as { statusCode?: string | number }).statusCode;
  if (maybeCode === undefined || maybeCode === null) return undefined;
  return String(maybeCode);
}

export function classifyError(error: unknown): ExtensionError {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  const code = getErrorCode(error);

  if (/conflict|409/.test(normalized)) {
    return {
      category: 'conflict',
      severity: 'warning',
      message: 'Sync conflict detected. Review the conflicting changes in the sync logs, then manually merge your local and remote edits or discard the pending offline operation.',
      details: message,
      actions: ['View Logs'],
      retryable: false,
      code
    };
  }

  if (/validation|invalid|bad request|400/.test(normalized)) {
    return {
      category: 'validation',
      severity: 'warning',
      message: `Invalid input: ${message}`,
      details: message,
      actions: ['Review Input'],
      retryable: false,
      code
    };
  }

  if (/auth|401|403|unauthorized|forbidden/.test(normalized)) {
    return {
      category: 'auth',
      severity: 'error',
      message: 'Authentication failed. Please re-authenticate or update your API key.',
      details: message,
      actions: ['Re-authenticate', 'Clear API Key'],
      retryable: true,
      code
    };
  }

  if (/rate limit|429/.test(normalized)) {
    return {
      category: 'rate_limit',
      severity: 'warning',
      message: 'Rate limit exceeded. Please wait before retrying.',
      details: message,
      actions: ['Wait and Retry'],
      retryable: true,
      code
    };
  }

  if (/timeout|etimedout/.test(normalized)) {
    return {
      category: 'network',
      severity: 'warning',
      message: 'Request timed out. Please check your connection and retry.',
      details: message,
      actions: ['Retry', 'Check Connection'],
      retryable: true,
      code
    };
  }

  if (/network|econnrefused|enotfound|fetch/.test(normalized)) {
    return {
      category: 'network',
      severity: 'warning',
      message: 'Unable to reach Lanonasis servers. Check your internet connection, firewall settings, or proxy configuration.',
      details: message,
      actions: ['Retry', 'Check Network Settings'],
      retryable: true,
      code
    };
  }

  if (/not found|404/.test(normalized)) {
    return {
      category: 'not_found',
      severity: 'warning',
      message: 'Requested resource was not found.',
      details: message,
      actions: ['Check Settings'],
      retryable: false,
      code
    };
  }

  if (/500|502|503|504|server error/.test(normalized)) {
    return {
      category: 'server',
      severity: 'error',
      message: 'Lanonasis servers are experiencing issues. Please retry later.',
      details: message,
      actions: ['Retry', 'View Status'],
      retryable: true,
      code
    };
  }

  return {
    category: 'unknown',
    severity: 'error',
    message: `Operation failed: ${message}`,
    details: message,
    actions: ['View Logs'],
    retryable: false,
    code
  };
}

export function isConflictError(error: unknown): boolean {
  return classifyError(error).category === 'conflict';
}

export function isNetworkError(error: unknown): boolean {
  return classifyError(error).category === 'network';
}

export function isAuthError(error: unknown): boolean {
  return classifyError(error).category === 'auth';
}
