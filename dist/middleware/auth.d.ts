import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '@/types/auth';
export interface UnifiedUser extends JWTPayload {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
}
declare global {
    namespace Express {
        interface Request {
            user?: UnifiedUser;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requirePlan: (allowedPlans: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map