import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '@/types/auth';
export interface AlignedUser extends JWTPayload {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
}
declare global {
    namespace Express {
        interface Request {
            user?: AlignedUser;
        }
    }
}
/**
 * Authentication middleware aligned with Supabase auth system
 * Supports both JWT tokens and API keys
 */
export declare const alignedAuthMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check plan requirements
 */
export declare const requirePlan: (allowedPlans: string[]) => (req: Request, res: Response, next: NextFunction) => void;
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
//# sourceMappingURL=auth-aligned.d.ts.map