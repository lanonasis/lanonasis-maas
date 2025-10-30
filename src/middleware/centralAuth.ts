import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '@/integrations/supabase/client';

// Use centralized type definitions
import '@/types/express-auth';

interface AuthError extends Error {
  status: number;
  code: string;
}

interface ApiKeyValidationResult {
  id: string;
  user_id: string;
  email?: string;
  plan?: string;
  role?: string;
  organization_id?: string;
  last_used?: string;
  rate_limit_remaining?: number;
  project_scope?: string;
}

/**
 * Create authentication error with consistent format
 */
const createAuthError = (message: string, code: string, status = 401): AuthError => {
  const error = new Error(message) as AuthError;
  error.status = status;
  error.code = code;
  return error;
};

/**
 * Validate API key against Supabase
 */
const validateApiKey = async (apiKey: string): Promise<ApiKeyValidationResult> => {
  try {
    const { data, error } = await supabase.rpc('validate_api_key', {
      api_key: apiKey
    });

    if (error) {
      console.error('Supabase API key validation error:', error);
      throw createAuthError('API key validation failed', 'API_KEY_VALIDATION_ERROR');
    }

    if (!data || !data.valid) {
      throw createAuthError('Invalid API key', 'INVALID_API_KEY');
    }

    const { valid: _valid, ...result } = data as ApiKeyValidationResult & { valid?: boolean };
    return result;
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      throw error;
    }
    console.error('API key validation error:', error);
    throw createAuthError('API key validation service unavailable', 'API_KEY_SERVICE_ERROR');
  }
};

/**
 * Validate JWT token
 */
const validateJWT = async (token: string): Promise<Record<string, unknown>> => {
  try {
    const jwtSecret = process.env.JWT_SECRET=REDACTED_JWT_SECRET
    if (!jwtSecret) {
      throw createAuthError('JWT secret not configured', 'JWT_SECRET=REDACTED_JWT_SECRET
    }

    const decoded = jwt.verify(token, jwtSecret) as Record<string, unknown>;

    const centralAuthUrl = process.env.CENTRAL_AUTH_URL;
    if (centralAuthUrl) {
      const response = await fetch(`${centralAuthUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw createAuthError('Central auth validation failed', 'CENTRAL_AUTH_FAILED');
      }

      const centralData = await response.json();
      if (!centralData.valid) {
        throw createAuthError('Token invalid according to central auth', 'CENTRAL_AUTH_INVALID');
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw createAuthError('Invalid JWT token', 'INVALID_JWT');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw createAuthError('JWT token expired', 'JWT_EXPIRED');
    }
    if (error instanceof Error && 'status' in error) {
      throw error;
    }
    console.error('JWT validation error:', error);
    throw createAuthError('JWT validation failed', 'JWT_VALIDATION_ERROR');
  }
};

/**
 * Central authentication middleware supporting both JWT and API keys
 */
export const centralAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const authHeader = req.headers['authorization'] as string;
    const projectScope = req.headers['x-project-scope'] as string;

    if (projectScope !== 'lanonasis-maas') {
      console.warn(`[${req.id}] Invalid project scope: ${projectScope}`);
      throw createAuthError('Invalid project scope', 'INVALID_PROJECT_SCOPE', 403);
    }

    if (apiKey) {
      console.log(`[${req.id}] Authenticating with API key`);
      const keyData = await validateApiKey(apiKey);

      req.user = {
        id: keyData.user_id,
        userId: keyData.user_id,
        plan: keyData.plan || 'free',
        role: keyData.role || 'user',
        organization_id: organizationId,
        organizationId,
        api_key_id: keyData.id,
        auth_type: 'api_key',
        ...(keyData.email ? { email: keyData.email } : {}),
        ...(keyData.last_used ? { last_used: keyData.last_used } : {}),
        ...(typeof keyData.rate_limit_remaining === 'number'
          ? { rate_limit_remaining: keyData.rate_limit_remaining }
          : {}),
        ...(keyData.project_scope ? { project_scope: keyData.project_scope } : {})
      };

      req.user = unifiedUser;
      console.log(`[${req.id}] API key authentication successful for user ${unifiedUser.id}`);
      return next();
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log(`[${req.id}] Authenticating with JWT`);

      const decoded = await validateJWT(token);

      req.user = {
        id: decoded.sub || decoded.user_id || decoded.id,
        email: decoded.email,
        plan: decoded.plan || 'free',
        organization_id: decoded.organization_id,
        auth_type: 'jwt'
      };

      console.log(`[${req.id}] JWT authentication successful for user ${req.user.id}`);
      return next();
    }

    console.warn(`[${req.id}] No authentication provided`);
    throw createAuthError('Authentication required. Provide either X-API-Key header or Authorization: Bearer token', 'MISSING_AUTH');
  } catch (error) {
    console.error(`[${req.id}] Authentication failed:`, error);
    next(error);
  }
};

/**
 * Plan-based authorization middleware
 */
export const requirePlan = (requiredPlan: 'free' | 'pro' | 'enterprise') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createAuthError('Authentication required', 'MISSING_AUTH'));
    }

    const planHierarchy = { free: 0, pro: 1, enterprise: 2 } as const;
    const userPlanLevel = planHierarchy[(req.user.plan as keyof typeof planHierarchy) || 'free'] ?? 0;
    const requiredPlanLevel = planHierarchy[requiredPlan];

    if (userPlanLevel < requiredPlanLevel) {
      console.warn(`[${req.id}] Plan authorization failed: user has ${req.user.plan}, required ${requiredPlan}`);
      return next(createAuthError(`Plan ${requiredPlan} or higher required`, 'INSUFFICIENT_PLAN', 403));
    }

    console.log(`[${req.id}] Plan authorization successful: ${req.user.plan} >= ${requiredPlan}`);
    next();
  };
};

/**
 * Rate limiting based on user plan
 */
export const planBasedRateLimit = () => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id || req.user.userId || req.user.user_id || req.user.sub;
    if (!userId) {
      console.warn(`[${req.id}] Rate limit skipped: missing user identifier`);
      return next(createAuthError('Authenticated user is missing an identifier', 'USER_ID_MISSING'));
    }

    const now = Date.now();
    const windowMs = 60 * 1000;

    const planLimits = {
      free: 100,
      pro: 1000,
      enterprise: 5000
    } as const;

    const limit = planLimits[(req.user.plan as keyof typeof planLimits) || 'free'] ?? planLimits.free;

    let userTracking = requestCounts.get(userId);
    if (!userTracking || userTracking.resetTime <= now) {
      userTracking = { count: 0, resetTime: now + windowMs };
      requestCounts.set(userId, userTracking);
    }

    userTracking.count += 1;

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - userTracking.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(userTracking.resetTime / 1000).toString());

    if (userTracking.count > limit) {
      console.warn(`[${req.id}] Rate limit exceeded for user ${userId}: ${userTracking.count}/${limit}`);
      return next(createAuthError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429));
    }

    console.log(`[${req.id}] Rate limit check passed: ${userTracking.count}/${limit}`);
    next();
  };
};

/**
 * Optional authentication - allows both authenticated and anonymous access
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await centralAuth(req, res, () => {
      next();
    });
  } catch (error) {
    console.log(`[${req.id}] Optional auth failed, proceeding anonymously:`, error);
    delete req.user;
    next();
  }
};

export default centralAuth;

