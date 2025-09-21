// API-specific health check function for lanonasis-maas
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

  // API health check response - Always return OK to unblock auth flow
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      status: 'ok',
      service: 'Lanonasis API Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      api_status: 'available',
      endpoints: {
        v1: '/api/v1',
        health: '/api/health',
        metrics: '/api/metrics'
      }
    })
  };
};
