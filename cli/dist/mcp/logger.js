/**
 * Enhanced logging system for MCP server
 * Provides structured logging with different levels and contexts
 */
export class Logger {
    defaultContext;
    context = {};
    constructor(defaultContext = {}) {
        this.defaultContext = defaultContext;
        this.context = { ...defaultContext };
    }
    formatMessage(level, message, context) {
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
    info(message, context) {
        console.log(this.formatMessage('INFO', message, context));
    }
    warn(message, context) {
        console.warn(this.formatMessage('WARN', message, context));
    }
    error(message, context) {
        console.error(this.formatMessage('ERROR', message, context));
    }
    debug(message, context) {
        if (process.env.MCP_VERBOSE === 'true') {
            console.debug(this.formatMessage('DEBUG', message, context));
        }
    }
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    child(context) {
        return new Logger({ ...this.context, ...context });
    }
}
export const logger = new Logger({
    service: 'mcp-core',
    version: '1.0.0'
});
