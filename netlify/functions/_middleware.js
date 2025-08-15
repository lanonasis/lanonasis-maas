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

// Base64URL helpers for Edge/runtime compatibility (no Node Buffer)
const base64UrlToUint8Array = (str) => {
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const base64UrlToString = (str) => {
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return atob(base64);
};

const encoder = new TextEncoder();

// Verifies HS256 JWT and returns the decoded payload if valid
const verifyJWT = async (token, secret) => {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const [headerB64, payloadB64, signatureB64] = parts;

  const headerJson = base64UrlToString(headerB64);
  const header = JSON.parse(headerJson);
  if (header.alg !== 'HS256') throw new Error('Unsupported JWT alg');

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
  if (!isValid) throw new Error('Invalid signature');

  const payloadJson = base64UrlToString(payloadB64);
  const payload = JSON.parse(payloadJson);

  // Expiry check if present
  if (payload.exp && typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) throw new Error('Token expired');
  }

  return payload;
};

const createJWTMiddleware = (config) => {
  return async (request) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7).trim();
    try {
      const decoded = await verifyJWT(token, config.jwtSecret);
      const projectScope = decoded.project_scope || config.projectName;

      if (Array.isArray(config.allowedScopes) && config.allowedScopes.length > 0) {
        if (!config.allowedScopes.includes(projectScope)) {
          return { isValid: false, error: 'Project scope not permitted' };
        }
      }

      return {
        isValid: true,
        userId: decoded.sub || decoded.user_id || 'unknown',
        projectScope
      };
    } catch (err) {
      return { isValid: false, error: err instanceof Error ? err.message : 'Invalid token' };
    }
  };
};
};

// Configuration with fail-fast validation
const SUPABASE_URL=https://<project-ref>.supabase.co
const SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
const PROJECT_NAME = 'lanonasis-maas';
const JWT_SECRET=REDACTED_JWT_SECRET

// Fail-fast validation for required environment variables
if (!SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
  throw new Error('SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
}
if (!JWT_SECRET=REDACTED_JWT_SECRET
  throw new Error('JWT_SECRET=REDACTED_JWT_SECRET
}

// Initialize audit logger
const auditLogger = createAuditLogger(PROJECT_NAME);

// Initialize JWT middleware
const jwtMiddleware = createJWTMiddleware({
  jwtSecret: JWT_SECRET=REDACTED_JWT_SECRET
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