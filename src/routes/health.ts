import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the service and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 uptime:
 *                   type: number
 *                   description: Uptime in seconds
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: healthy
 *                         response_time:
 *                           type: number
 *                     openai:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    dependencies: {
      database: { status: 'unknown', response_time: 0 },
      openai: { status: 'unknown', response_time: 0 }
    }
  };

  let overallStatus = 'healthy';

  try {
    // Check Supabase connection
    const dbStartTime = Date.now();
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
    
    try {
      const { error } = await supabase.from('memory_entries').select('id').limit(1);
      if (error && !error.message.includes('permission denied')) {
        throw error;
      }
      healthCheck.dependencies.database = {
        status: 'healthy',
        response_time: Date.now() - dbStartTime
      };
    } catch (dbError) {
      logger.warn('Database health check failed', { error: dbError });
      healthCheck.dependencies.database = {
        status: 'unhealthy',
        response_time: Date.now() - dbStartTime
      };
      overallStatus = 'degraded';
    }

    // Check OpenAI API availability (basic connectivity)
    const aiStartTime = Date.now();
    try {
      // Simple check - we don't want to use API quota for health checks
      const response = await fetch('https://api.openai.com', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      healthCheck.dependencies.openai = {
        status: response.ok ? 'healthy' : 'degraded',
        response_time: Date.now() - aiStartTime
      };
      
      if (!response.ok) {
        overallStatus = 'degraded';
      }
    } catch (aiError) {
      logger.warn('OpenAI health check failed', { error: aiError });
      healthCheck.dependencies.openai = {
        status: 'unhealthy',
        response_time: Date.now() - aiStartTime
      };
      overallStatus = 'degraded';
    }

    healthCheck.status = overallStatus;

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    logger.error('Health check error', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      error: 'Health check failed'
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check endpoint
 *     description: Returns whether the service is ready to accept requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick readiness check - just verify we can connect to Supabase
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
    const { error } = await supabase.from('memory_entries').select('id').limit(1);
    
    if (error && !error.message.includes('permission denied')) {
      throw error;
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.warn('Readiness check failed', { error });
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Service dependencies not available'
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check endpoint
 *     description: Returns whether the service is alive
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;