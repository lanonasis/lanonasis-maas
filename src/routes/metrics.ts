import { Router, Request, Response } from 'express';
import { metrics } from '@/utils/metrics';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireRole } from '@/middleware/auth';
import { config } from '@/config/environment';

const router = Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Get Prometheus metrics
 *     description: Returns metrics in Prometheus format for monitoring systems
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/', (req: Request, res: Response): void => {
  if (!config.ENABLE_METRICS) {
    res.status(404).json({
      error: 'Metrics disabled',
      message: 'Metrics collection is disabled in configuration'
    });
    return;
  }

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.getPrometheusMetrics());
});

/**
 * @swagger
 * /metrics/json:
 *   get:
 *     summary: Get metrics in JSON format
 *     description: Returns metrics in JSON format for easier consumption
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics in JSON format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 counters:
 *                   type: object
 *                 histograms:
 *                   type: object
 *                 gauges:
 *                   type: object
 */
router.get('/json', 
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!config.ENABLE_METRICS) {
      res.status(404).json({
        error: 'Metrics disabled',
        message: 'Metrics collection is disabled in configuration'
      });
      return;
    }

    res.json(metrics.getJsonMetrics());
  })
);

export default router;