import { Request, Response, NextFunction } from 'express';
import { UnifiedUser } from './auth';
export type AlignedUser = UnifiedUser;
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