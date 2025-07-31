// Example proxy integration for Onasis-CORE unified-router.js
// This can be added to the existing router without disrupting vibe-memory

const { createProxyMiddleware } = require('http-proxy-middleware');

// Memory Service Integration (non-disruptive)
function setupMemoryServiceProxy(app) {
  const memoryServiceUrl = process.env.MEMORY_SERVICE_URL || 'https://api.lanonasis.com';
  
  console.log(`Setting up Memory Service proxy to: ${memoryServiceUrl}`);

  // Health check endpoint (direct)
  app.get('/api/memory/health', async (req, res) => {
    try {
      const response = await fetch(`${memoryServiceUrl}/api/v1/health`);
      const data = await response.json();
      res.json({
        service: 'memory-service',
        status: data.status,
        gateway: 'onasis-core',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        service: 'memory-service',
        status: 'unhealthy',
        error: error.message
      });
    }
  });

  // Main proxy configuration
  const memoryProxy = createProxyMiddleware({
    target: memoryServiceUrl,
    changeOrigin: true,
    pathRewrite: {
      '^/api/memory': '/api/v1'  // Rewrite path
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add service identification headers
      proxyReq.setHeader('X-Onasis-Service', 'memory');
      proxyReq.setHeader('X-Gateway', 'onasis-core');
      
      // Forward authentication if present
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
      
      // Add request ID for tracing
      const requestId = req.headers['x-request-id'] || require('uuid').v4();
      proxyReq.setHeader('X-Request-ID', requestId);
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add CORS headers if needed
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['X-Powered-By'] = 'Onasis-CORE';
    },
    onError: (err, req, res) => {
      console.error('Memory service proxy error:', err);
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Memory service temporarily unavailable',
        service: 'memory-service'
      });
    }
  });

  // Apply proxy to memory routes
  app.use('/api/memory', memoryProxy);
  
  // MCP Server proxy (if using MCP mode)
  if (process.env.ENABLE_MEMORY_MCP === 'true') {
    const mcpProxy = createProxyMiddleware({
      target: process.env.MEMORY_MCP_URL || 'ws://localhost:3002',
      ws: true,
      changeOrigin: true,
      pathRewrite: {
        '^/api/memory/mcp': '/'
      }
    });
    
    app.use('/api/memory/mcp', mcpProxy);
  }
}

// Export for use in Onasis-CORE
module.exports = { setupMemoryServiceProxy };

// Usage in unified-router.js:
/*
const { setupMemoryServiceProxy } = require('./integrations/memory-service-proxy');

// After other middleware setup
setupMemoryServiceProxy(app);
*/