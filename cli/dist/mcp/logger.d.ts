/**
 * Enhanced logging system for MCP server
 * Provides structured logging with different levels and contexts
 */
export interface LogContext {
    [key: string]: any;
}
export declare class Logger {
    private defaultContext;
    private context;
    constructor(defaultContext?: LogContext);
    private formatMessage;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    debug(message: string, context?: LogContext): void;
    setContext(context: LogContext): void;
    child(context: LogContext): Logger;
}
export declare const logger: Logger;
