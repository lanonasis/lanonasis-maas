import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '@/types/auth';
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requirePlan: (allowedPlans: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map