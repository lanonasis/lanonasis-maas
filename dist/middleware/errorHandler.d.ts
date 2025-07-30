import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare class ValidationError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare class AuthenticationError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class AuthorizationError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class NotFoundError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class ConflictError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class RateLimitError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class InternalServerError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare const errorHandler: (error: AppError, req: Request, res: Response, _next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map