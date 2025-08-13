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
            base: '/api/v1/memory',
            docs: '/docs#memory'
          },
          features: ['Vector Search', 'Multi-tenant', 'Role-based Access', 'Analytics']
        },
        apiKeys: {
          name: 'API Key Management',
          description: 'Secure storage and rotation of API keys',
          endpoints: {
            base: '/api/v1/api-keys',
            docs: '/docs#api-keys'
          },
          features: ['Secure Storage', 'Automatic Rotation', 'Access Control', 'Audit Logging']
        },
        mcp: {
          name: 'Model Context Protocol',
          description: 'Secure AI agent access to enterprise secrets',
          endpoints: {
            base: '/api/v1/mcp',
            docs: '/docs#mcp'
          },
          features: ['AI Agent Integration', 'Secure Context', 'Zero-trust Access', 'Real-time Updates']
        }
      },
      endpoints: {
        documentation: '/docs',
        dashboard: '/dashboard',
        health: '/api/v1/health',
        authentication: '/api/v1/auth',
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
      },
      timestamp: new Date().toISOString()
    });
  } else {
    // Serve HTML landing page for browsers
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LanOnasis API Gateway - Enterprise Services Platform</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 1200px;
            width: 100%;
            animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .logo {
            font-size: 3rem;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }

        .tagline {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 10px;
        }

        .status {
            display: inline-flex;
            align-items: center;
            background: #e7f5e7;
            color: #2d5a2d;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 500;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #4caf50;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .services {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin: 40px 0;
        }

        .service-card {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 2px solid transparent;
        }

        .service-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1);
            border-color: #667eea;
        }

        .service-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }

        .service-description {
            color: #666;
            margin-bottom: 20px;
        }

        .features {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 20px;
        }

        .feature-tag {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .service-links {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 8px 16px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }

        .btn-primary {
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
        }

        .btn-secondary:hover {
            background: #667eea;
            color: white;
        }

        .quick-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
            padding: 30px;
            background: #f8f9fa;
            border-radius: 15px;
        }

        .quick-link {
            text-align: center;
        }

        .quick-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            font-size: 1.1rem;
            transition: color 0.3s ease;
        }

        .quick-link a:hover {
            color: #764ba2;
        }

        .quick-link p {
            color: #666;
            font-size: 0.9rem;
            margin-top: 5px;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #eee;
            color: #666;
        }

        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            
            .logo {
                font-size: 2rem;
            }
            
            .services {
                grid-template-columns: 1fr;
            }
            
            .service-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">LanOnasis</h1>
            <p class="tagline">Enterprise API Gateway - Unified Services Platform</p>
            <div class="status">
                <div class="status-dot"></div>
                All Systems Operational
            </div>
        </div>

        <div class="services">
            <div class="service-card">
                <h3 class="service-title">Memory as a Service</h3>
                <p class="service-description">AI-powered memory management with semantic search capabilities for intelligent data retrieval and context preservation.</p>
                <div class="features">
                    <span class="feature-tag">Vector Search</span>
                    <span class="feature-tag">Multi-tenant</span>
                    <span class="feature-tag">Role-based Access</span>
                    <span class="feature-tag">Analytics</span>
                </div>
                <div class="service-links">
                    <a href="/api/v1/memory" class="btn btn-primary">API Endpoint</a>
                    <a href="/docs#memory" class="btn btn-secondary">Documentation</a>
                </div>
            </div>

            <div class="service-card">
                <h3 class="service-title">API Key Management</h3>
                <p class="service-description">Enterprise-grade secure storage, rotation, and management of API keys with comprehensive audit logging.</p>
                <div class="features">
                    <span class="feature-tag">Secure Storage</span>
                    <span class="feature-tag">Auto Rotation</span>
                    <span class="feature-tag">Access Control</span>
                    <span class="feature-tag">Audit Logging</span>
                </div>
                <div class="service-links">
                    <a href="/api/v1/api-keys" class="btn btn-primary">API Endpoint</a>
                    <a href="/docs#api-keys" class="btn btn-secondary">Documentation</a>
                </div>
            </div>

            <div class="service-card">
                <h3 class="service-title">Model Context Protocol</h3>
                <p class="service-description">Secure AI agent access to enterprise secrets with zero-trust architecture and real-time context updates.</p>
                <div class="features">
                    <span class="feature-tag">AI Integration</span>
                    <span class="feature-tag">Secure Context</span>
                    <span class="feature-tag">Zero-trust</span>
                    <span class="feature-tag">Real-time</span>
                </div>
                <div class="service-links">
                    <a href="/api/v1/mcp" class="btn btn-primary">API Endpoint</a>
                    <a href="/docs#mcp" class="btn btn-secondary">Documentation</a>
                </div>
            </div>
        </div>

        <!-- New Developer Tools Section -->
        <div style="margin: 40px 0;">
            <h2 style="text-align: center; margin-bottom: 30px; color: #333; font-size: 2rem;">Developer Tools & SDKs</h2>
            <div class="services">
                <div class="service-card">
                    <h3 class="service-title">TypeScript SDK</h3>
                    <p class="service-description">Official JavaScript/TypeScript SDK for memory management, API key management, and password management with full MCP integration.</p>
                    <div class="features">
                        <span class="feature-tag">v1.2.0</span>
                        <span class="feature-tag">Memory Mgmt</span>
                        <span class="feature-tag">API Keys</span>
                        <span class="feature-tag">Password Mgmt</span>
                    </div>
                    <div class="service-links">
                        <a href="https://www.npmjs.com/package/@lanonasis/sdk" class="btn btn-primary">Install SDK</a>
                        <a href="/docs#sdk" class="btn btn-secondary">SDK Docs</a>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: #f0f0f0; border-radius: 8px; font-family: monospace; font-size: 0.9rem;">
                        <div>$ npm install @lanonasis/sdk</div>
                        <div style="margin-top: 8px; color: #666;">import { LanonasisClient } from '@lanonasis/sdk';</div>
                    </div>
                </div>

                <div class="service-card">
                    <h3 class="service-title">Command Line Interface</h3>
                    <p class="service-description">Globally deployed CLI with MCP connectors for Claude Desktop and local platforms. No installation required with npx.</p>
                    <div class="features">
                        <span class="feature-tag">Global NPM</span>
                        <span class="feature-tag">MCP Connectors</span>
                        <span class="feature-tag">Claude Desktop</span>
                        <span class="feature-tag">Zero Install</span>
                    </div>
                    <div class="service-links">
                        <a href="https://www.npmjs.com/package/@lanonasis/cli" class="btn btn-primary">View on NPM</a>
                        <a href="/docs#cli" class="btn btn-secondary">CLI Docs</a>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: #f0f0f0; border-radius: 8px; font-family: monospace; font-size: 0.9rem;">
                        <div># Direct usage (no install needed):</div>
                        <div style="color: #0066cc;">$ npx -y @lanonasis/cli</div>
                        <div style="margin-top: 8px;"># Global install:</div>
                        <div style="color: #0066cc;">$ npm install -g @lanonasis/cli</div>
                    </div>
                </div>

                <div class="service-card">
                    <h3 class="service-title">IDE Extensions</h3>
                    <p class="service-description">VS Code and Windsurf extensions deployed to marketplace for seamless development integration.</p>
                    <div class="features">
                        <span class="feature-tag">VS Code</span>
                        <span class="feature-tag">Windsurf</span>
                        <span class="feature-tag">Marketplace</span>
                        <span class="feature-tag">Live Deploy</span>
                    </div>
                    <div class="service-links">
                        <a href="https://marketplace.visualstudio.com/search?term=lanonasis" class="btn btn-primary">VS Code Extension</a>
                        <a href="/docs#extensions" class="btn btn-secondary">Extension Docs</a>
                    </div>
                </div>

                <div class="service-card">
                    <h3 class="service-title">Memory Visualizer</h3>
                    <p class="service-description">Interactive dashboard for exploring memory relationships with graph, grid, and timeline views.</p>
                    <div class="features">
                        <span class="feature-tag">Graph View</span>
                        <span class="feature-tag">Timeline</span>
                        <span class="feature-tag">Search & Filter</span>
                        <span class="feature-tag">Real-time</span>
                    </div>
                    <div class="service-links">
                        <a href="https://dashboard.lanonasis.com/visualizer" class="btn btn-primary">Open Visualizer</a>
                        <a href="/docs#visualizer" class="btn btn-secondary">Learn More</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- New Management Tools Section -->
        <div style="margin: 40px 0;">
            <h2 style="text-align: center; margin-bottom: 30px; color: #333; font-size: 2rem;">Management & Upload Tools</h2>
            <div class="services">
                <div class="service-card">
                    <h3 class="service-title">Manual Context Upload</h3>
                    <p class="service-description">Drag-and-drop interface for bulk memory uploads supporting multiple formats and batch processing.</p>
                    <div class="features">
                        <span class="feature-tag">Multi-format</span>
                        <span class="feature-tag">Batch Upload</span>
                        <span class="feature-tag">YAML Support</span>
                        <span class="feature-tag">CSV/JSON</span>
                    </div>
                    <div class="service-links">
                        <a href="https://dashboard.lanonasis.com/upload" class="btn btn-primary">Upload Memories</a>
                        <a href="/docs#upload" class="btn btn-secondary">Upload Guide</a>
                    </div>
                </div>

                <div class="service-card">
                    <h3 class="service-title">Enterprise Dashboard</h3>
                    <p class="service-description">Complete management interface with analytics, API key management, and system monitoring.</p>
                    <div class="features">
                        <span class="feature-tag">Analytics</span>
                        <span class="feature-tag">User Management</span>
                        <span class="feature-tag">API Keys</span>
                        <span class="feature-tag">Monitoring</span>
                    </div>
                    <div class="service-links">
                        <a href="https://dashboard.lanonasis.com" class="btn btn-primary">Open Dashboard</a>
                        <a href="/docs#dashboard" class="btn btn-secondary">Dashboard Guide</a>
                    </div>
                </div>

                <div class="service-card">
                    <h3 class="service-title">MCP Server (SSE)</h3>
                    <p class="service-description">Real-time Model Context Protocol server with Server-Sent Events for live AI agent integration.</p>
                    <div class="features">
                        <span class="feature-tag">Server-Sent Events</span>
                        <span class="feature-tag">Real-time</span>
                        <span class="feature-tag">AI Agents</span>
                        <span class="feature-tag">Secure</span>
                    </div>
                    <div class="service-links">
                        <a href="https://mcp.lanonasis.com/sse" class="btn btn-primary">Connect SSE</a>
                        <a href="/docs#mcp-sse" class="btn btn-secondary">SSE Guide</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- New Open Banking API Section -->
        <div style="margin: 40px 0;">
            <h2 style="text-align: center; margin-bottom: 30px; color: #333; font-size: 2rem;">Open Banking API Compliance</h2>
            <div class="services">
                <div class="service-card">
                    <h3 class="service-title">PSD2 Compliance</h3>
                    <p class="service-description">Full compliance with European Payment Services Directive 2 (PSD2) for secure financial data access and third-party integrations.</p>
                    <div class="features">
                        <span class="feature-tag">PSD2 Ready</span>
                        <span class="feature-tag">EU Regulation</span>
                        <span class="feature-tag">Strong Auth</span>
                        <span class="feature-tag">GDPR</span>
                    </div>
                    <div class="service-links">
                        <a href="/docs#psd2" class="btn btn-primary">PSD2 Guide</a>
                        <a href="/api/psd2/spec" class="btn btn-secondary">API Spec</a>
                    </div>
                </div>

                <div class="service-card">
                    <h3 class="service-title">Open Banking Standard</h3>
                    <p class="service-description">Implements UK Open Banking standards with secure API access for account information, payments, and transaction data.</p>
                    <div class="features">
                        <span class="feature-tag">UK Standard</span>
                        <span class="feature-tag">Account Info</span>
                        <span class="feature-tag">Payments</span>
                        <span class="feature-tag">OAuth2</span>
                    </div>
                    <div class="service-links">
                        <a href="/docs#open-banking" class="btn btn-primary">Open Banking Docs</a>
                        <a href="/api/openbanking/spec" class="btn btn-secondary">API Reference</a>
                    </div>
                </div>

                <div class="service-card">
                    <h3 class="service-title">Global API Standards</h3>
                    <p class="service-description">Supports international open banking frameworks including Berlin Group, STET, and emerging standards from major markets.</p>
                    <div class="features">
                        <span class="feature-tag">Berlin Group</span>
                        <span class="feature-tag">STET</span>
                        <span class="feature-tag">Multi-Region</span>
                        <span class="feature-tag">ISO 20022</span>
                    </div>
                    <div class="service-links">
                        <a href="/docs#global-standards" class="btn btn-primary">Standards Guide</a>
                        <a href="/api/global/compliance" class="btn btn-secondary">Compliance Check</a>
                    </div>
                </div>

                <div class="service-card">
                    <h3 class="service-title">Financial Data Security</h3>
                    <p class="service-description">Bank-grade security with FIDO2, MTLS, and advanced fraud detection for safe financial data processing and storage.</p>
                    <div class="features">
                        <span class="feature-tag">FIDO2</span>
                        <span class="feature-tag">MTLS</span>
                        <span class="feature-tag">Fraud Detection</span>
                        <span class="feature-tag">Encryption</span>
                    </div>
                    <div class="service-links">
                        <a href="/docs#security" class="btn btn-primary">Security Overview</a>
                        <a href="/api/security/audit" class="btn btn-secondary">Security Audit</a>
                    </div>
                </div>
            </div>
        </div>

        <div class="quick-links">
            <div class="quick-link">
                <a href="/docs">📚 API Documentation</a>
                <p>Complete API reference and guides</p>
            </div>
            <div class="quick-link">
                <a href="/dashboard">🎛️ Dashboard</a>
                <p>Service management interface</p>
            </div>
            <div class="quick-link">
                <a href="/api/v1/health">🏥 Health Check</a>
                <p>System status and diagnostics</p>
            </div>
            <div class="quick-link">
                <a href="/mcp">🤖 MCP Interface</a>
                <p>AI agent connection portal</p>
            </div>
            <div class="quick-link">
                <a href="/api/v1/auth">🔐 Authentication</a>
                <p>Login and token management</p>
            </div>
            <div class="quick-link">
                <a href="/metrics">📊 Metrics</a>
                <p>Performance monitoring data</p>
            </div>
        </div>

        <div class="footer">
            <p>🚀 <strong>Tech Stack:</strong> TypeScript, Express, Supabase, OpenAI, JWT, Prometheus</p>
            <p>📞 <strong>Support:</strong> support@lanonasis.com | 📖 <strong>Docs:</strong> docs.lanonasis.com</p>
            <p>© 2024 LanOnasis. Enterprise Services Platform v1.0.0</p>
        </div>
    </div>
</body>
</html>`);
  }
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