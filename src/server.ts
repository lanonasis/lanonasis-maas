import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

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
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
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

// Protected routes
app.use(`${config.API_PREFIX}/${config.API_VERSION}/memory`, authMiddleware, memoryRoutes);
app.use(`${config.API_PREFIX}/${config.API_VERSION}/api-keys`, apiKeyRoutes);

// MCP routes (for AI agents - different auth mechanism)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/mcp/api-keys`, mcpApiKeyRoutes);

// Metrics endpoint (no auth required for Prometheus scraping)
app.use('/metrics', metricsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Memory as a Service (MaaS)',
    version: '1.0.0',
    status: 'operational',
    documentation: '/docs',
    health: `${config.API_PREFIX}/${config.API_VERSION}/health`
  });
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