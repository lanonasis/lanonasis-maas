import { ZodError } from 'zod';
import { logger } from '../utils/logger';
export class ValidationError extends Error {
    statusCode = 400;
    isOperational = true;
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
export class AuthenticationError extends Error {
    statusCode = 401;
    isOperational = true;
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends Error {
    statusCode = 403;
    isOperational = true;
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.name = 'AuthorizationError';
    }
}
export class NotFoundError extends Error {
    statusCode = 404;
    isOperational = true;
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends Error {
    statusCode = 409;
    isOperational = true;
    constructor(message = 'Resource conflict') {
        super(message);
        this.name = 'ConflictError';
    }
}
export class RateLimitError extends Error {
    statusCode = 429;
    isOperational = true;
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
    }
}
export class InternalServerError extends Error {
    statusCode = 500;
    isOperational = false;
    constructor(message = 'Internal server error') {
        super(message);
        this.name = 'InternalServerError';
    }
}
export const errorHandler = (error, req, res, _next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';
    let details = undefined;
    // Handle Zod validation errors
    if (error instanceof ZodError) {
        statusCode = 400;
        message = 'Validation failed';
        details = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
        }));
    }
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    // Handle Supabase errors
    if (error.message?.includes('duplicate key value')) {
        statusCode = 409;
        message = 'Resource already exists';
    }
    // Log error
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel]('Request Error', {
        statusCode,
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    // Send error response
    const response = {
        error: message,
        statusCode,
        timestamp: new Date().toISOString(),
        path: req.url
    };
    // Include details for validation errors
    if (details) {
        response.details = details;
    }
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
        response.stack = error.stack;
    }
    res.status(statusCode).json(response);
};
// Async error handler wrapper
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
//# sourceMappingURL=errorHandler.js.map