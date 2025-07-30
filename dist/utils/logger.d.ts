import winston from 'winston';
export declare const logger: winston.Logger;
export declare const logRequest: (req: any, res: any, duration: number) => void;
export declare const logError: (error: Error, context?: Record<string, any>) => void;
export declare const logMemoryOperation: (operation: string, userId: string, organizationId: string, metadata?: Record<string, any>) => void;
export declare const logPerformance: (operation: string, duration: number, metadata?: Record<string, any>) => void;
//# sourceMappingURL=logger.d.ts.map