const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json());

// Rate limiting for authentication failures
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  keyGenerator: (req) => {
    // Use IP and API key (if present) as identifier
    const ip = req.get('x-forwarded-for') || req.get('x-real-ip') || req.ip;
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || req.query.api_key;
    return apiKey ? `${ip}:${apiKey.slice(0, 8)}` : ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Return SSE-formatted error response
    res.writeHead(429, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization, X-API-Key',
      'X-Accel-Buffering': 'no'
    });
    res.write('data: {"error":"Too many authentication attempts, please try again later"}\n\n');
    res.end();
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false // Count failed requests
});

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// SSE endpoint for MCP communication
app.get('/', authRateLimit, async (req, res) => {
  try {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization, X-API-Key',
      'X-Accel-Buffering': 'no'
    });

    // Parse API key from headers
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || req.query.api_key;
    
    if (!apiKey) {
      res.write('data: {"error":"Missing API key"}\n\n');
      res.end();
      return;
    }

    // Validate API key
    console.log('🔍 Starting API key authentication for MCP SSE...');
    
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('user_id, organization_id, is_active, rate_limit, access_level')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !keyData?.is_active) {
      console.log('❌ API key validation failed:', error?.message);
      res.write('data: {"error":"Invalid or inactive API key"}\n\n');
      res.end();
      return;
    }

    console.log('✅ API key validated successfully');

    // Generate connection ID
    const connectionId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log connection for analytics
    try {
      await supabase
        .from('mcp_connections')
        .insert({
          connection_id: connectionId,
          user_id: keyData.user_id,
          organization_id: keyData.organization_id,
          connected_at: new Date().toISOString(),
          user_agent: req.get('User-Agent') || 'Unknown',
          ip_address: req.get('x-forwarded-for') || req.get('x-real-ip') || req.ip
        });
    } catch (logError) {
      console.log('Note: Could not log connection (table may not exist):', logError.message);
    }

    // Send initial connection response
    const connectionResponse = {
      type: "connection",
      status: "connected",
      connectionId: connectionId,
      timestamp: new Date().toISOString(),
      user_id: keyData.user_id,
      organization_id: keyData.organization_id,
      access_level: keyData.access_level,
      rate_limit: keyData.rate_limit,
      message: "MCP SSE connection established successfully",
      services: {
        memory: {
          endpoint: "/api/v1/memory",
          status: "available"
        },
        orchestration: {
          endpoint: "/api/v1/orchestrate", 
          status: "available"
        },
        apiKeys: {
          endpoint: "/api/v1/api-keys",
          status: "available"
        }
      }
    };

    res.write(`data: ${JSON.stringify(connectionResponse)}\n\n`);

    // Keep connection alive with periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      if (res.destroyed || res.finished) {
        clearInterval(heartbeatInterval);
        return;
      }
      
      const heartbeat = {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        connectionId: connectionId
      };
      
      res.write(`data: ${JSON.stringify(heartbeat)}\n\n`);
    }, 30000); // Send heartbeat every 30 seconds

    // Handle client disconnect
    req.on('close', () => {
      console.log('🔌 MCP SSE client disconnected:', connectionId);
      clearInterval(heartbeatInterval);
    });

    req.on('end', () => {
      clearInterval(heartbeatInterval);
    });

  } catch (error) {
    console.error('MCP SSE Error:', error);
    res.write(`data: {"error":"Internal server error","message":"${error.message}","timestamp":"${new Date().toISOString()}"}\n\n`);
    res.end();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'MCP SSE Endpoint',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Export for Vercel serverless functions
module.exports = serverless(app);