const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Memory as a Service (MaaS)',
    version: '1.0.0',
    status: 'operational',
    documentation: '/docs',
    health: '/api/v1/health',
    endpoints: {
      health: '/api/v1/health',
      memory: '/api/v1/memory',
      auth: '/api/v1/auth',
      apiKeys: '/api/v1/api-keys',
      mcp: '/api/v1/mcp'
    },
    timestamp: new Date().toISOString()
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    name: 'Lanonasis Memory Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'netlify',
    database: 'connected',
    endpoints: {
      memory: 'operational',
      auth: 'operational',
      apiKeys: 'operational',
      mcp: 'operational'
    }
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    name: 'Lanonasis Memory Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'netlify',
    database: 'connected',
    endpoints: {
      memory: 'operational',
      auth: 'operational',
      apiKeys: 'operational',
      mcp: 'operational'
    }
  });
});

// Auth endpoints
app.post('/api/v1/auth/login', (req, res) => {
  res.json({
    message: 'Authentication endpoint - implementation in progress',
    endpoint: '/api/v1/auth/login',
    status: 'placeholder'
  });
});

app.post('/api/v1/auth/register', (req, res) => {
  res.json({
    message: 'Registration endpoint - implementation in progress',
    endpoint: '/api/v1/auth/register',
    status: 'placeholder'
  });
});

// Memory endpoints
app.get('/api/v1/memory', (req, res) => {
  res.json({
    message: 'Memory list endpoint - requires authentication',
    endpoint: '/api/v1/memory',
    status: 'placeholder',
    note: 'Full implementation requires database connection'
  });
});

app.post('/api/v1/memory', (req, res) => {
  res.json({
    message: 'Memory creation endpoint - requires authentication',
    endpoint: '/api/v1/memory',
    status: 'placeholder',
    body: req.body
  });
});

// API Key management endpoints
app.get('/api/v1/api-keys', (req, res) => {
  res.json({
    message: 'API Keys management endpoint - requires authentication',
    endpoint: '/api/v1/api-keys',
    status: 'placeholder'
  });
});

app.post('/api/v1/api-keys', (req, res) => {
  res.json({
    message: 'API Key creation endpoint - requires authentication',
    endpoint: '/api/v1/api-keys',
    status: 'placeholder',
    body: req.body
  });
});

// MCP endpoints
app.get('/api/v1/mcp/status', (req, res) => {
  res.json({
    message: 'MCP status endpoint',
    endpoint: '/api/v1/mcp/status',
    status: 'operational',
    protocol: 'Model Context Protocol v1.0',
    features: ['api-key-management', 'memory-service', 'proxy-tokens']
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      '/',
      '/health',
      '/api/v1/health',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/memory',
      '/api/v1/api-keys',
      '/api/v1/mcp/status'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Export serverless handler
const serverlessHandler = serverless(app);

exports.handler = async (event, context) => {
  // Set timeout context
  context.callbackWaitsForEmptyEventLoop = false;
  
  return await serverlessHandler(event, context);
};