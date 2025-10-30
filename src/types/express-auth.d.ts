// Express type extensions for authentication
import { JWTPayload } from 'jsonwebtoken';

// Define the authenticated user structure - this is what gets assigned to req.user
export interface AuthenticatedUser {
    id: string;
    email?: string;
    plan?: string;
    organization_id?: string;
    api_key_id?: string;
    auth_type: 'jwt' | 'api_key';
    // Additional fields from UnifiedUser for compatibility
    userId?: string;
    organizationId?: string;
    role?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    last_used?: string;
    rate_limit_remaining?: number;
}

// Extended UnifiedUser interface that properly extends JWTPayload
export interface UnifiedUser extends Partial<JWTPayload> {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    // Core alignment additions
    auth_type?: 'jwt' | 'api_key';
    api_key_id?: string;
    last_used?: string;
    rate_limit_remaining?: number;
    // Missing properties that are used throughout the codebase
    userId?: string;
    organizationId?: string;
    organization_id?: string;
    plan?: string;
    role?: string;
}

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser | undefined;
        }
    }
}

export { };