import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../types/auth';
export interface UnifiedUser extends JWTPayload {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
}
export type AlignedUser = UnifiedUser;
declare global {
    namespace Express {
        interface Request {
            user?: UnifiedUser;
        }
    }
}
/**
 * Authentication middleware aligned with Supabase auth system
 * Supports both JWT tokens and API keys
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
//# sourceMappingURL=auth-aligned.d.ts.map