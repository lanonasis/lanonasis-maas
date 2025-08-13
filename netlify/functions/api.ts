import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Extract path after /api/v1
  const path = event.path.replace('/.netlify/functions/api', '').replace('/api/v1', '');
  
  try {
    // Health check endpoint
    if (path === '/health' && event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          version: '1.0.0',
          service: 'lanonasis-memory-api',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Memory endpoints
    if (path === '/memory' || path === '/memories') {
      switch (event.httpMethod) {
        case 'GET': {
          // List memories
          const { data, error } = await supabase
            .from('memories')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

          if (error) throw error;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data || [])
          };
        }

        case 'POST': {
          // Create memory
          const body = JSON.parse(event.body || '{}');
          
          // Generate embedding if content provided
          let embedding = null;
          if (body.content && process.env.OPENAI_API_KEY) {
            try {
              const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'text-embedding-ada-002',
                  input: body.content
                })
              });
              
              const data = await response.json();
              embedding = data.data?.[0]?.embedding;
            } catch (err) {
              console.error('Embedding generation failed:', err);
            }
          }

          const { data, error } = await supabase
            .from('memories')
            .insert({
              title: body.title,
              content: body.content,
              memory_type: body.memory_type || 'general',
              tags: body.tags || [],
              embedding,
              metadata: body.metadata || {},
              user_id: context.clientContext?.user?.sub
            })
            .select()
            .single();

          if (error) throw error;

          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(data)
          };
        }

        default:
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
      }
    }

    // Search endpoint
    if (path === '/memory/search' || path === '/memories/search') {
      if (event.httpMethod !== 'POST') {
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { query, limit = 10 } = body;

      // For now, do a simple text search
      // In production, this should use vector similarity search
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data || [])
      };
    }

    // Single memory operations
    const memoryMatch = path.match(/^\/memor(y|ies)\/([a-f0-9-]+)$/);
    if (memoryMatch) {
      const memoryId = memoryMatch[2];

      switch (event.httpMethod) {
        case 'GET': {
          const { data, error } = await supabase
            .from('memories')
            .select('*')
            .eq('id', memoryId)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Memory not found' })
              };
            }
            throw error;
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
          };
        }

        case 'PUT': {
          const body = JSON.parse(event.body || '{}');
          
          const { data, error } = await supabase
            .from('memories')
            .update({
              title: body.title,
              content: body.content,
              memory_type: body.memory_type,
              tags: body.tags,
              metadata: body.metadata,
              updated_at: new Date().toISOString()
            })
            .eq('id', memoryId)
            .select()
            .single();

          if (error) throw error;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
          };
        }

        case 'DELETE': {
          const { error } = await supabase
            .from('memories')
            .delete()
            .eq('id', memoryId);

          if (error) throw error;

          return {
            statusCode: 204,
            headers,
            body: ''
          };
        }

        default:
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
      }
    }

    // Not found
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Not found',
        path,
        method: event.httpMethod
      })
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
