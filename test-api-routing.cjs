#!/usr/bin/env node

/**
 * Test API Routing and JSON Response
 * Quick test to verify JSON formatting for AI clients
 */

const express = require('express');
const app = express();

// AI Client Detection Middleware (simplified)
function detectAIClient(req, res, next) {
  const userAgent = (req.get('User-Agent') || '').toLowerCase();
  const acceptHeader = req.get('Accept') || '';
  
  // AI Client patterns
  const aiPatterns = ['claude', 'anthropic', 'mcp', 'curl', 'postman', 'python', 'node'];
  const isAIClient = aiPatterns.some(pattern => userAgent.includes(pattern)) ||
                   acceptHeader.includes('application/json') ||
                   req.path.startsWith('/api/') ||
                   req.query.format === 'json';
  
  req.isAIClient = isAIClient;
  req.clientType = userAgent.includes('claude') ? 'claude-desktop' :
                   userAgent.includes('curl') ? 'curl' :
                   userAgent.includes('mcp') ? 'mcp-client' : 'api-client';
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Client: ${req.clientType}, AI: ${isAIClient}`);
  next();
}

// JSON Response Middleware
function ensureJSON(req, res, next) {
  if (req.isAIClient) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-API-Client-Detected', req.clientType);
  }
  next();
}

app.use(express.json());
app.use(detectAIClient);
app.use(ensureJSON);

// Test Routes

// Root endpoint with AI client detection
app.get('/', (req, res) => {
  if (req.isAIClient) {
    res.json({
      platform: 'LanOnasis Enterprise Services',
      tagline: 'Unified API Gateway for Enterprise Solutions',
      version: '1.0.0',
      status: 'operational',
      client_detected: req.clientType,
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/v1/health',
        memory: '/api/v1/memory',
        auth: '/api/v1/auth',
        docs: '/docs'
      }
    });
  } else {
    res.send(`
      <html>
        <head><title>LanOnasis Enterprise</title></head>
        <body>
          <h1>LanOnasis Enterprise Services</h1>
          <p>For API access, use: <code>/api/v1/*</code></p>
          <a href="/api/v1/health">Health Check</a>
        </body>
      </html>
    `);
  }
});

// Service Discovery (well-known endpoint)
app.get('/.well-known/onasis.json', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    auth_base: `${baseUrl}/api/v1`,
    memory_base: `${baseUrl}/api/v1/memory`,
    mcp_ws_base: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}`,
    mcp_sse: `${baseUrl}/mcp/sse`,
    keys_base: `${baseUrl}/api/v1/api-keys`,
    project_scope: 'lanonasis-maas',
    version: '1.2.0',
    environment: process.env.NODE_ENV || 'development',
    capabilities: {
      auth: ['jwt', 'vendor_key'],
      protocols: ['http', 'https', 'ws', 'sse'],
      formats: ['json'],
      ai_clients: ['claude-desktop', 'mcp-client', 'api-client']
    }
  });
});

// Health endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'lanonasis-maas',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
    client: req.clientType,
    endpoints: {
      memory: '/api/v1/memory',
      auth: '/api/v1/auth',
      apiKeys: '/api/v1/api-keys',
      mcp: '/api/v1/mcp'
    },
    database: 'supabase-connected',
    authentication: 'onasis-core-aligned'
  });
});

// Memory endpoints (mock)
app.get('/api/v1/memory', (req, res) => {
  res.json({
    message: 'Memory API endpoint',
    note: 'Routes through onasis-core for authentication',
    client: req.clientType,
    auth_required: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    example: {
      search: 'POST /api/v1/memory/search',
      create: 'POST /api/v1/memory',
      get: 'GET /api/v1/memory/:id'
    }
  });
});

app.post('/api/v1/memory/search', (req, res) => {
  res.json({
    message: 'Memory search endpoint',
    client: req.clientType,
    query: req.body.query || 'No query provided',
    results: [],
    note: 'This would route through onasis-core authentication in production'
  });
});

// Auth endpoint (routes to onasis-core)
app.get('/api/v1/auth', (req, res) => {
  res.json({
    message: 'Authentication API',
    routes_through: 'onasis-core (NOT dashboard)',
    client: req.clientType,
    auth_server: 'https://api.lanonasis.com',
    endpoints: {
      login: '/api/v1/auth/login',
      register: '/api/v1/auth/register',
      oauth: '/api/v1/auth/oauth',
      device: '/api/v1/auth/device'
    },
    supported_methods: ['jwt', 'vendor_key', 'oauth']
  });
});

// MCP endpoints
app.get('/api/v1/mcp', (req, res) => {
  res.json({
    message: 'Model Context Protocol API',
    client: req.clientType,
    server: 'cli-aligned-mcp-server',
    authentication: 'vendor-key-aligned',
    endpoints: {
      stdio: 'Use lanonasis-mcp-server command',
      http: '/api/v1/mcp/tools',
      websocket: '/mcp/ws',
      sse: '/mcp/sse'
    }
  });
});

// API Keys endpoint
app.get('/api/v1/api-keys', (req, res) => {
  res.json({
    message: 'API Key Management',
    client: req.clientType,
    auth_required: true,
    note: 'Routes through onasis-core authentication',
    operations: ['create', 'list', 'rotate', 'delete'],
    security: 'encrypted-storage'
  });
});

// Dashboard route (should return JSON for AI clients)
app.get('/dashboard', (req, res) => {
  if (req.isAIClient) {
    res.json({
      message: 'Dashboard is for web browsers',
      client: req.clientType,
      redirect: '/api/v1',
      note: 'Use API endpoints for programmatic access'
    });
  } else {
    res.send(`
      <html>
        <head><title>Dashboard</title></head>
        <body><h1>Web Dashboard</h1></body>
      </html>
    `);
  }
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    client: req.clientType,
    available_endpoints: ['/api/v1/health', '/api/v1/memory', '/api/v1/auth']
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Test API Server running on http://${HOST}:${PORT}`);
  console.log(`📚 Endpoints to test:`);
  console.log(`   Health: http://${HOST}:${PORT}/api/v1/health`);
  console.log(`   Memory: http://${HOST}:${PORT}/api/v1/memory`);
  console.log(`   Auth:   http://${HOST}:${PORT}/api/v1/auth`);
  console.log(`   MCP:    http://${HOST}:${PORT}/api/v1/mcp`);
  console.log(`   Discovery: http://${HOST}:${PORT}/.well-known/onasis.json`);
  console.log(`\n🧪 Test with:`);
  console.log(`   curl -H "Accept: application/json" http://${HOST}:${PORT}/`);
  console.log(`   curl http://${HOST}:${PORT}/api/v1/health`);
});

module.exports = app;