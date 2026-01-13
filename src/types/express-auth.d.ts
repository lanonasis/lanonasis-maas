// Express type extensions for authentication
import { JWTPayload } from 'jsonwebtoken';

// Define the authenticated user structure - this is what gets assigned to req.user
export interface AuthenticatedUser {
    id: string;
    email?: string | undefined;
    plan?: string | undefined;
    organization_id?: string | undefined;
    api_key_id?: string | undefined;
    auth_type: 'jwt' | 'api_key';
    // Additional fields from UnifiedUser for compatibility
    userId?: string | undefined;
    organizationId?: string | undefined;
    role?: string | undefined;
    user_metadata?: Record<string, unknown> | undefined;
    app_metadata?: Record<string, unknown> | undefined;
    last_used?: string | undefined;
    rate_limit_remaining?: number | undefined;
    sub?: string | undefined;
    user_id?: string | undefined;
}

// Extended UnifiedUser interface that properly extends JWTPayload
export interface UnifiedUser extends Partial<JWTPayload> {
    id?: string | undefined;
    email?: string | undefined;
    user_metadata?: Record<string, unknown> | undefined;
    app_metadata?: Record<string, unknown> | undefined;
    // Core alignment additions
    auth_type?: 'jwt' | 'api_key' | undefined;
    api_key_id?: string | undefined;
    last_used?: string | undefined;
    rate_limit_remaining?: number | undefined;
    // Missing properties that are used throughout the codebase
    userId?: string | undefined;
    organizationId?: string | undefined;
    organization_id?: string | undefined;
    plan?: string | undefined;
    role?: string | undefined;
    project_scope?: string | undefined;
    sub?: string | undefined;
    user_id?: string | undefined;
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
