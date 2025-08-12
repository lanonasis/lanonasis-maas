/**
 * Netlify Edge Function middleware for lanonasis-maas
 * 
 * This middleware enforces JWT validation and project scope checking
 * for all Edge Functions in the lanonasis-maas project.
 */

import { createAuditLogger, createJWTMiddleware, createErrorResponse } from '../../../packages/onasis-core/src/security';

// Configuration
const SUPABASE_URL=https://<project-ref>.supabase.co
const SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
const PROJECT_NAME = 'lanonasis-maas';

// Initialize audit logger
const auditLogger = createAuditLogger({
  supabaseUrl: SUPABASE_URL=https://<project-ref>.supabase.co
  supabaseServiceKey: SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
  projectName: PROJECT_NAME
});

// Initialize JWT middleware
const jwtMiddleware = createJWTMiddleware(
  SUPABASE_URL=https://<project-ref>.supabase.co
  SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
  auditLogger,
  {
    allowedProjects: ['lanonasis-maas', 'lanonasis'], // Allow both project names
    requireProjectScope: false // Start with false, can be enabled later
  }
);

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/health',
  '/debug',
  '/api/health'
];

/**
 * Main middleware handler
 */
export default async function middleware(request: Request): Promise<Response | void> {
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
      await auditLogger.log({
        action: 'middleware_rejection',
        target: pathname,
        status: 'denied',
        meta: { 
          reason: validation.error,
          method: request.method,
          path: pathname
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return createErrorResponse(validation.error || 'Authentication required', 401);
    }

    // Log successful authentication
    await auditLogger.logFunctionCall(
      pathname,
      validation.userId,
      'allowed',
      {
        method: request.method,
        projectScope: validation.projectScope
      }
    );

    // Add user context to request headers for downstream functions
    const newHeaders = new Headers(request.headers);
    if (validation.userId) {
      newHeaders.set('x-user-id', validation.userId);
    }
    if (validation.projectScope) {
      newHeaders.set('x-project-scope', validation.projectScope);
    }

    // Continue to the actual function with enhanced request
    return new Request(request, { headers: newHeaders });

  } catch (error) {
    // Log middleware errors
    await auditLogger.log({
      action: 'middleware_error',
      target: pathname,
      status: 'error',
      meta: {
        error: error instanceof Error ? error.message : 'Unknown middleware error',
        method: request.method,
        path: pathname
      },
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