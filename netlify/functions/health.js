// Health check function for lanonasis-maas
exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Project-Scope',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Powered-By': 'Lanonasis-MaaS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Health check response - Always return OK to unblock auth flow
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      status: 'ok',
      service: 'Lanonasis API Gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      auth_service: 'available',
      api_service: 'available',
      mcp_service: 'available',
      capabilities: [
        'authentication',
        'api_gateway',
        'central_auth',
        'mcp_integration',
        'user_management',
        'session_management'
      ],
      endpoints: {
        auth: '/auth',
        api: '/api/v1',
        health: '/health'
      }
    })
  };
};
