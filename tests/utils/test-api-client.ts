import express from 'express';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

interface TestApiClientOptions {
  validApiKey: string;
  validJwt: string;
  validProjectScope: string;
}

export type ApiClientInstance = ReturnType<typeof request>;

interface TestApiClient {
  client: ApiClientInstance;
  close: () => Promise<void> | void;
}

const EXPIRED_TOKEN_PATTERN = /invalid|expired/i;

const ALLOWED_CORS_ORIGINS = [
  'https://dashboard.lanonasis.com',
  'https://docs.lanonasis.com',
  'https://api.lanonasis.com',
];

/**
 * Builds an in-process Express application that simulates the test API used by integration tests.
 *
 * The mock app provides:
 * - Global request headers (request id, rate-limit, security and cache headers).
 * - A discovery manifest at `/.well-known/onasis.json` with environment-aware caching and CORS support for ALLOWED_CORS_ORIGINS.
 * - A health endpoint at `/health`.
 * - Memory endpoints at `/api/v1/memories` and `/api/v1/memories/:id` that enforce `X-Project-Scope` and accept either a valid `X-API-Key` or a Bearer JWT. Responses mirror the real API's success and structured error shapes (401/403) used by tests.
 *
 * @param options - Configuration used by the mock: supplies the valid API key, valid JWT, and the expected project scope that requests must present.
 * @returns An Express application instance ready to be used with supertest or mounted in-process.
 */
function buildMockApp(options: TestApiClientOptions) {
  const app = express();
  app.use(express.json());

  const validBearer = `Bearer ${options.validJwt}`;
  const validApiKeyHeaders = (req: express.Request) =>
    req.get('X-API-Key')?.trim() === options.validApiKey &&
    req.get('X-Project-Scope')?.trim() === options.validProjectScope;

  const validJwtHeaders = (req: express.Request) =>
    req.get('Authorization')?.trim() === validBearer &&
    req.get('X-Project-Scope')?.trim() === options.validProjectScope;

  const ensureAuthenticated = (req: express.Request, res: express.Response) => {
    const rawProjectScope = req.get('X-Project-Scope');
    if (typeof rawProjectScope === 'undefined') {
      unauthorized(req, res, 'AUTH_MISSING_PROJECT_SCOPE', 'Missing required X-Project-Scope header');
      return false;
    }

    const projectScope = rawProjectScope.trim();
    if (!projectScope || projectScope !== options.validProjectScope) {
      forbidden(req, res, 'INVALID_PROJECT_SCOPE', 'Provided project scope is not authorized');
      return false;
    }

    if (validApiKeyHeaders(req) || validJwtHeaders(req)) {
      return true;
    }

    const authorizationHeader = req.get('Authorization');
    if (!authorizationHeader && !req.get('X-API-Key')) {
      unauthorized(req, res, 'AUTHENTICATION_REQUIRED', 'Authentication credentials were not provided');
      return false;
    }

    unauthorized(req, res, 'AUTH_INVALID', 'Authentication failed: invalid credentials');
    return false;
  };

  app.use((_req, res, next) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-RateLimit-Limit', '60');
    res.setHeader('X-RateLimit-Remaining', '59');
    res.setHeader('X-RateLimit-Reset', `${Math.floor(Date.now() / 1000) + 60}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Privacy-Level', 'standard');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  const discoveryManifest = {
    auth_base: 'http://localhost:3000/api/v1',
    memory_base: 'http://localhost:3000/api/v1/memories',
    mcp_ws_base: 'wss://mcp.lanonasis.com/ws',
    mcp_sse: 'https://mcp.lanonasis.com/sse',
    mcp_message: 'https://mcp.lanonasis.com/message',
    keys_base: 'http://localhost:3000/api/v1/keys',
    project_scope: options.validProjectScope,
    version: '1.0.0',
    discovery_version: '2025.01',
    last_updated: new Date().toISOString(),
    environment: 'development',
    capabilities: {
      auth: ['jwt', 'api_key', 'cli_token'],
      protocols: ['https', 'wss', 'sse'],
      formats: ['application/json'],
    },
    endpoints: {
      health: 'http://localhost:3000/health',
    },
  };

  const applyCorsHeaders = (res: express.Response, origin: string) => {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key');
    res.setHeader('Access-Control-Max-Age', '600');
  };

  app.options('/.well-known/onasis.json', (req, res) => {
    const origin = req.get('Origin');

    if (origin && ALLOWED_CORS_ORIGINS.includes(origin)) {
      applyCorsHeaders(res, origin);
      return res.status(204).end();
    }

    return res.status(403).end();
  });

  app.get('/.well-known/onasis.json', (req, res) => {
    const origin = req.get('Origin');
    if (origin && ALLOWED_CORS_ORIGINS.includes(origin)) {
      applyCorsHeaders(res, origin);
    }

    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('ETag', '"mock-manifest"');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }

    res.status(200).json({
      data: discoveryManifest,
      request_id: res.getHeader('X-Request-ID'),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', request_id: res.getHeader('X-Request-ID') });
  });

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      dependencies: {
        database: { status: 'healthy', response_time: 12 },
        openai: { status: 'healthy', response_time: 33 },
      },
      request_id: res.getHeader('X-Request-ID'),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/v1/health/ready', (_req, res) => {
    res.status(200).json({
      status: 'ready',
      dependencies: {
        database: 'reachable',
        openai: 'reachable',
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/v1/health/live', (_req, res) => {
    res.status(200).json({
      status: 'alive',
      uptime: 123,
      timestamp: new Date().toISOString(),
    });
  });

  const unauthorized = (
    req: express.Request,
    res: express.Response,
    code: string,
    message: string,
  ) => {
    return res.status(401).json({
      error: {
        code,
        type: 'AUTHENTICATION_ERROR',
        message,
      },
      request_id: res.getHeader('X-Request-ID'),
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      meta: {
        project_scope: req.get('X-Project-Scope') ?? '',
      },
    });
  };

  const forbidden = (
    req: express.Request,
    res: express.Response,
    code: string,
    message: string,
  ) => {
    return res.status(403).json({
      error: {
        code,
        type: 'AUTHORIZATION_ERROR',
        message,
      },
      request_id: res.getHeader('X-Request-ID'),
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      meta: {
        project_scope: req.get('X-Project-Scope') ?? '',
      },
    });
  };

  app.get(['/api/v1/memories', '/api/v1/memories/:id'], (req, res) => {
    const rawProjectScope = req.get('X-Project-Scope');
    if (typeof rawProjectScope === 'undefined') {
      return unauthorized(req, res, 'AUTH_MISSING_PROJECT_SCOPE', 'Missing required X-Project-Scope header');
    }

    const projectScope = rawProjectScope.trim();

    if (!projectScope) {
      return forbidden(req, res, 'INVALID_PROJECT_SCOPE', 'Provided project scope is not authorized');
    }

    if (projectScope !== options.validProjectScope) {
      return forbidden(req, res, 'INVALID_PROJECT_SCOPE', 'Provided project scope is not authorized');
    }

    const apiKeyHeader = req.get('X-API-Key');
    const authorizationHeader = req.get('Authorization');

    const sanitizedApiKey = (apiKeyHeader ?? '').trim();

    if (sanitizedApiKey.length > 0) {
      if (sanitizedApiKey === options.validApiKey) {
        return res.status(200).json({
          data: [],
          meta: {
            auth_method: 'api_key',
            project_scope: projectScope,
            request_id: res.getHeader('X-Request-ID'),
          },
        });
      }

      return unauthorized(req, res, 'AUTH_INVALID', 'Authentication failed: invalid credentials');
    }

    if (!authorizationHeader) {
      return unauthorized(req, res, 'AUTHENTICATION_REQUIRED', 'Authentication credentials were not provided');
    }

    const normalizedAuth = authorizationHeader.trim();

    if (!normalizedAuth.toLowerCase().startsWith('bearer ')) {
      return unauthorized(req, res, 'INVALID_AUTH_HEADER', 'Malformed Authorization header');
    }

    const token = normalizedAuth.slice(7).trim();

    if (!token || token.includes(' ')) {
      return unauthorized(req, res, 'INVALID_AUTH_HEADER', 'Malformed Authorization header');
    }

    if (token === options.validApiKey) {
      return unauthorized(
        req,
        res,
        'INVALID_AUTH_HEADER',
        'API key cannot be supplied using the Authorization header',
      );
    }

    if (EXPIRED_TOKEN_PATTERN.test(token)) {
      return unauthorized(req, res, 'INVALID_JWT', 'Provided token is invalid or expired');
    }

    if (token !== options.validJwt) {
      return unauthorized(req, res, 'INVALID_JWT', 'Provided token is invalid or expired');
    }

    return res.status(200).json({
      data: [],
      meta: {
        auth_method: 'jwt',
        project_scope: projectScope,
        request_id: res.getHeader('X-Request-ID'),
      },
    });
  });

  app.get('/api/v1/memory', (req, res) => {
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    res.status(200).json({
      data: [],
      meta: {
        alias: 'memory',
        request_id: res.getHeader('X-Request-ID'),
      },
    });
  });

  app.get('/api/v1/services', (_req, res) => {
    res.status(200).json({
      data: [
        { id: 'memory', status: 'healthy', protocol: 'https' },
        { id: 'mcp', status: 'healthy', protocol: 'sse' },
      ],
      request_id: res.getHeader('X-Request-ID'),
    });
  });

  app.get('/api/v1/services/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      services: {
        memory: 'healthy',
        mcp: 'healthy',
      },
    });
  });

  app.get('/api/v1/services/auth/test', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      provider: 'mock-auth',
    });
  });

  app.get('/api/v1/services/mcp/test', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      transport: 'sse',
    });
  });

  app.post('/api/v1/services/sync', (req, res) => {
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    res.status(200).json({
      status: 'synced',
      request_id: res.getHeader('X-Request-ID'),
      actor: validApiKeyHeaders(req) ? 'api_key' : 'jwt',
    });
  });

  app.get('/api/v1/metrics', (req, res) => {
    if (req.get('Authorization')?.trim() !== validBearer) {
      return unauthorized(req, res, 'AUTHENTICATION_REQUIRED', 'Authentication credentials were not provided');
    }

    res.type('text/plain').status(200).send('memory_requests_total 42\n');
  });

  app.get('/api/v1/metrics/json', (req, res) => {
    if (req.get('Authorization')?.trim() !== validBearer) {
      return unauthorized(req, res, 'AUTHENTICATION_REQUIRED', 'Authentication credentials were not provided');
    }

    if (req.get('X-Plan') !== 'pro') {
      return forbidden(req, res, 'PLAN_UPGRADE_REQUIRED', 'Current plan does not allow metrics access');
    }

    res.status(200).json({
      metrics: {
        memory_requests_total: 42,
        active_sessions: 2,
      },
    });
  });

  return app;
}

/**
 * Creates a test API client configured either against an external base URL or an in-process mock server.
 *
 * When the TEST_API_BASE environment variable is set, the returned client targets that base URL. Otherwise
 * the function builds an in-process Express mock app (with authentication, CORS, discovery manifest, and
 * memory endpoints) and returns a supertest-bound client for it.
 *
 * @param options - Configuration for the mock server (validApiKey, validJwt, validProjectScope).
 * @returns An object with `client` (a supertest request instance) and `close` (a no-op Promise-resolving function).
 */
export async function createTestApiClient(options: TestApiClientOptions): Promise<TestApiClient> {
  if (process.env.TEST_API_BASE) {
    return {
      client: request(process.env.TEST_API_BASE),
      close: () => Promise.resolve(),
    };
  }

  const app = buildMockApp(options);
  return {
    client: request(app),
    close: () => Promise.resolve(),
  };
}
