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
import sseRoutes from '@/routes/sse';
import mcpSseRoutes from '@/routes/mcp-sse';

const app = express();

// Get directory paths for dashboard serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardPath = path.join(__dirname, '../dashboard/dist');

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Memory as a Service (MaaS) API',
      version: '1.0.0',
      description: 'Enterprise-grade memory management microservice with vector search capabilities',
      contact: {
        name: 'Seye Derick',
        email: 'contact@seyederick.com'
      }
    },
    servers: [
      {
        url: `http://${config.HOST}:${config.PORT}${config.API_PREFIX}/${config.API_VERSION}`,
        description: 'Development server'
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
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
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

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Dashboard static files
app.use('/dashboard', express.static(dashboardPath));
app.use('/assets', express.static(path.join(dashboardPath, 'assets')));

// Health check (no auth required)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/health`, healthRoutes);

// Authentication routes (no auth required for login/register)
app.use(`${config.API_PREFIX}/${config.API_VERSION}/auth`, authRoutes);

// Protected routes
app.use(`${config.API_PREFIX}/${config.API_VERSION}/memory`, authMiddleware, memoryRoutes);

// SSE endpoint (requires authentication)
app.use('/sse', sseRoutes);

// MCP SSE endpoint for remote clients (API key authentication)
app.use('/mcp/sse', mcpSseRoutes);

// Metrics endpoint (no auth required for Prometheus scraping)
app.use('/metrics', metricsRoutes);

// Dashboard SPA routing - serve index.html for all dashboard routes
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Memory as a Service (MaaS)',
    version: '1.0.0',
    status: 'operational',
    documentation: '/docs',
    dashboard: '/dashboard',
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