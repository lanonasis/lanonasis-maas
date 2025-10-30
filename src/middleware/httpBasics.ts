import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Request interface to include id
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Attach unique request ID to every request for tracking and debugging
 */
export const attachRequestId = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.id = crypto.randomUUID();

  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', req.id);

  // Log request with ID for debugging
  console.log(`[${req.id}] ${req.method} ${req.url} from ${req.ip}`);

  next();
};

/**
 * CORS guard with environment-based origin allowlist
 */
export const corsGuard = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.get('Origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
    'https://dashboard.lanonasis.com',
    'https://docs.lanonasis.com',
    'https://api.lanonasis.com'
  ];

  // Add development origins if not in production
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    );
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Project-Scope, X-Request-ID');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      res.status(204).send();
      return;
    } else {
      console.warn(`[${req.id}] CORS preflight blocked for origin: ${origin}`);
      res.status(403).json({
        error: {
          message: 'CORS policy violation',
          type: 'CORSError',
          code: 'ORIGIN_NOT_ALLOWED'
        },
        request_id: req.id,
        timestamp: new Date().toISOString()
      });
      return;
    }
  }

  // Handle actual requests
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      console.warn(`[${req.id}] CORS blocked for origin: ${origin}`);
      res.status(403).json({
        error: {
          message: 'CORS policy violation',
          type: 'CORSError',
          code: 'ORIGIN_NOT_ALLOWED'
        },
        request_id: req.id,
        timestamp: new Date().toISOString()
      });
      return;
    }
  }

  // Add security headers to all responses
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('X-Privacy-Level', 'standard');

  next();
};

/**
 * Uniform error envelope for all error responses
 */
export const errorEnvelope = (error: unknown, req: Request, res: Response, next: NextFunction): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalizedError = error as Partial<Error> & {
    status?: number;
    statusCode?: number;
    code?: string;
  };

  const status = normalizedError.status || normalizedError.statusCode || 500;
  const message = normalizedError.message || 'Internal Server Error';
  const type = normalizedError.constructor?.name || 'Error';
  const code = normalizedError.code || 'INTERNAL_ERROR';

  console.error(`[${req.id}] Error ${status}: ${message}`, {
    error: normalizedError.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(status).json({
    error: {
      message,
      type,
      code
    },
    request_id: req.id || 'unknown',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      type: 'NotFoundError',
      code: 'ENDPOINT_NOT_FOUND'
    },
    request_id: req.id || 'unknown',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    available_endpoints: [
      '/health',
      '/api/v1/*',
      '/mcp/*',
      '/docs',
      '/.well-known/onasis.json'
    ]
  });
};

/**
 * Success response envelope for consistent API responses
 */
export const successEnvelope = <TData, TMeta = Record<string, unknown> | undefined>(
  data: TData,
  req: Request,
  meta?: TMeta
) => {
  return {
    data,
    request_id: req.id,
    timestamp: new Date().toISOString(),
    ...(meta && { meta })
  };
};