import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { config } from '../../src/config/environment';
import { logger } from '../../src/utils/logger';
import { errorHandler } from '../../src/middleware/errorHandler';
import { requestLogger } from '../../src/middleware/requestLogger';
import { authMiddleware } from '../../src/middleware/auth';
import { metricsMiddleware, startMetricsCollection } from '../../src/utils/metrics';

// Route imports
import healthRoutes from '../../src/routes/health';
import memoryRoutes from '../../src/routes/memory';
import authRoutes from '../../src/routes/auth';
import metricsRoutes from '../../src/routes/metrics';
import apiKeyRoutes from '../../src/routes/api-keys';
import mcpApiKeyRoutes from '../../src/routes/mcp-api-keys';

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
      `,
      contact: {
        name: 'Lanonasis Support',
        email: 'support@lanonasis.com',
        url: 'https://docs.lanonasis.com'
      }
    },
    servers: [
      {
        url: 'https://api.lanonasis.com/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
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

// CORS configuration for production
app.use(cors({
  origin: [
    'https://api.lanonasis.com',
    'https://dashboard.lanonasis.com', 
    'https://docs.lanonasis.com',
    'https://mcp.lanonasis.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for serverless
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for production
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Request logging and metrics
app.use(requestLogger);
app.use(metricsMiddleware);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Memory as a Service API Docs'
}));

// Health check (no auth required)
app.use('/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);

// Authentication routes (no auth required for login/register)
app.use('/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

// Protected routes
app.use('/memory', authMiddleware, memoryRoutes);
app.use('/api/v1/memory', authMiddleware, memoryRoutes);
app.use('/api-keys', apiKeyRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);

// MCP routes (for AI agents - different auth mechanism)
app.use('/mcp/api-keys', mcpApiKeyRoutes);
app.use('/api/v1/mcp/api-keys', mcpApiKeyRoutes);

// Metrics endpoint (no auth required for Prometheus scraping)
app.use('/metrics', metricsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Memory as a Service (MaaS)',
    version: '1.0.0',
    status: 'operational',
    documentation: '/docs',
    health: '/api/v1/health'
  });
});

// SSE endpoint for real-time updates
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection event
  res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAlive);
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

// Start metrics collection if enabled
if (config.ENABLE_METRICS) {
  startMetricsCollection();
}

// Export serverless handler
const handler = serverless(app);

export const netlifyHandler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Set timeout context
  context.callbackWaitsForEmptyEventLoop = false;
  
  return await handler(event, context);
};