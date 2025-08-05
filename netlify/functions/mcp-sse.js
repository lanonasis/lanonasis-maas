const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    }
  }

  // Set SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization, X-API-Key',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering for real-time streaming
  }

  try {
    // Parse API key from headers
    const apiKey = event.headers['x-api-key'] || event.headers['authorization']?.replace('Bearer ', '')
    
    if (!apiKey) {
      return {
        statusCode: 401,
        headers,
        body: 'data: {"error":"Missing API key"}\n\n'
      }
    }

    // Validate API key and get user context
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, organization_id, is_active, rate_limit')
      .eq('key_hash', apiKey)
      .single()

    if (keyError || !keyData?.is_active) {
      return {
        statusCode: 401,
        headers,
        body: 'data: {"error":"Invalid or inactive API key"}\n\n'
      }
    }

    // Initialize SSE connection
    const connectionId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Send initial connection acknowledgment
    let sseData = `data: {"type":"connection","connectionId":"${connectionId}","status":"connected","timestamp":"${new Date().toISOString()}"}\n\n`

    // Handle query parameters for filtering
    const { memory_type, organization_id, user_id } = event.queryStringParameters || {}
    
    // Set up real-time subscription filters
    let subscriptionFilter = supabase
      .channel(`mcp-${connectionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'memories',
        filter: keyData.organization_id ? `organization_id=eq.${keyData.organization_id}` : `user_id=eq.${keyData.user_id}`
      }, (payload) => {
        const eventData = {
          type: 'memory_change',
          event: payload.eventType,
          data: payload.new || payload.old,
          timestamp: new Date().toISOString(),
          connectionId
        }
        sseData += `data: ${JSON.stringify(eventData)}\n\n`
      })

    // Subscribe to API key events for rate limiting updates
    subscriptionFilter = subscriptionFilter
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public', 
        table: 'api_keys',
        filter: `user_id=eq.${keyData.user_id}`
      }, (payload) => {
        const eventData = {
          type: 'api_key_update',
          data: {
            rate_limit: payload.new.rate_limit,
            is_active: payload.new.is_active
          },
          timestamp: new Date().toISOString(),
          connectionId
        }
        sseData += `data: ${JSON.stringify(eventData)}\n\n`
      })

    // Subscribe to organization-level changes if applicable
    if (keyData.organization_id) {
      subscriptionFilter = subscriptionFilter
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'organization_settings',
          filter: `organization_id=eq.${keyData.organization_id}`
        }, (payload) => {
          const eventData = {
            type: 'organization_update',
            event: payload.eventType,
            data: payload.new || payload.old,
            timestamp: new Date().toISOString(),
            connectionId
          }
          sseData += `data: ${JSON.stringify(eventData)}\n\n`
        })
    }

    // Subscribe to changes
    subscriptionFilter.subscribe()

    // Send periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      sseData += `data: {"type":"heartbeat","timestamp":"${new Date().toISOString()}","connectionId":"${connectionId}"}\n\n`
    }, 30000) // Every 30 seconds

    // Log connection for analytics
    await supabase
      .from('mcp_connections')
      .insert({
        connection_id: connectionId,
        user_id: keyData.user_id,
        organization_id: keyData.organization_id,
        connected_at: new Date().toISOString(),
        user_agent: event.headers['user-agent'],
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip']
      })

    // Cleanup function for connection termination
    context.callbackWaitsForEmptyEventLoop = false
    
    // Keep connection alive and stream data
    return {
      statusCode: 200,
      headers,
      body: sseData,
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

// Helper function to format SSE data
function formatSSEData(data) {
  return `data: ${JSON.stringify(data)}\n\n`
}

// Helper function to send SSE event
function sendSSEEvent(eventType, data, connectionId) {
  return formatSSEData({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
    connectionId
  })
}