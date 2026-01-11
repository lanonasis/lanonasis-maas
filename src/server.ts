import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { metricsMiddleware, startMetricsCollection } from '@/utils/metrics';

// CORE ALIGNMENT: Enhanced middleware imports
import {
  attachRequestId,
  corsGuard,
  alignedAuthMiddleware,
  globalErrorHandler,
  notFoundHandler,
  createSuccessEnvelope,
  validateProjectScope,
  requirePlan,
  planBasedRateLimit
} from '@/middleware/auth-aligned';

// Route imports
import healthRoutes from '@/routes/health';
import memoryRoutes from '@/routes/memory';
import authRouter from '@/routes/auth-router';
import authBasicRoutes from '@/routes/auth-basic';
import serviceRegistry from '@/routes/service-registry';
import metricsRoutes from '@/routes/metrics';
import apiKeyRoutes from '@/routes/api-keys';
import mcpApiKeyRoutes from '@/routes/mcp-api-keys';
import mcpSseRoutes from '@/routes/mcp-sse';
import emergencyRoutes from '@/routes/emergency-admin';

// AI Client middleware for JSON responses
import { aiClientMiddleware, AIClientRequest } from '@/middleware/ai-client-json';

const app = express();

// Enhanced Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Memory as a Service (MaaS) API',
      version: '1.0.0',
      description: `
        ## Enterprise-grade Memory Management Microservice
        
        The Memory as a Service (MaaS) API provides intelligent memory management with semantic search capabilities. 
        Built for enterprise use with multi-tenant support, role-based access control, and vector-based similarity search.
        
        ### Key Features
        - 🧠 **Semantic Search**: Vector-based similarity search using OpenAI embeddings
        - 🏷️ **Smart Categorization**: Memory types, tags, and topics for organization
        - 👥 **Multi-tenant**: Organization-based isolation with role-based access
        - 📊 **Analytics**: Usage statistics and access tracking
        - 🔐 **Security**: JWT authentication with plan-based limitations
        - ⚡ **Performance**: Optimized queries with pagination and caching
        - 🔑 **API Key Management**: Secure storage and rotation of API keys with MCP integration
        - 🤖 **MCP Support**: Model Context Protocol for secure AI agent access to secrets
        
        ### Memory Types
        - **context**: General contextual information
        - **project**: Project-specific knowledge and documentation
        - **knowledge**: Educational content and reference materials
        - **reference**: Quick reference information and code snippets
        - **personal**: User-specific private memories
        - **workflow**: Process and procedure documentation
        
        ### Plans & Limits
        - **Free**: Up to 100 memories per organization
        - **Pro**: Up to 10,000 memories per organization + bulk operations
        - **Enterprise**: Unlimited memories + advanced features
      `,
      termsOfService: 'https://api.lanonasis.com/terms',
      contact: {
        name: 'Lanonasis Support',
        email: 'support@lanonasis.com',
        url: 'https://docs.lanonasis.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://${config.HOST}:${config.PORT}${config.API_PREFIX}/${config.API_VERSION}`,
        description: 'Development server'
      },
      {
        url: `https://api.lanonasis.com${config.API_PREFIX}/${config.API_VERSION}`,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login or /auth/register'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication'
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and token management'
      },
      {
        name: 'Memory',
        description: 'Memory CRUD operations and semantic search'
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints'
      },
      {
        name: 'Metrics',
        description: 'Performance metrics and monitoring data'
      },
      {
        name: 'API Key Management',
        description: 'Secure API key storage, rotation, and management'
      },
      {
        name: 'MCP Integration',
        description: 'Model Context Protocol for secure AI agent access to secrets'
      },
      {
        name: 'Analytics',
        description: 'Usage analytics and security event monitoring'
      }
    ],
    externalDocs: {
      description: 'Full API Documentation',
      url: 'https://docs.lanonasis.com/api'
    }
  },
  apis: ['./src/routes/*.ts', './src/types/*.ts']
};

const specs = swaggerJsdoc(swaggerOptions);

// ============================================
// CORE ALIGNMENT: Phase 0 Middleware Chain
// Order is critical - DO NOT CHANGE
// ============================================

// 1. FIRST: Attach request ID to every request
app.use(attachRequestId);

// 2. Security headers via helmet (comprehensive protection)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.lanonasis.com", "https://dashboard.lanonasis.com", "wss://api.lanonasis.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Swagger UI assets
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow dashboard assets
}));

// 3. AI Client Detection (BEFORE any routing)
app.use(aiClientMiddleware);

// 4. Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. CORE ALIGNMENT: CORS handler (works with helmet for full security)
app.use(corsGuard);

// 6. Metrics collection
app.use(metricsMiddleware);

// Static file serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist')));
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
});

// Serve MCP connection interface
app.get('/mcp', (req, res) => {
  res.sendFile(path.join(__dirname, 'static/mcp-connection.html'));
});

// Serve documentation portal
app.use('/docs-portal', express.static(path.join(__dirname, '../docs/dist')));
app.get('/docs-portal/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../docs/dist/index.html'));
});

// API Documentation with improved configuration
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Memory as a Service API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch']
  }
};

// Serve Swagger UI documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// ============================================
// CORE ALIGNMENT: Service Discovery Endpoint
// ============================================
app.get('/.well-known/onasis.json', (req, res) => {
  const manifest = {
    auth_base: `${req.protocol}://${req.get('host')}${config.API_PREFIX}/${config.API_VERSION}`,
    memory_base: `${req.protocol}://${req.get('host')}${config.API_PREFIX}/${config.API_VERSION}/memories`,
    mcp_ws_base: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}`,
    mcp_sse: `${req.protocol}://${req.get('host')}/mcp/sse`,
    mcp_message: `${req.protocol}://${req.get('host')}/mcp/message`,
    keys_base: `${req.protocol}://${req.get('host')}${config.API_PREFIX}/${config.API_VERSION}/keys`,
    project_scope: 'lanonasis-maas',
    version: '1.2.0',
    discovery_version: '0.1',
    last_updated: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    capabilities: {
      auth: ['jwt', 'api_key'],
      protocols: ['http', 'https', 'ws', 'wss', 'sse'],
      formats: ['json', 'yaml', 'csv', 'markdown'],
      features: ['bulk_operations', 'semantic_search', 'real_time']
    }
  };
  
  res.json(createSuccessEnvelope(manifest, req, { cached: false }));
});

// Health check (no auth required)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/health`, healthRoutes);

// Centralized service registry (lists all available services)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/services`, serviceRegistry);

// Centralized authentication routes (proxy to oauth-client)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/auth`, authRouter);

// Basic authentication routes (for CLI and direct API access)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/auth/basic`, authBasicRoutes);

// Emergency admin route (TEMPORARY - REMOVE AFTER SETUP)
if (process.env.EMERGENCY_BOOTSTRAP_TOKEN) {
  app.use(`${config.API_PREFIX}/${config.API_VERSION}`, emergencyRoutes);
  console.warn('⚠️  EMERGENCY ADMIN ROUTE ACTIVE - Remove after initial setup!');
}

// ============================================
// CORE ALIGNMENT: Protected Routes with New Auth
// ============================================
// Memory routes (require auth + project scope)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/memory`, validateProjectScope, alignedAuthMiddleware, planBasedRateLimit(), memoryRoutes);
app.use(`${config.API_PREFIX}/${config.API_VERSION}/memories`, validateProjectScope, alignedAuthMiddleware, planBasedRateLimit(), memoryRoutes);

// API key management routes (require auth)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/keys`, validateProjectScope, alignedAuthMiddleware, apiKeyRoutes);
app.use(`${config.API_PREFIX}/${config.API_VERSION}/api-keys`, validateProjectScope, alignedAuthMiddleware, apiKeyRoutes);

// Premium features (pro/enterprise only)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/metrics`, validateProjectScope, alignedAuthMiddleware, requirePlan(['pro', 'enterprise']), metricsRoutes);

// MCP routes (with enhanced authentication)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/mcp/api-keys`, validateProjectScope, alignedAuthMiddleware, mcpApiKeyRoutes);
app.use('/mcp', validateProjectScope, alignedAuthMiddleware, mcpSseRoutes);

// Root endpoint - Enterprise Services Landing Page
app.get('/', (req: AIClientRequest, res) => {
  // Use AI client detection from middleware instead of manual checks
  if (req.isAIClient || req.query.format === 'json') {
    // Return JSON for API clients
    res.json({
      platform: 'LanOnasis Enterprise Services',
      tagline: 'Unified API Gateway for Enterprise Solutions',
      version: '1.0.0',
      status: 'operational',
      baseUrl: 'https://api.lanonasis.com',
      services: {
        memory: {
          name: 'Memory as a Service (MaaS)',
          description: 'AI-powered memory management with semantic search',
          endpoints: {
            base: `${config.API_PREFIX}/${config.API_VERSION}/memory`,
            docs: '/docs#memory'
          },
          features: ['Vector Search', 'Multi-tenant', 'Role-based Access', 'Analytics']
        },
        apiKeys: {
          name: 'API Key Management',
          description: 'Secure storage and rotation of API keys',
          endpoints: {
            base: `${config.API_PREFIX}/${config.API_VERSION}/api-keys`,
            docs: '/docs#api-keys'
          },
          features: ['Secure Storage', 'Automatic Rotation', 'Access Control', 'Audit Logging']
        },
        mcp: {
          name: 'Model Context Protocol',
          description: 'Secure AI agent access to enterprise secrets',
          endpoints: {
            base: `${config.API_PREFIX}/${config.API_VERSION}/mcp`,
            docs: '/docs#mcp'
          },
          features: ['AI Agent Integration', 'Secure Context', 'Zero-trust Access', 'Real-time Updates']
        }
      },
      endpoints: {
        documentation: '/docs',
        dashboard: '/dashboard',
        health: `${config.API_PREFIX}/${config.API_VERSION}/health`,
        authentication: `${config.API_PREFIX}/${config.API_VERSION}/auth`,
        mcp: '/mcp',
        metrics: '/metrics'
      },
      integrations: {
        database: 'Supabase PostgreSQL with Vector Extensions',
        authentication: 'JWT with Role-based Access Control',
        ai: 'OpenAI Embeddings for Semantic Search',
        monitoring: 'Prometheus Metrics & Winston Logging'
      },
      support: {
        documentation: 'https://docs.lanonasis.com',
        contact: 'support@lanonasis.com',
        github: 'https://github.com/lanonasis'
      }
    });
  } else {
    // Serve HTML landing page for browsers
    res.sendFile(path.join(__dirname, 'static/index.html'));
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ============================================
// CORE ALIGNMENT: Error Handling (MUST BE LAST)
// ============================================
// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (replaces old errorHandler)
app.use(globalErrorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start metrics collection
if (config.ENABLE_METRICS) {
  startMetricsCollection();
}

const server = app.listen(config.PORT, config.HOST, () => {
  logger.info(`Memory Service running on http://${config.HOST}:${config.PORT}`);
  logger.info(`API Documentation available at http://${config.HOST}:${config.PORT}/docs`);
  if (config.ENABLE_METRICS) {
    logger.info(`Metrics available at http://${config.HOST}:${config.PORT}/metrics`);
  }
  logger.info(`Environment: ${config.NODE_ENV}`);
});

export { app, server };