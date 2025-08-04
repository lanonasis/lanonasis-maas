import { Router, Request, Response } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Store active SSE connections
const sseConnections = new Map<string, Response>();

/**
 * @swagger
 * /sse:
 *   get:
 *     summary: Server-Sent Events endpoint for real-time updates
 *     description: Establishes SSE connection for real-time memory service updates
 *     tags: [Real-time]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: SSE connection established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  
  if (!userId) {
    res.status(401).json({ error: 'User ID not found' });
    return; // End function execution
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store connection
  sseConnections.set(userId, res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: 'Connected to Lanonasis Memory Service',
    timestamp: new Date().toISOString(),
    userId
  })}\n\n`);

  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeat);
      sseConnections.delete(userId);
      return;
    }
    
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000); // 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    logger.info('SSE client disconnected', { userId });
    clearInterval(heartbeat);
    sseConnections.delete(userId);
  });

  req.on('error', (error) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SSE connection error', { userId, error: errorMessage });
    clearInterval(heartbeat);
    sseConnections.delete(userId);
  });

  logger.info('SSE connection established', { userId });
  
  // Keep connection alive - no explicit return needed for SSE
}));

/**
 * Broadcast message to all connected SSE clients
 */
export function broadcastSSE(message: any, targetUserId?: string) {
  const data = `data: ${JSON.stringify({
    ...message,
    timestamp: new Date().toISOString()
  })}\n\n`;

  if (targetUserId && sseConnections.has(targetUserId)) {
    // Send to specific user
    const connection = sseConnections.get(targetUserId);
    if (connection && !connection.writableEnded) {
      connection.write(data);
    }
  } else {
    // Broadcast to all connections
    sseConnections.forEach((connection, userId) => {
      if (!connection.writableEnded) {
        connection.write(data);
      } else {
        sseConnections.delete(userId);
      }
    });
  }
}

/**
 * Send memory operation updates via SSE
 */
export function notifyMemoryUpdate(userId: string, operation: string, memoryId: string, data?: any) {
  broadcastSSE({
    type: 'memory_update',
    operation,
    memoryId,
    data
  }, userId);
}

/**
 * Send API key updates via SSE
 */
export function notifyApiKeyUpdate(userId: string, operation: string, keyId: string, data?: any) {
  broadcastSSE({
    type: 'api_key_update',
    operation,
    keyId,
    data
  }, userId);
}

/**
 * Send system notifications via SSE
 */
export function notifySystemUpdate(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  broadcastSSE({
    type: 'system_notification',
    level,
    message
  });
}

export default router;
