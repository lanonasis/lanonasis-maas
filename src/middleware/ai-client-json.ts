import { Request, Response, NextFunction } from 'express';

/**
 * AI Client JSON Middleware
 * Ensures all AI clients (Claude Desktop, API tools, etc.) receive proper JSON responses
 * Prevents SPA routing from serving HTML instead of JSON
 */

interface AIClientRequest extends Request {
  isAIClient?: boolean;
  clientType?: string;
}

/**
 * Detect if the request is from an AI client or API tool
 */
export function detectAIClient(req: AIClientRequest, res: Response, next: NextFunction): void {
  const userAgent = req.get('User-Agent')?.toLowerCase() || '';
  const acceptHeader = req.get('Accept') || '';
  const contentType = req.get('Content-Type') || '';
  
  // AI Client detection patterns
  const aiClientPatterns = [
    'claude',
    'anthropic',
    'mcp',
    'model-context-protocol',
    'curl',
    'postman',
    'insomnia', 
    'httpie',
    'wget',
    'python-requests',
    'axios',
    'fetch',
    'node-fetch',
    'got',
    'superagent'
  ];
  
  // API client indicators
  const apiIndicators = [
    acceptHeader.includes('application/json'),
    acceptHeader.includes('*/*'),
    contentType.includes('application/json'),
    req.path.startsWith('/api/'),
    req.path.startsWith('/mcp'),
    req.query.format === 'json',
    req.headers['x-requested-with'] === 'XMLHttpRequest',
    req.headers['x-api-client'] !== undefined,
    req.headers['x-mcp-client'] !== undefined,
    // Specific AI client headers
    req.headers['x-claude-client'] !== undefined,
    req.headers['anthropic-client'] !== undefined
  ];
  
  // Check for AI client user agents
  const isAIClientUA = aiClientPatterns.some(pattern => userAgent.includes(pattern));
  
  // Check for API client indicators
  const hasAPIIndicators = apiIndicators.some(indicator => indicator);
  
  // Determine if this is an AI/API client
  req.isAIClient = isAIClientUA || hasAPIIndicators || !acceptHeader.includes('text/html');
  
  // Determine client type for logging
  if (userAgent.includes('claude') || userAgent.includes('anthropic')) {
    req.clientType = 'claude-desktop';
  } else if (userAgent.includes('mcp') || req.headers['x-mcp-client']) {
    req.clientType = 'mcp-client';
  } else if (userAgent.includes('curl')) {
    req.clientType = 'curl';
  } else if (userAgent.includes('postman')) {
    req.clientType = 'postman';
  } else if (userAgent.includes('python')) {
    req.clientType = 'python-client';
  } else if (userAgent.includes('node')) {
    req.clientType = 'node-client';
  } else if (req.isAIClient) {
    req.clientType = 'api-client';
  } else {
    req.clientType = 'web-browser';
  }
  
  // Log AI client requests for debugging
  if (req.isAIClient && process.env.LOG_LEVEL === 'debug') {
    console.log(`[AI Client] ${req.clientType}: ${req.method} ${req.path}`, {
      userAgent: userAgent.substring(0, 100),
      accept: acceptHeader,
      contentType: contentType,
      headers: Object.keys(req.headers).filter(h => h.startsWith('x-'))
    });
  }
  
  next();
}

/**
 * Force JSON response for AI clients
 * Prevents serving HTML when AI clients expect JSON
 */
export function enforceJSONForAIClients(req: AIClientRequest, res: Response, next: NextFunction): void {
  if (req.isAIClient) {
    // Override res.render to prevent HTML responses
    const originalRender = res.render;
    res.render = function(view: string, options?: any, callback?: any) {
      // Instead of rendering HTML, return JSON error
      res.status(406).json({
        error: 'Not Acceptable',
        message: 'This endpoint only supports JSON responses for API clients',
        clientType: req.clientType,
        expectedFormat: 'application/json',
        receivedAccept: req.get('Accept'),
        suggestion: 'Add "Accept: application/json" header or use API endpoints under /api/'
      });
    };
    
    // Override res.sendFile for static files
    const originalSendFile = res.sendFile;
    res.sendFile = function(path: string, options?: any, callback?: any) {
      // For AI clients requesting non-API paths, redirect to API
      if (req.path === '/' || req.path === '/dashboard' || req.path.startsWith('/dashboard/')) {
        res.status(200).json({
          platform: 'LanOnasis Enterprise Services',
          message: 'API client detected. Please use API endpoints.',
          clientType: req.clientType,
          endpoints: {
            api: '/api/v1',
            documentation: '/docs',
            health: '/api/v1/health',
            authentication: '/api/v1/auth',
            memory: '/api/v1/memory',
            apiKeys: '/api/v1/api-keys',
            mcp: '/api/v1/mcp'
          },
          examples: {
            curl: 'curl -H "Accept: application/json" https://api.lanonasis.com/api/v1/health',
            javascript: 'fetch("https://api.lanonasis.com/api/v1/health", { headers: { "Accept": "application/json" } })'
          }
        });
      } else {
        // For other files, call original but add JSON error handling
        if (callback) {
          originalSendFile.call(this, path, options, (err: any) => {
            if (err) {
              res.status(404).json({
                error: 'File Not Found',
                message: 'Requested file not available for API clients',
                clientType: req.clientType,
                path: req.path,
                suggestion: 'Use API endpoints under /api/ for programmatic access'
              });
            } else {
              callback(err);
            }
          });
        } else {
          originalSendFile.call(this, path, options);
        }
      }
    };
    
    // Set response headers for AI clients
    res.setHeader('X-API-Client-Detected', req.clientType || 'unknown');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  
  next();
}

/**
 * Standardize JSON responses for consistency
 */
export function standardizeJSONResponse(req: AIClientRequest, res: Response, next: NextFunction): void {
  // Override res.json to add standard metadata
  const originalJson = res.json;
  res.json = function(body: any) {
    // Add standard metadata for AI clients
    if (req.isAIClient && typeof body === 'object' && body !== null && !body.meta) {
      const standardBody = {
        ...body,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown',
          client_type: req.clientType,
          api_version: 'v1',
          status: res.statusCode >= 400 ? 'error' : 'success'
        }
      };
      return originalJson.call(this, standardBody);
    }
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * Handle SPA routing conflicts
 * Prevents serving HTML when AI clients expect JSON
 */
export function handleSPAConflicts(req: AIClientRequest, res: Response, next: NextFunction): void {
  // If it's an AI client requesting a dashboard route, redirect to API
  if (req.isAIClient && (req.path.startsWith('/dashboard') || req.path === '/')) {
    res.status(200).json({
      platform: 'LanOnasis Enterprise Services',
      message: 'API client detected. Dashboard is for web browsers.',
      clientType: req.clientType,
      redirect: {
        api_base: '/api/v1',
        documentation: '/docs',
        health_check: '/api/v1/health'
      },
      note: 'Use /api/v1/* endpoints for programmatic access'
    });
    return;
  }
  
  next();
}

/**
 * Comprehensive AI client middleware stack
 */
export function aiClientMiddleware(req: AIClientRequest, res: Response, next: NextFunction): void {
  detectAIClient(req, res, () => {
    enforceJSONForAIClients(req, res, () => {
      standardizeJSONResponse(req, res, () => {
        handleSPAConflicts(req, res, next);
      });
    });
  });
}

export { AIClientRequest };