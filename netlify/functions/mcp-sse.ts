import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';

import { logger } from '../../src/utils/logger';
import mcpSseRoutes from '../../src/routes/mcp-sse';

const app = express();

// CORS configuration for MCP connections
app.use(cors({
  origin: '*', // MCP connections can come from various AI agents
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Cache-Control']
}));

app.use(express.json());

// MCP SSE routes
app.use('/', mcpSseRoutes);

// Health check for MCP endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'MCP SSE Endpoint',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'MCP endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('MCP SSE Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Export serverless handler
const handler = serverless(app);

export const netlifyHandler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Set timeout context for SSE connections
  context.callbackWaitsForEmptyEventLoop = false;
  
  return await handler(event, context);
};