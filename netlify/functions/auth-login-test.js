// Auth login test endpoint for health checks
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

  // For test parameter, return a "test mode" response
  const queryStringParams = event.queryStringParameters || {};
  
  if (queryStringParams.test === 'true') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        mode: 'test',
        auth_status: 'available',
        timestamp: new Date().toISOString()
      })
    };
  }

  // For normal requests, return a redirect to the login page
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Location': '/auth/login'
    },
    body: JSON.stringify({
      redirect: '/auth/login'
    })
  };
};
