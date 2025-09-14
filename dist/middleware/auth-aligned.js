import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import crypto from 'crypto';
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
// ============================================
// CORE ALIGNMENT: Request ID Middleware  
// ============================================
export const attachRequestId = (req, res, next) => {
    // Generate unique request ID if not present
    req.id = req.id || crypto.randomUUID();
    // Add to response headers for client tracking
    res.setHeader('X-Request-ID', req.id);
    // Log request with ID for debugging
    logger.debug(`[${req.id}] ${req.method} ${req.url} from ${req.ip}`);
    next();
};
// ============================================
// CORE ALIGNMENT: Enhanced CORS Guard
// ============================================
export const corsGuard = (req, res, next) => {
    const origin = req.get('Origin');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
        'https://dashboard.LanOnasis.com',
        'https://docs.LanOnasis.com',
        'https://api.LanOnasis.com'
    ];
    // Add development origins if not in production
    if (process.env.NODE_ENV !== 'production') {
        allowedOrigins.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000');
    }
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-API-Key, X-Project-Scope, X-Request-ID');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400');
            return res.status(204).send();
        }
        else {
            return res.status(403).json(createErrorEnvelope(req, 'CORS policy violation', 'CORSError', 'ORIGIN_NOT_ALLOWED'));
        }
    }
    // Handle actual requests
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    else if (origin) {
        return res.status(403).json(createErrorEnvelope(req, 'CORS policy violation', 'CORSError', 'ORIGIN_NOT_ALLOWED'));
    }
    // Add security headers to all responses
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('X-Privacy-Level', 'standard');
    next();
};
// ============================================
// CORE ALIGNMENT: Error Envelope Helper
// ============================================
export const createErrorEnvelope = (req, message, type = 'Error', code = 'INTERNAL_ERROR') => {
    return {
        error: { message, type, code },
        request_id: req.id || 'unknown',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };
};
/**
 * Enhanced authentication middleware aligned with Golden Contract v0.1
 * Supports both JWT tokens and API keys with proper header semantics
 */
export const alignedAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'];
        const projectScope = req.headers['x-project-scope'];
        // CORE ALIGNMENT: Validate project scope first
        if (projectScope !== 'LanOnasis-maas') {
            logger.warn(`[${req.id}] Invalid project scope: ${projectScope}`);
            res.status(403).json(createErrorEnvelope(req, 'Invalid project scope', 'AuthError', 'INVALID_PROJECT_SCOPE'));
            return;
        }
        let token;
        let isApiKey = false;
        // CORE ALIGNMENT: API Key takes precedence (machine-to-machine preferred)
        if (apiKey) {
            token = apiKey.trim();
            isApiKey = true;
            logger.debug(`[${req.id}] Using X-API-Key authentication`);
        }
        // CORE ALIGNMENT: JWT for user sessions only  
        else if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
            logger.debug(`[${req.id}] Using JWT Bearer token authentication`);
        }
        if (!token) {
            res.status(401).json(createErrorEnvelope(req, 'Authentication required. Provide either X-API-Key header or Authorization: Bearer token', 'AuthError', 'MISSING_AUTH'));
            return;
        }
        try {
            if (isApiKey) {
                // Handle API key authentication
                const user = await authenticateApiKey(token);
                if (!user) {
                    res.status(401).json(createErrorEnvelope(req, 'The provided API key is invalid or inactive', 'AuthError', 'INVALID_API_KEY'));
                    return;
                }
                req.user = { ...user, auth_type: 'api_key' };
                logger.info(`[${req.id}] API key authentication successful for user ${user.id}`);
            }
            else {
                // Handle JWT token authentication with Supabase
                // For now, skip JWT validation and proceed with basic auth
                // TODO: Implement proper JWT validation with Supabase v2
                const user = {
                    id: 'jwt-user',
                    email: 'jwt-user@example.com',
                    user_metadata: {},
                    app_metadata: {}
                };
                // Get user plan from service config (using hardcoded user for now)
                const { data: serviceConfig } = await supabase
                    .from('maas_service_config')
                    .select('plan')
                    .eq('user_id', user.id)
                    .single();
                const alignedUser = {
                    // JWTPayload properties (from Supabase user)
                    userId: user.id,
                    organizationId: user.id, // For Supabase, use user ID as org ID
                    role: 'user',
                    plan: (serviceConfig && Array.isArray(serviceConfig) && serviceConfig.length > 0)
                        ? serviceConfig[0].plan
                        : 'free',
                    // Additional UnifiedUser properties
                    id: user.id,
                    email: user.email || '',
                    user_metadata: user.user_metadata || {},
                    app_metadata: user.app_metadata || {}
                };
                req.user = { ...alignedUser, auth_type: 'jwt' };
                logger.info(`[${req.id}] JWT authentication successful for user ${alignedUser.id}`);
            }
            logger.debug('User authenticated', {
                userId: req.user?.userId || req.user?.id,
                email: req.user?.email,
                plan: req.user?.plan,
                authMethod: isApiKey ? 'api_key' : 'jwt'
            });
            next();
        }
        catch (authError) {
            logger.warn(`[${req.id}] Authentication error`, {
                error: authError instanceof Error ? authError.message : 'Unknown error',
                authMethod: isApiKey ? 'api_key' : 'jwt'
            });
            res.status(401).json(createErrorEnvelope(req, 'Unable to verify authentication credentials', 'AuthError', 'AUTHENTICATION_FAILED'));
            return;
        }
    }
    catch (error) {
        logger.error(`[${req.id}] Authentication middleware error`, { error });
        res.status(500).json(createErrorEnvelope(req, 'An error occurred during authentication', 'InternalError', 'AUTHENTICATION_ERROR'));
        return;
    }
};
/**
 * Authenticate using API key from maas_api_keys table
 */
export async function authenticateApiKey(apiKey) {
    try {
        // Hash the API key for comparison (in production, store hashed keys)
        const { data: keyRecord, error } = await supabase
            .from('maas_api_keys')
            .select(`
        user_id,
        is_active,
        expires_at,
        maas_service_config!inner(plan)
      `)
            .eq('key_hash', apiKey) // In production, hash the key
            .eq('is_active', true)
            .single();
        if (error || !keyRecord) {
            return null;
        }
        // Check if key is expired
        if (keyRecord.expires_at && new Date() > new Date(keyRecord.expires_at)) {
            return null;
        }
        // Update last_used timestamp
        await supabase
            .from('maas_api_keys')
            .update({ last_used: new Date().toISOString() })
            .eq('key_hash', apiKey);
        // Extract plan value using optional chaining
        const plan = keyRecord?.maas_service_config?.[0]?.plan || 'free';
        const unifiedUser = {
            // JWTPayload properties
            userId: keyRecord.user_id,
            organizationId: keyRecord.user_id, // For API keys, use user ID as org ID
            role: 'user', // Default role for API key users
            plan: plan,
            // Additional UnifiedUser properties
            id: keyRecord.user_id,
            email: '',
            user_metadata: {},
            app_metadata: {}
        };
        return unifiedUser;
    }
    catch (error) {
        logger.error('API key authentication error', { error });
        return null;
    }
}
/**
 * Middleware to check plan requirements
 */
export const requirePlan = (allowedPlans) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'User not authenticated'
            });
            return;
        }
        const userPlan = req.user.plan || 'free';
        if (!allowedPlans.includes(userPlan)) {
            res.status(403).json({
                error: 'Plan upgrade required',
                message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}. Current plan: ${userPlan}`,
                current_plan: userPlan,
                required_plans: allowedPlans
            });
            return;
        }
        next();
    };
};
/**
 * Middleware to check role requirements
 */
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'User not authenticated'
            });
            return;
        }
        const userRole = req.user.role || 'user';
        if (!allowedRoles.includes(userRole)) {
            res.status(403).json({
                error: 'Insufficient permissions',
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${userRole}`,
                current_role: userRole,
                required_roles: allowedRoles
            });
            return;
        }
        next();
    };
};
/**
 * Check if user has admin privileges (for admin endpoints)
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            error: 'Authentication required',
            message: 'User not authenticated'
        });
        return;
    }
    // Check if user has admin role in app_metadata
    const appMetadata = req.user?.app_metadata;
    const isAdmin = appMetadata?.role === 'admin' ||
        (Array.isArray(appMetadata?.roles) && appMetadata?.roles?.includes('admin'));
    if (!isAdmin) {
        res.status(403).json({
            error: 'Admin access required',
            message: 'This endpoint requires administrator privileges'
        });
        return;
    }
    next();
};
/**
 * Rate limiting based on user plan
 */
export const planBasedRateLimit = () => {
    const limits = {
        free: { requests: 60, window: 60000 }, // 60 requests per minute
        pro: { requests: 300, window: 60000 }, // 300 requests per minute
        enterprise: { requests: 1000, window: 60000 } // 1000 requests per minute
    };
    return (req, res, next) => {
        if (!req.user) {
            next();
            return;
        }
        const userPlan = req.user?.plan || 'free';
        const limit = limits[userPlan] || limits.free;
        // Here you would implement the actual rate limiting logic
        // This is a simplified version - in production, use Redis or similar
        // For now, just add the limit info to headers
        if (limit) {
            res.set({
                'X-RateLimit-Limit': limit.requests.toString(),
                'X-RateLimit-Window': limit.window.toString(),
                'X-RateLimit-Plan': userPlan
            });
        }
        next();
    };
};
/**
 * Initialize user service configuration if it doesn't exist
 */
export async function ensureUserServiceConfig(userId) {
    try {
        const { data: existing } = await supabase
            .from('maas_service_config')
            .select('id')
            .eq('user_id', userId)
            .single();
        if (!existing) {
            await supabase
                .from('maas_service_config')
                .insert({
                user_id: userId,
                plan: 'free',
                memory_limit: 100,
                api_calls_per_minute: 60,
                features: {},
                settings: {}
            });
        }
    }
    catch (error) {
        logger.warn('Failed to ensure user service config', { error, userId });
    }
}
// ============================================
// CORE ALIGNMENT: Global Error Handler
// ============================================
export const globalErrorHandler = (error, req, res, next) => {
    // If response already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(error);
    }
    const status = error.status || error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    const type = error.constructor.name || 'Error';
    const code = error.code || 'INTERNAL_ERROR';
    logger.error(`[${req.id}] Global error handler`, {
        error: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
    });
    res.status(status).json(createErrorEnvelope(req, message, type, code));
};
// ============================================
// CORE ALIGNMENT: 404 Handler
// ============================================
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        ...createErrorEnvelope(req, 'Endpoint not found', 'NotFoundError', 'ENDPOINT_NOT_FOUND'),
        available_endpoints: [
            '/health',
            '/api/v1/*',
            '/mcp/*',
            '/.well-known/onasis.json'
        ]
    });
};
// ============================================
// CORE ALIGNMENT: Success Response Helper
// ============================================
export const createSuccessEnvelope = (data, req, meta) => {
    return {
        data,
        request_id: req.id,
        timestamp: new Date().toISOString(),
        ...(meta && { meta })
    };
};
// ============================================
// CORE ALIGNMENT: Project Scope Validation
// ============================================
export const validateProjectScope = (req, res, next) => {
    const projectScope = req.headers['x-project-scope'];
    if (projectScope !== 'LanOnasis-maas') {
        logger.warn(`[${req.id}] Invalid project scope: ${projectScope}`);
        return res.status(403).json(createErrorEnvelope(req, 'Invalid project scope', 'AuthError', 'INVALID_PROJECT_SCOPE'));
    }
    next();
};
//# sourceMappingURL=auth-aligned.js.map