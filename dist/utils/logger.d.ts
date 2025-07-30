import winston from 'winston';
import { Request, Response } from 'express';
export declare const logger: winston.Logger;
export declare const logRequest: (req: Request, res: Response, duration: number) => void;
export declare const logError: (error: Error, context?: Record<string, unknown>) => void;
export declare const logMemoryOperation: (operation: string, userId: string, organizationId: string, metadata?: Record<string, unknown>) => void;
export declare const logPerformance: (operation: string, duration: number, metadata?: Record<string, unknown>) => void;
//# sourceMappingURL=logger.d.ts.map