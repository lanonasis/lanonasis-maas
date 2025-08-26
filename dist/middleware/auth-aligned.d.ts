import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '@/types/auth';
declare global {
    namespace Express {
        interface Request {
            id?: string;
            user?: UnifiedUser;
        }
    }
}
export interface UnifiedUser extends JWTPayload {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    auth_type?: 'jwt' | 'api_key';
    api_key_id?: string;
    last_used?: string;
    rate_limit_remaining?: number;
}
export type AlignedUser = UnifiedUser;
export declare const attachRequestId: (req: Request, res: Response, next: NextFunction) => void;
export declare const corsGuard: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const createErrorEnvelope: (req: Request, message: string, type?: string, code?: string) => {
    error: {
        message: string;
        type: string;
        code: string;
    };
    request_id: string;
    timestamp: string;
    path: string;
    method: string;
};
/**
 * Enhanced authentication middleware aligned with Golden Contract v0.1
 * Supports both JWT tokens and API keys with proper header semantics
 */
export declare const alignedAuthMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Authenticate using API key from maas_api_keys table
 */
export declare function authenticateApiKey(apiKey: string): Promise<AlignedUser | null>;
/**
 * Middleware to check plan requirements
 */
export declare const requirePlan: (allowedPlans: string[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to check role requirements
 */
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Check if user has admin privileges (for admin endpoints)
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Rate limiting based on user plan
 */
export declare const planBasedRateLimit: () => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Initialize user service configuration if it doesn't exist
 */
export declare function ensureUserServiceConfig(userId: string): Promise<void>;
export declare const globalErrorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const createSuccessEnvelope: (data: any, req: Request, meta?: any) => any;
export declare const validateProjectScope: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth-aligned.d.ts.map