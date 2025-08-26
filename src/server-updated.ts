import express from 'express';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { metricsMiddleware, startMetricsCollection } from '@/utils/metrics';

// NEW: Core alignment middleware
import {
  attachRequestId,
  corsGuard,
  errorEnvelope,
  notFoundHandler,
  successEnvelope,
  centralAuth,
  requirePlan,
  planBasedRateLimit,
  optionalAuth
} from '@/middleware/index';

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

const app = express();

// ============================================
// PHASE 0: CRITICAL MIDDLEWARE CHAIN
// Order is critical - DO NOT CHANGE
// ============================================

// 1. FIRST: Attach request ID to every request
app.use(attachRequestId);

// 2. Basic Express middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. CORS and security headers (replaces old cors/helmet)
app.use(corsGuard);

// 4. Metrics collection
app.use(metricsMiddleware);

// ============================================
// SERVICE DISCOVERY - PUBLIC ENDPOINT
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
    environment: process.env.NODE_ENV || 'development',
    capabilities: {
      auth: ['jwt', 'api_key'],
      protocols: ['http', 'https', 'ws', 'wss', 'sse'],
      formats: ['json', 'yaml', 'csv', 'markdown'],
      features: ['bulk_operations', 'semantic_search', 'real_time']
    }
  };
  
  res.json(successEnvelope(manifest, req, { cached: false }));
});

// ============================================
// SWAGGER DOCUMENTATION
// ============================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Memory as a Service (MaaS) API',
      version: '1.2.0',
      description: `
        ## Enterprise-grade Memory Management Microservice
        
        The Memory as a Service (MaaS) API provides intelligent memory management with semantic search capabilities. 
        Built for enterprise use with multi-tenant support, role-based access control, and vector-based similarity search.
        
        ### 🔄 Core Alignment Features
        - **Service Discovery**: Automatic endpoint resolution via \`/.well-known/onasis.json\`
        - **Dual Authentication**: JWT tokens for users, X-API-Key for machines
        - **Request Tracking**: Every request includes X-Request-ID for debugging
        - **Plan-based Limits**: Rate limiting based on user subscription tier
        - **Uniform Errors**: Consistent error envelopes with request tracking
        - **CORS Protection**: Environment-based origin allowlists
        
        ### Key Features
        - 🧠 **Semantic Search**: Vector-based similarity search using OpenAI embeddings
        - 🏷️ **Smart Categorization**: Memory types, tags, and topics for organization
        - 👥 **Multi-tenant**: Organization-based isolation with role-based access
        - 📊 **Analytics**: Usage statistics and access tracking
        - 🔐 **Security**: JWT authentication with plan-based limitations
        - ⚡ **Performance**: Optimized queries with pagination and caching
        - 🔑 **API Key Management**: Secure storage and rotation of API keys with MCP integration
        - 🤖 **MCP Support**: Model Context Protocol for secure AI agent access to secrets
      `,
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
        url: `http://${config.HOST}:${config.PORT}`,
        description: 'Development server'
      },
      {
        url: 'https://api.lanonasis.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for user authentication'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for machine-to-machine authentication'
        }
      },
      parameters: {
        ProjectScope: {
          name: 'X-Project-Scope',
          in: 'header',
          required: true,
          schema: {
            type: 'string',
            enum: ['lanonasis-maas']
          },
          description: 'Project scope identifier (required for all authenticated requests)'
        },
        RequestID: {
          name: 'X-Request-ID',
          in: 'header',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Unique request identifier (auto-generated if not provided)'
        }
      },
      responses: {
        ErrorEnvelope: {
          description: 'Standard error response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      type: { type: 'string' },
                      code: { type: 'string' }
                    }
                  },
                  request_id: { type: 'string', format: 'uuid' },
                  timestamp: { type: 'string', format: 'date-time' },
                  path: { type: 'string' },
                  method: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/server.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI setup
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MaaS API Documentation',
  swaggerOptions: {
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
}));

// Swagger JSON endpoint
app.get('/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

// ============================================
// HEALTH CHECK - PUBLIC ENDPOINT
// ============================================
app.use('/health', healthRoutes);

// ============================================
// PROTECTED ROUTES - REQUIRE AUTH
// ============================================

// API Routes with authentication
app.use('/api/v1/memories', centralAuth, planBasedRateLimit(), memoryRoutes);
app.use('/api/v1/keys', centralAuth, planBasedRateLimit(), apiKeyRoutes);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auth-basic', authBasicRoutes);
app.use('/api/v1/metrics', centralAuth, requirePlan('pro'), metricsRoutes);
app.use('/api/v1/emergency', centralAuth, requirePlan('enterprise'), emergencyRoutes);

// MCP Routes with authentication
app.use('/mcp/keys', centralAuth, planBasedRateLimit(), mcpApiKeyRoutes);
app.use('/mcp/sse', centralAuth, mcpSseRoutes);

// Service registry (admin only)
app.use('/registry', centralAuth, requirePlan('enterprise'), serviceRegistry);

// ============================================
// STATIC FILE SERVING
// ============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../../public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Serve dashboard files
app.use(express.static(path.join(__dirname, '../../dashboard/dist'), {
  maxAge: '1h',
  etag: true,
  lastModified: true
}));

// ============================================
// ERROR HANDLING - MUST BE LAST
// ============================================

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorEnvelope);

// ============================================
// SERVER STARTUP
// ============================================

const PORT = config.PORT || 3000;
const HOST = config.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    // Start metrics collection
    startMetricsCollection();
    
    // Start the server
    const server = app.listen(PORT, HOST, () => {
      console.log(`
🚀 MaaS Server Started Successfully
  
📍 Server: http://${HOST}:${PORT}
🔍 API Docs: http://${HOST}:${PORT}/docs  
🏥 Health: http://${HOST}:${PORT}/health
📋 Discovery: http://${HOST}:${PORT}/.well-known/onasis.json
🔧 Environment: ${process.env.NODE_ENV || 'development'}

🔑 Authentication:
  • JWT: Authorization: Bearer <token>
  • API Key: X-API-Key: <key>
  • Project Scope: X-Project-Scope: lanonasis-maas

📊 Middleware Stack:
  ✅ Request ID tracking
  ✅ CORS protection (${process.env.ALLOWED_ORIGINS ? 'configured' : 'default'})
  ✅ Central authentication
  ✅ Plan-based rate limiting
  ✅ Uniform error envelopes
  ✅ Service discovery manifest

Ready for production deployment! 🎉
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };
export default app;