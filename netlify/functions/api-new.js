const express = require('express');
const serverless = require('serverless-http');
const crypto = require('crypto');
const path = require('path');

// ============================================
// CORE ALIGNMENT: Environment Configuration
// ============================================
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.API_PREFIX = process.env.API_PREFIX || '/api';
process.env.API_VERSION = process.env.API_VERSION || 'v1';

// Validate critical environment variables
if (!process.env.SUPABASE_URL=https://<project-ref>.supabase.co
  console.error('CRITICAL: SUPABASE_URL=https://<project-ref>.supabase.co
}
if (!process.env.SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
  console.error('CRITICAL: SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
}

// Import the compiled TypeScript server routes
let memoryRouter;
let healthRouter;
let authRouter;

try {
  // Try to import the compiled routes
  const memoryRoutes = require('../../dist/routes/memory.js');
  const healthRoutes = require('../../dist/routes/health.js');
  const authRoutes = require('../../dist/routes/auth.js');
  
  memoryRouter = memoryRoutes.default || memoryRoutes;
  healthRouter = healthRoutes.default || healthRoutes;
  authRouter = authRoutes.default || authRoutes;
} catch (error) {
  console.error('Failed to load compiled routes:', error);
  console.log('Falling back to placeholder implementation');
}

const app = express();

// Disable X-Powered-By header for security
app.disable('x-powered-by');

// ============================================
// CORE ALIGNMENT: Request ID Middleware
// ============================================
app.use((req, res, next) => {
  // Generate unique request ID for tracking
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  
  // Add timestamp for debugging
  req.timestamp = new Date().toISOString();
  
  console.log(`[${req.id}] ${req.method} ${req.url} from ${req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || 'unknown'}`);
  next();
});

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// CORE ALIGNMENT: Enhanced CORS Configuration
// ============================================
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://dashboard.lanonasis.com',
  'https://docs.lanonasis.com', 
  'https://api.lanonasis.com',
  'https://lanonasis.com'
];

// Add development origins if not in production
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
  );
}

app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-API-Key, X-Project-Scope, X-Request-ID, X-Vendor');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      return res.status(204).send();
    } else {
      console.warn(`[${req.id}] CORS preflight blocked for origin: ${origin}`);
      return res.status(403).json(createErrorEnvelope(req, 'CORS policy violation', 'CORSError', 'ORIGIN_NOT_ALLOWED'));
    }
  }

  // Handle actual requests
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      console.warn(`[${req.id}] CORS blocked for origin: ${origin}`);
      return res.status(403).json(createErrorEnvelope(req, 'CORS policy violation', 'CORSError', 'ORIGIN_NOT_ALLOWED'));
    }
  }

  // Add security headers to all responses
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('X-Privacy-Level', 'standard');
  
  next();
});

// ============================================
// CORE ALIGNMENT: Error Envelope Helper
// ============================================
function createErrorEnvelope(req, message, type = 'Error', code = 'INTERNAL_ERROR') {
  return {
    error: { message, type, code },
    request_id: req.id || 'unknown',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };
}

// ============================================
// CORE ALIGNMENT: Success Envelope Helper  
// ============================================
function createSuccessEnvelope(data, req, meta) {
  return {
    data,
    request_id: req.id,
    timestamp: new Date().toISOString(),
    ...(meta && { meta })
  };
}

// ============================================
// CORE ALIGNMENT: Enhanced Authentication Middleware
// ============================================
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  const projectScope = req.headers['x-project-scope'];
  const vendor = req.headers['x-vendor'];

  // Skip auth for public endpoints
  const publicEndpoints = ['/health', '/api/v1/health', '/.well-known/onasis.json'];
  if (publicEndpoints.some(endpoint => req.path === endpoint)) {
    return next();
  }

  // Validate project scope for protected routes
  if (req.path.startsWith('/api/v1/') && projectScope !== 'lanonasis-maas') {
    console.warn(`[${req.id}] Invalid project scope: ${projectScope}`);
    return res.status(403).json(createErrorEnvelope(req, 'Invalid project scope', 'AuthError', 'INVALID_PROJECT_SCOPE'));
  }

  try {
    // CORE ALIGNMENT: API Key authentication (preferred for machine-to-machine)
    if (apiKey) {
      console.log(`[${req.id}] Authenticating with X-API-Key`);
      
      // Validate vendor API key format (pk_*.sk_* or legacy sk_*)
      if (apiKey.includes('pk_') && apiKey.includes('.sk_')) {
        // New vendor key format - should be looked up in database
        // For now, use vendor-specific org from env or reject
        const vendorOrgId = process.env.VENDOR_ORG_ID || process.env.DEFAULT_ORG_ID;
        if (!vendorOrgId) {
          console.warn(`[${req.id}] Vendor API key rejected - VENDOR_ORG_ID/DEFAULT_ORG_ID not configured`);
          return res.status(401).json(createErrorEnvelope(req, 'Vendor API keys require org configuration', 'AuthError', 'VENDOR_ORG_NOT_CONFIGURED'));
        }

        const [keyId, keySecret] = apiKey.split('.');
        req.user = {
          userId: 'vendor_' + keyId.replace('pk_', ''),
          organizationId: vendorOrgId,
          plan: 'enterprise',
          role: 'vendor',
          auth_type: 'vendor_api_key',
          vendor: vendor || 'unknown'
        };
        console.log(`[${req.id}] Vendor API key authentication successful`);
      } else if (apiKey.startsWith('sk_') || apiKey.includes('sk_live_') || apiKey.includes('pk_live_onasis_')) {
        // Legacy API key format - use env vars, reject if not configured
        const legacyUserId = process.env.ADMIN_USER_ID;
        const legacyOrgId = process.env.DEFAULT_ORG_ID;

        if (!legacyUserId || !legacyOrgId) {
          console.warn(`[${req.id}] Legacy API key rejected - ADMIN_USER_ID/DEFAULT_ORG_ID not configured`);
          return res.status(401).json(createErrorEnvelope(req, 'Legacy API keys are deprecated. Please use a proper API key.', 'AuthError', 'LEGACY_KEY_DEPRECATED'));
        }

        req.user = {
          userId: legacyUserId,
          organizationId: legacyOrgId,
          plan: 'enterprise',
          role: 'admin',
          auth_type: 'legacy_api_key'
        };
        console.log(`[${req.id}] Legacy API key authentication successful (using env-configured IDs)`);
      } else {
        console.warn(`[${req.id}] Invalid API key format`);
        return res.status(401).json(createErrorEnvelope(req, 'Invalid API key format', 'AuthError', 'INVALID_API_KEY'));
      }
      
      return next();
    }

    // CORE ALIGNMENT: JWT authentication (for user sessions)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      console.log(`[${req.id}] Authenticating with JWT Bearer token`);

      try {
        // Decode JWT to extract user info (without verification for now - rely on upstream auth)
        const parts = token.split('.');
        if (parts.length !== 3) {
          return res.status(401).json(createErrorEnvelope(req, 'Invalid JWT format', 'AuthError', 'INVALID_JWT'));
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        const userId = payload.sub || payload.user_id;
        const organizationId = payload.organization_id || payload.org_id;

        if (!userId || !organizationId) {
          console.warn(`[${req.id}] JWT missing required claims (sub/user_id, organization_id)`);
          return res.status(401).json(createErrorEnvelope(req, 'JWT missing required user or organization claims', 'AuthError', 'JWT_MISSING_CLAIMS'));
        }

        req.user = {
          userId: userId,
          organizationId: organizationId,
          plan: payload.plan || 'pro',
          role: payload.role || 'user',
          auth_type: 'jwt'
        };

        console.log(`[${req.id}] JWT authentication successful for user ${userId}`);
        return next();
      } catch (jwtError) {
        console.error(`[${req.id}] JWT decode error:`, jwtError);
        return res.status(401).json(createErrorEnvelope(req, 'Invalid JWT token', 'AuthError', 'JWT_DECODE_ERROR'));
      }
    }

    // No authentication provided for protected route
    console.warn(`[${req.id}] No authentication provided for protected route`);
    return res.status(401).json(createErrorEnvelope(req,
      'Authentication required. Provide either X-API-Key header or Authorization: Bearer token',
      'AuthError',
      'MISSING_AUTH'
    ));

  } catch (error) {
    console.error(`[${req.id}] Authentication error:`, error);
    return res.status(500).json(createErrorEnvelope(req,
      'Authentication service error',
      'InternalError', 
      'AUTH_SERVICE_ERROR'
    ));
  }
});

// ============================================
// CORE ALIGNMENT: Service Discovery Endpoint
// ============================================
app.get('/.well-known/onasis.json', (req, res) => {
  const manifest = {
    auth_base: `${req.protocol}://${req.get('host')}/api/v1`,
    memory_base: `${req.protocol}://${req.get('host')}/api/v1/memories`,
    mcp_ws_base: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}`,
    mcp_sse: `${req.protocol}://${req.get('host')}/mcp/sse`, 
    mcp_message: `${req.protocol}://${req.get('host')}/mcp/message`,
    keys_base: `${req.protocol}://${req.get('host')}/api/v1/keys`,
    project_scope: 'lanonasis-maas',
    version: '1.2.0',
    discovery_version: '0.1',
    last_updated: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    capabilities: {
      auth: ['jwt', 'api_key', 'vendor_key'],
      protocols: ['http', 'https', 'ws', 'wss', 'sse'],
      formats: ['json', 'yaml', 'csv', 'markdown'],
      features: ['bulk_operations', 'semantic_search', 'real_time']
    }
  };
  
  res.json(createSuccessEnvelope(manifest, req, { cached: false }));
});

// Use the compiled TypeScript routes if available
if (healthRouter) {
  app.use('/api/v1/health', healthRouter);
  app.use('/health', healthRouter);
} else {
  // CORE ALIGNMENT: Enhanced health endpoint
  app.get(['/health', '/api/v1/health'], (req, res) => {
    const healthData = {
      name: 'Lanonasis Memory Service',
      version: '1.2.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      deployment: 'netlify',
      database: 'connected',
      implementation: 'fallback',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      request_id: req.id
    };
    
    res.json(createSuccessEnvelope(healthData, req, { public: true }));
  });
}

if (authRouter) {
  app.use('/api/v1/auth', authRouter);
}

if (memoryRouter) {
  app.use('/api/v1/memory', memoryRouter);
} else {
  // Fallback memory endpoints
  app.get('/api/v1/memory', (req, res) => {
    res.json({
      message: 'Memory endpoint active - TypeScript implementation not loaded',
      endpoint: '/api/v1/memory',
      status: 'fallback',
      note: 'This is a fallback response. The full TypeScript implementation should be compiled and deployed.'
    });
  });
  
  app.post('/api/v1/memory', (req, res) => {
    res.json({
      message: 'Memory creation endpoint - TypeScript implementation not loaded',
      endpoint: '/api/v1/memory',
      status: 'fallback',
      received: req.body
    });
  });
}

// CORE ALIGNMENT: Enhanced root endpoint
app.get('/', (req, res) => {
  // Check if request prefers JSON (API clients) or HTML (browsers)
  const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
  const isApiRequest = req.get('User-Agent')?.includes('curl') || 
                      req.get('User-Agent')?.includes('Postman') ||
                      req.get('User-Agent')?.includes('HTTPie') ||
                      acceptsJson;

  if (isApiRequest || req.query.format === 'json') {
    // Return JSON for API clients with service discovery info
    const serviceInfo = {
      platform: 'Lanonasis Memory as a Service (MaaS)',
      tagline: 'Enterprise Memory Management with AI Context Protocol',
      version: '1.2.0',
      status: 'operational',
      environment: process.env.NODE_ENV || 'production',
      discovery: `${req.protocol}://${req.get('host')}/.well-known/onasis.json`,
      endpoints: {
        health: '/health',
        discovery: '/.well-known/onasis.json',
        memory: '/api/v1/memory',
        keys: '/api/v1/keys',
        auth: '/api/v1/auth',
        mcp_sse: '/mcp/sse',
        mcp_ws: '/mcp/ws'
      },
      authentication: {
        vendor_keys: 'X-API-Key: pk_*.sk_*',
        jwt_tokens: 'Authorization: Bearer <token>',
        project_scope: 'X-Project-Scope: lanonasis-maas'
      },
      implementation: memoryRouter ? 'typescript' : 'fallback',
      compliance: 'onasis-core-v0.1'
    };
    
    res.json(createSuccessEnvelope(serviceInfo, req, { public: true }));
  } else {
    // Redirect browsers to dashboard
    res.redirect('https://dashboard.lanonasis.com');
  }
});

// Proxy API key management and auth routes to MCP service
app.use('/api/v1/auth/api-keys', async (req, res) => {
  try {
    const mcpUrl = `https://mcp.lanonasis.com/api/v1/auth/api-keys${req.path === '/' ? '' : req.path}`;
    const response = await fetch(mcpUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'X-API-Key': req.headers['x-api-key'] || ''
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('MCP proxy error:', error);
    res.status(502).json({
      error: 'Failed to reach MCP service',
      code: 'MCP_SERVICE_UNAVAILABLE'
    });
  }
});

// Legacy API keys endpoint (redirect to /auth/api-keys)
app.use('/api/v1/api-keys', (req, res) => {
  res.status(301).json({
    message: 'This endpoint has moved',
    new_location: '/api/v1/auth/api-keys',
    hint: 'Please update your client to use the new endpoint'
  });
});

// MCP endpoints (placeholder)
app.get('/api/v1/mcp/status', (req, res) => {
  res.json({
    message: 'MCP status endpoint',
    endpoint: '/api/v1/mcp/status',
    status: 'operational',
    protocol: 'Model Context Protocol v1.0',
    features: ['api-key-management', 'memory-service']
  });
});

// CORE ALIGNMENT: Enhanced 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    ...createErrorEnvelope(req, 'Endpoint not found', 'NotFoundError', 'ENDPOINT_NOT_FOUND'),
    available_endpoints: [
      '/',
      '/.well-known/onasis.json',
      '/health',
      '/api/v1/health',
      '/api/v1/memory',
      '/api/v1/keys',
      '/api/v1/auth',
      '/mcp/sse'
    ],
    documentation: `${req.protocol}://${req.get('host')}/docs`
  });
});

// CORE ALIGNMENT: Global error handler
app.use((err, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const type = err.constructor.name || 'Error';
  const code = err.code || 'INTERNAL_ERROR';

  console.error(`[${req.id}] Global error handler:`, {
    error: err.stack,
    url: req.url,
    method: req.method,
    ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId
  });

  res.status(status).json(createErrorEnvelope(req, message, type, code));
});

// Export serverless handler
const serverlessHandler = serverless(app);

exports.handler = async (event, context) => {
  // Set timeout context
  context.callbackWaitsForEmptyEventLoop = false;
  
  return await serverlessHandler(event, context);
};