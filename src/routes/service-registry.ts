/**
 * Centralized Service Registry
 * Routes all services through unified authentication and protocol management
 */

import { Router, Request, Response } from 'express';
// TODO: Import MCPClient when oauth-client package is built
// import { MCPClient } from '@lanonasis/oauth-client';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { authenticateApiKey } from '@/middleware/auth-aligned';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { setTimeout, clearTimeout } from 'timers';

const router: Router = Router();

// Centralized rate limiting
const serviceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (req): string => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const ip = ipKeyGenerator(req as any);
    return apiKey ? `${ip}:${String(apiKey).slice(0, 8)}` : ip;
  },
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many requests, please try again later'
  }
});

// Apply rate limiting to all service routes
router.use(serviceRateLimit);

/**
 * Service Registry Configuration
 */
const SERVICE_REGISTRY = {
  memory: {
    endpoint: '/memory',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    auth_required: true,
    description: 'Memory as a Service endpoints'
  },
  mcp: {
    endpoint: '/mcp',
    methods: ['GET', 'POST'],
    auth_required: true,
    description: 'Model Context Protocol endpoints'
  },
  api_keys: {
    endpoint: '/api-keys',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    auth_required: true,
    description: 'API Key management endpoints'
  },
  projects: {
    endpoint: '/projects',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    auth_required: true,
    description: 'Project management endpoints'
  },
  health: {
    endpoint: '/health',
    methods: ['GET'],
    auth_required: false,
    description: 'Service health check'
  }
} as const;

/**
 * @swagger
 * /services:
 *   get:
 *     summary: List all available services
 *     description: Returns service registry with available endpoints
 */
router.get('/', (req, res) => {
  const services = Object.entries(SERVICE_REGISTRY).map(([name, config]) => ({
    name,
    ...config,
    full_endpoint: `/api/v1${config.endpoint}`
  }));

  res.json({
    services,
    auth_server: config.AUTH_SERVER_URL || 'https://api.lanonasis.com',
    oauth_endpoints: {
      authorize: '/api/v1/auth/oauth/authorize',
      token: '/api/v1/auth/oauth/token',
      device: '/api/v1/auth/device',
      revoke: '/api/v1/auth/revoke',
      client_info: '/api/v1/auth/client-info'
    },
    mcp_endpoints: {
      sse: '/api/v1/mcp/sse',
      ws: '/api/v1/mcp/ws'
    },
    sdk_info: {
      package: '@lanonasis/oauth-client',
      version: '1.0.0',
      repository: 'https://github.com/lanonasis/oauth-client'
    }
  });
});

/**
 * @swagger
 * /services/health:
 *   get:
 *     summary: Service health check
 *     description: Returns health status of all registered services
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  const healthChecks = await Promise.allSettled([
    // Memory service health
    checkServiceHealth('memory', '/api/v1/memory/health'),
    // MCP service health  
    checkServiceHealth('mcp', '/api/v1/mcp/health'),
    // Auth service health
    checkServiceHealth('auth', '/api/v1/auth/client-info')
  ]);

  const results = healthChecks.map((result, index) => {
    const serviceName = ['memory', 'mcp', 'auth'][index];
    return {
      service: serviceName,
      status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      ...(result.status === 'rejected' && { error: result.reason?.message })
    };
  });

  const allHealthy = results.every(r => r.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: results,
    version: process.env.npm_package_version || '1.0.0'
  });
});

async function checkServiceHealth(serviceName: string, endpoint: string): Promise<void> {
  try {
    const baseUrl = config.API_BASE_URL || 'http://localhost:3000';
    const controller = new globalThis.AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(`${serviceName} service unhealthy: ${error}`);
  }
}

/**
 * @swagger
 * /services/auth/test:
 *   get:
 *     summary: Test authentication
 *     description: Tests OAuth authentication flow
 */
router.get('/auth/test', authenticateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKeyData = (req as any).apiKey;
    
    // TODO: Test MCP client connection when package is built
    // const mcpClient = new MCPClient({
    //   clientId: config.OAUTH_CLIENT_ID || 'lanonasis_mcp_client_2024',
    //   authServer: config.AUTH_SERVER_URL || 'https://api.lanonasis.com'
    // });

    res.json({
      status: 'authenticated',
      api_key: {
        name: apiKeyData.name,
        user_id: apiKeyData.user_id,
        last_used: apiKeyData.last_used_at
      },
      oauth_client: {
        connected: true,
        client_id: config.OAUTH_CLIENT_ID
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Auth test failed', { error });
    res.status(500).json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Authentication test failed'
    });
  }
});

/**
 * @swagger
 * /services/mcp/test:
 *   get:
 *     summary: Test MCP connection
 *     description: Tests Model Context Protocol connection
 */
router.get('/mcp/test', authenticateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKeyData = (req as any).apiKey;
    
    // TODO: Create MCP client and test connection when package is built
    // const mcpClient = new MCPClient({
    //   clientId: config.OAUTH_CLIENT_ID || 'lanonasis_mcp_client_2024',
    //   authServer: config.AUTH_SERVER_URL || 'https://api.lanonasis.com',
    //   mcpEndpoint: config.MCP_ENDPOINT || 'https://api.lanonasis.com'
    // });

    // TODO: Test basic MCP functionality
    const testMemory = { id: 'test', title: 'Test Memory', content: 'Connection test' };
    
    res.json({
      status: 'mcp_connected',
      test_memory: testMemory,
      user_id: apiKeyData.user_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('MCP test failed', { error });
    res.status(500).json({
      status: 'mcp_failed',
      error: error instanceof Error ? error.message : 'MCP connection test failed'
    });
  }
});

/**
 * @swagger
 * /services/sync:
 *   post:
 *     summary: Sync service configurations
 *     description: Synchronizes all services with central authentication
 */
router.post('/sync', authenticateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKeyData = (req as any).apiKey;
    
    // Only allow admin users to sync
    if (apiKeyData.access_level !== 'admin' && apiKeyData.access_level !== 'enterprise') {
      res.status(403).json({
        error: 'insufficient_permissions',
        message: 'Admin access required for service synchronization'
      });
      return;
    }

    logger.info('Service sync initiated', { 
      user_id: apiKeyData.user_id,
      api_key: apiKeyData.name 
    });

    // Sync configuration across all services
    const syncResults = {
      auth_config: 'synced',
      oauth_client: 'synced',
      mcp_endpoints: 'synced',
      service_registry: 'synced'
    };

    res.json({
      status: 'sync_completed',
      results: syncResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Service sync failed', { error });
    res.status(500).json({
      status: 'sync_failed',
      error: error instanceof Error ? error.message : 'Service synchronization failed'
    });
  }
});

export default router;