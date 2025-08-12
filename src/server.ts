import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { authMiddleware } from '@/middleware/auth';
import { metricsMiddleware, startMetricsCollection } from '@/utils/metrics';

// Route imports
import healthRoutes from '@/routes/health';
import memoryRoutes from '@/routes/memory';
import authRoutes from '@/routes/auth';
import metricsRoutes from '@/routes/metrics';
import apiKeyRoutes from '@/routes/api-keys';
import mcpApiKeyRoutes from '@/routes/mcp-api-keys';
import mcpSseRoutes from '@/routes/mcp-sse';
import emergencyRoutes from '@/routes/emergency-admin';
import oauthRoutes from '@/routes/oauth';

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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https:"],
      workerSrc: ["'self'", "blob:"]
    }
  }
}));

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://api.lanonasis.com',
      'https://dashboard.lanonasis.com', 
      'https://mcp.lanonasis.com',
      'https://docs.lanonasis.com',
      'https://api.vortexai.io',
      'https://gateway.apiendpoint.net',
      'https://onasis.io',
      'https://connectionpoint.tech',
      'https://vortexcore.app'
    ]
  : [
      'http://localhost:3000', 
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log blocked origin for debugging
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Session-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Request logging and metrics
app.use(requestLogger);
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

// Health check (no auth required)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/health`, healthRoutes);

// Authentication routes (no auth required for login/register)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/auth`, authRoutes);

// OAuth routes (no auth required for OAuth flow)
app.use(`${config.API_PREFIX}/${config.API_VERSION}`, oauthRoutes);

// Emergency admin route (TEMPORARY - REMOVE AFTER SETUP)
if (process.env.EMERGENCY_BOOTSTRAP_TOKEN) {
  app.use(`${config.API_PREFIX}/${config.API_VERSION}`, emergencyRoutes);
  console.warn('⚠️  EMERGENCY ADMIN ROUTE ACTIVE - Remove after initial setup!');
}

// Protected routes
app.use(`${config.API_PREFIX}/${config.API_VERSION}/memory`, authMiddleware, memoryRoutes);
app.use(`${config.API_PREFIX}/${config.API_VERSION}/api-keys`, apiKeyRoutes);

// MCP routes (for AI agents - different auth mechanism)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/mcp/api-keys`, mcpApiKeyRoutes);
app.use('/mcp', mcpSseRoutes);

// Metrics endpoint (no auth required for Prometheus scraping)
app.use('/metrics', metricsRoutes);

// Root endpoint - Enterprise Services Landing Page
app.get('/', (req, res) => {
  // Check if request prefers JSON (API clients) or HTML (browsers)
  const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
  const isApiRequest = req.get('User-Agent')?.includes('curl') || 
                      req.get('User-Agent')?.includes('Postman') ||
                      req.get('User-Agent')?.includes('HTTPie') ||
                      acceptsJson;

  if (isApiRequest || req.query.format === 'json') {
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

// Global error handler
app.use(errorHandler);

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