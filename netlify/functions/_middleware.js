/**
 * Netlify Edge Functions Middleware
 * 
 * This middleware provides authentication and audit logging
 * for all Edge Functions in the lanonasis-maas project.
 */

/* eslint-env browser, node */
/* global Response, console, process, URL, Headers */

// Local security utilities to avoid dependency resolution issues in Netlify
const createErrorResponse = (message, statusCode = 400) => {
  return new Response(JSON.stringify({ error: message }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
};

const createAuditLogger = (projectName) => {
  return {
    log: (event, details) => {
      console.log(`[${projectName}] ${event}:`, details);
    },
    logFunctionCall: (functionName, userId, projectScope) => {
      console.log(`[${projectName}] Function call: ${functionName}, User: ${userId}, Scope: ${projectScope}`);
    }
  };
};

const createJWTMiddleware = (config) => {
  return async (request) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        isValid: false,
        error: 'Missing or invalid authorization header'
      };
    }

    // TODO: Implement actual JWT validation
    // const token = authHeader.substring(7);
    // try {
    //   const decoded = await verifyJWT(token, config.supabaseServiceKey);
    //   return {
    //     isValid: true,
    //     userId: decoded.sub,
    //     projectScope: decoded.project_scope || config.projectName
    //   };
    // } catch (error) {
    //   return {
    //     isValid: false,
    //     error: 'Invalid or expired token'
    //   };
    // }

    // WARNING: Placeholder implementation - DO NOT DEPLOY TO PRODUCTION
    return {
      isValid: true,
      userId: 'placeholder-user',
      projectScope: 'lanonasis-maas'
    };
  };
};
};

// Configuration with fail-fast validation
const SUPABASE_URL = (typeof process !== 'undefined' ? process.env.SUPABASE_URL : null) || 'https://lanonasis.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PROJECT_NAME = 'lanonasis-maas';

// Fail-fast validation for required environment variables
if (!SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY environment variable is required but not set');
}

// Initialize audit logger
const auditLogger = createAuditLogger(PROJECT_NAME);

// Initialize JWT middleware
const jwtMiddleware = createJWTMiddleware({
  supabaseUrl: SUPABASE_URL,
  supabaseServiceKey: SUPABASE_SERVICE_KEY,
  projectName: PROJECT_NAME,
  allowedScopes: ['lanonasis-maas']
});

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/health',
  '/debug',
  '/api/health'
];

/**
 * Main middleware handler
 */
export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip authentication for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return;
  }

  // Skip for OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    return;
  }

  try {
    // Validate JWT and project scope
    const validation = await jwtMiddleware(request);

    if (!validation.isValid) {
      // Log the rejected request
      auditLogger.log('middleware_rejection', {
        target: pathname,
        status: 'denied',
        reason: validation.error,
        method: request.method,
        path: pathname,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return createErrorResponse(validation.error || 'Authentication required', 401);
    }

    // Log successful authentication
    auditLogger.logFunctionCall(
      pathname,
      validation.userId || 'unknown',
      validation.projectScope || 'unknown'
    );

    // Add user context to request headers for downstream functions
    const newHeaders = new Headers(request.headers);
    if (validation.userId) {
      newHeaders.set('x-user-id', validation.userId);
    }
    if (validation.projectScope) {
      newHeaders.set('x-project-scope', validation.projectScope);
    }

    // Continue to the actual function - return undefined to allow request to proceed
    return undefined;

  } catch (error) {
    // Log middleware errors
    auditLogger.log('middleware_error', {
      target: pathname,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown middleware error',
      method: request.method,
      path: pathname,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return createErrorResponse('Internal authentication error', 500);
  }
}

// Export configuration for Netlify
export const config = {
  path: '/api/*'  // Apply middleware to all API routes
};