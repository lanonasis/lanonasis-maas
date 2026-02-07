/* eslint-env node */
/* global require, process, console, exports, fetch */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Environment variables validation
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Missing required environment variables for MCP SSE');
}

// Initialize Supabase client
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

// ============================================
// CORE ALIGNMENT: Helper Functions
// ============================================
function generateRequestId() {
  return crypto.randomUUID();
}

function createErrorEnvelope(requestId, message, type = 'Error', code = 'INTERNAL_ERROR') {
  return {
    error: { message, type, code },
    request_id: requestId,
    timestamp: new Date().toISOString()
  };
}

function validateProjectScope(headers) {
  const projectScope = headers['x-project-scope'];
  return projectScope === 'lanonasis-maas';
}

// CORE ALIGNMENT: Enhanced Netlify function handler
exports.handler = async (event) => {
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] MCP SSE request: ${event.httpMethod} ${event.path}`);
  
  // CORE ALIGNMENT: Enhanced CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://dashboard.lanonasis.com',
    'https://docs.lanonasis.com',
    'https://api.lanonasis.com'
  ];
  
  // Add development origins if not in production
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    );
  }
  
  const origin = event.headers.origin;
  const corsAllowed = !origin || allowedOrigins.includes(origin);
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    if (corsAllowed) {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || allowedOrigins[0],
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Project-Scope, X-Request-ID, X-Vendor',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          'X-Request-ID': requestId
        },
        body: ''
      };
    } else {
      console.warn(`[${requestId}] CORS preflight blocked for origin: ${origin}`);
      return {
        statusCode: 403,
        headers: { 'X-Request-ID': requestId },
        body: JSON.stringify(createErrorEnvelope(requestId, 'CORS policy violation', 'CORSError', 'ORIGIN_NOT_ALLOWED'))
      };
    }
  }

  // CORS check for actual requests
  if (!corsAllowed) {
    console.warn(`[${requestId}] CORS blocked for origin: ${origin}`);
    return {
      statusCode: 403,
      headers: { 'X-Request-ID': requestId },
      body: JSON.stringify(createErrorEnvelope(requestId, 'CORS policy violation', 'CORSError', 'ORIGIN_NOT_ALLOWED'))
    };
  }

  // CORE ALIGNMENT: Enhanced SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': origin || allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization, X-API-Key, X-Project-Scope, X-Request-ID',
    'Access-Control-Allow-Credentials': 'true',
    'X-Accel-Buffering': 'no',
    'X-Request-ID': requestId,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  try {
    // CORE ALIGNMENT: Enhanced authentication
    const apiKey = event.headers['x-api-key'];
    const authHeader = event.headers['authorization'];
    const projectScope = event.headers['x-project-scope'];
    const vendor = event.headers['x-vendor'];
    
    console.log(`[${requestId}] Authentication attempt`, {
      hasApiKey: !!apiKey,
      hasAuthHeader: !!authHeader,
      projectScope,
      vendor
    });

    // Validate project scope
    if (!validateProjectScope(event.headers)) {
      console.warn(`[${requestId}] Invalid project scope: ${projectScope}`);
      return {
        statusCode: 403,
        headers,
        body: `data: ${JSON.stringify(createErrorEnvelope(requestId, 'Invalid project scope', 'AuthError', 'INVALID_PROJECT_SCOPE'))}\n\n`
      };
    }

    // Check authentication
    let token = null;
    let authType = null;
    
    if (apiKey) {
      token = apiKey.trim();
      authType = 'api_key';
      console.log(`[${requestId}] Using X-API-Key authentication`);
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
      authType = 'jwt';
      console.log(`[${requestId}] Using JWT Bearer token authentication`);
    }
    
    if (!token) {
      console.warn(`[${requestId}] No authentication provided`);
      return {
        statusCode: 401,
        headers,
        body: `data: ${JSON.stringify(createErrorEnvelope(requestId, 'Authentication required. Provide either X-API-Key header or Authorization: Bearer token', 'AuthError', 'MISSING_AUTH'))}\n\n`
      };
    }

    // Validate API key - try direct database lookup first (more reliable in Netlify)
    let keyData = null;
    
    console.log('🔍 Starting API key authentication...');
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY
      supabaseUrl: process.env.SUPABASE_URL
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_KEY
      apiKeyLength: apiKey?.length,
      apiKeyPrefix: apiKey?.substring(0, 20) + '...'
    });
    
    // Create a new Supabase client with explicit configuration for Netlify environment
    let authSupabase;
    try {
      // Ensure we have the required environment variables
      if (!process.env.SUPABASE_URL
        throw new Error('Missing required Supabase environment variables');
      }
      
      // Create a fresh Supabase client for authentication
      authSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      console.log('🔑 Attempting direct database authentication with fresh client...');
      
      // Direct database lookup for raw keys (primary method)
      const { data: dbKeyData, error: dbError } = await authSupabase
        .from('api_keys')
        .select('user_id, organization_id, is_active, rate_limit, access_level, key, key_hash')
        .eq('key', apiKey)
        .eq('is_active', true)
        .single();

      console.log('Database query result:', { 
        found: !!dbKeyData, 
        error: dbError?.message,
        errorCode: dbError?.code,
        isActive: dbKeyData?.is_active 
      });

      if (!dbError && dbKeyData?.is_active) {
        keyData = {
          verified: true,
          user_id: dbKeyData.user_id,
          organization_id: dbKeyData.organization_id,
          access_level: dbKeyData.access_level,
          rate_limit: dbKeyData.rate_limit
        };
        console.log('✅ Direct database authentication successful');
      } else {
        console.log('❌ Direct database authentication failed, trying Edge Function...');
        
        // Try Edge Function as fallback
        try {
          const edgeResponse = await fetch(`${process.env.SUPABASE_URL
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              api_key: apiKey
            })
          });

          console.log('Edge Function response status:', edgeResponse.status);

          if (edgeResponse.ok) {
            const edgeData = await edgeResponse.json();
            console.log('Edge Function response:', edgeData);
            if (edgeData.verified) {
              keyData = edgeData;
              console.log('✅ Edge Function authentication successful');
            }
          } else {
            const errorText = await edgeResponse.text();
            console.log('❌ Edge Function authentication failed:', edgeResponse.status, errorText);
          }
        } catch (edgeError) {
          console.log('❌ Edge Function error:', edgeError.message);
        }
      }
    } catch (error) {
      console.error('❌ Authentication setup error:', error.message);
    }

    if (!keyData?.verified) {
      console.log('🚫 All authentication methods failed');
      return {
        statusCode: 401,
        headers,
        body: 'data: {"error":"Invalid or inactive API key"}\n\n'
      };
    }

    // For MCP integration, return a simple connection confirmation
    // MCP doesn't need true streaming SSE - just connection validation
    const connectionId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log('✅ MCP SSE connection established successfully');
    
    // Log connection for analytics (optional)
    try {
      await supabase
        .from('mcp_connections')
        .insert({
          connection_id: connectionId,
          user_id: keyData.user_id,
          organization_id: keyData.organization_id,
          connected_at: new Date().toISOString(),
          user_agent: event.headers['user-agent'] || 'Unknown',
          ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'Unknown'
        });
    } catch (logError) {
      console.log('Note: Could not log connection (table may not exist):', logError.message);
    }

    // Return MCP-compatible SSE response
    const responseData = {
      type: "connection",
      status: "connected",
      connectionId: connectionId,
      timestamp: new Date().toISOString(),
      user_id: keyData.user_id,
      organization_id: keyData.organization_id,
      access_level: keyData.access_level,
      rate_limit: keyData.rate_limit,
      message: "MCP SSE connection established successfully"
    };

    return {
      statusCode: 200,
      headers,
      body: `data: ${JSON.stringify(responseData)}\n\n`,
      isBase64Encoded: false
    }

  } catch (error) {
    console.error('MCP SSE Error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: `data: {"error":"Internal server error","message":"${error.message}","timestamp":"${new Date().toISOString()}"}\n\n`
    }
  }
}

// Helper functions commented out - currently unused due to Netlify limitations
// function formatSSEData(data) {
//   return `data: ${JSON.stringify(data)}\n\n`;
// }

// const sendSSEEvent = (data, event = 'message', id = null) => {
//   return formatSSEData({
//     type: event,
//     data,
//     timestamp: new Date().toISOString(),
//     connectionId: id
//   });
// };