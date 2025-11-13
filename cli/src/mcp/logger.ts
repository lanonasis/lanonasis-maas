/**
 * Enhanced logging system for MCP server
 * Provides structured logging with different levels and contexts
 */

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private context: LogContext = {};

  constructor(private defaultContext: LogContext = {}) {
    this.context = { ...defaultContext };
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const fullContext = { ...this.context, ...context };
    
    const logEntry = {
      timestamp,
      level,
      message,
      ...fullContext
    };

    return JSON.stringify(logEntry);
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('ERROR', message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.MCP_VERBOSE === 'true') {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }
}

export const logger = new Logger({
  service: 'mcp-core',
  version: '1.0.0'
});