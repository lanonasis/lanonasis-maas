import { Router, Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// Store active MCP SSE connections
const mcpConnections = new Map<string, Response>();

/**
 * Middleware to authenticate API key for MCP connections
 */
const authenticateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      message: 'Provide API key via X-API-Key header or api_key query parameter'
    });
  }

  try {
    // Validate API key against database
    const { data: keyData, error } = await supabase
      .from('maas_api_keys')
      .select(`
        id,
        name,
        user_id,
        is_active,
        expires_at,
        last_used_at,
        usage_count,
        rate_limit_per_minute
      `)
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !keyData) {
      logger.warn('Invalid API key attempt for MCP SSE', { apiKey: apiKey.toString().substring(0, 8) + '...' });
      return res.status(401).json({ 
        error: 'Invalid API key',
        message: 'API key not found or inactive'
      });
    }

    // Check if key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({ 
        error: 'API key expired',
        message: 'API key has expired'
      });
    }

    // Update last used timestamp and usage count
    await supabase
      .from('maas_api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: keyData.usage_count + 1
      })
      .eq('id', keyData.id);

    // Attach key info to request
    (req as any).apiKey = keyData;
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('API key validation error', { error: errorMessage });
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Failed to validate API key'
    });
  }
};

/**
 * @swagger
 * /mcp/sse:
 *   get:
 *     summary: MCP Server-Sent Events endpoint for remote client connections
 *     description: Establishes SSE connection for remote MCP clients (e.g., Claude Desktop) using API key authentication
 *     tags: [MCP Remote]
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Lanonasis API key for authentication
 *       - in: query
 *         name: api_key
 *         required: false
 *         schema:
 *           type: string
 *         description: Alternative API key parameter
 *       - in: query
 *         name: client_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Client identifier for connection tracking
 *     responses:
 *       200:
 *         description: MCP SSE connection established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Invalid or missing API key
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/', authenticateApiKey, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const apiKeyData = (req as any).apiKey;
  const clientId = req.query.client_id as string || `client_${Date.now()}`;
  const connectionId = `${apiKeyData.user_id}_${clientId}`;
  
  // Set SSE headers for MCP protocol
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  // Store connection
  mcpConnections.set(connectionId, res);
  
  // Send MCP protocol initialization
  const initMessage = {
    jsonrpc: '2.0',
    method: 'initialized',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        resources: {
          subscribe: true,
          listChanged: true
        },
        tools: {
          listChanged: true
        },
        prompts: {
          listChanged: true
        },
        logging: {}
      },
      serverInfo: {
        name: 'lanonasis-memory-service',
        version: '1.0.0',
        description: 'Lanonasis Memory as a Service - Remote MCP Server'
      },
      clientInfo: {
        name: clientId,
        version: '1.0.0'
      }
    }
  };

  res.write(`data: ${JSON.stringify(initMessage)}\n\n`);

  // Send connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'mcp_connection',
    message: 'Connected to Lanonasis Memory Service MCP Server',
    timestamp: new Date().toISOString(),
    connectionId,
    apiKey: {
      name: apiKeyData.name,
      userId: apiKeyData.user_id
    }
  })}\n\n`);

  // Send periodic heartbeat for MCP protocol
  const heartbeat = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeat);
      mcpConnections.delete(connectionId);
      return;
    }
    
    res.write(`data: ${JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/ping',
      params: {
        timestamp: new Date().toISOString()
      }
    })}\n\n`);
  }, 30000); // 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    logger.info('MCP SSE client disconnected', { connectionId, apiKey: apiKeyData.name });
    clearInterval(heartbeat);
    mcpConnections.delete(connectionId);
  });

  req.on('error', (error) => {
    logger.error('MCP SSE connection error', { connectionId, error: error.message });
    clearInterval(heartbeat);
    mcpConnections.delete(connectionId);
  });

  logger.info('MCP SSE connection established', { 
    connectionId, 
    clientId,
    apiKey: apiKeyData.name,
    userId: apiKeyData.user_id
  });
}));

/**
 * Broadcast MCP message to all connected clients
 */
export function broadcastMCP(message: any, targetUserId?: string) {
  const mcpMessage = {
    jsonrpc: '2.0',
    method: 'notifications/message',
    params: {
      ...message,
      timestamp: new Date().toISOString()
    }
  };

  const data = `data: ${JSON.stringify(mcpMessage)}\n\n`;

  mcpConnections.forEach((connection, connectionId) => {
    const [userId] = connectionId.split('_');
    
    if (targetUserId && userId !== targetUserId) {
      return; // Skip if targeting specific user
    }

    if (!connection.writableEnded) {
      connection.write(data);
    } else {
      mcpConnections.delete(connectionId);
    }
  });
}

/**
 * Send memory operation updates via MCP SSE
 */
export function notifyMCPMemoryUpdate(userId: string, operation: string, memoryId: string, data?: any) {
  broadcastMCP({
    type: 'memory_update',
    operation,
    memoryId,
    data
  }, userId);
}

/**
 * Send tool execution results via MCP SSE
 */
export function notifyMCPToolResult(userId: string, toolName: string, result: any, requestId?: string) {
  broadcastMCP({
    type: 'tool_result',
    toolName,
    result,
    requestId
  }, userId);
}

/**
 * Send resource updates via MCP SSE
 */
export function notifyMCPResourceUpdate(userId: string, resourceUri: string, operation: string) {
  broadcastMCP({
    type: 'resource_update',
    resourceUri,
    operation
  }, userId);
}

export default router;
