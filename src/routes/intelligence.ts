import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { alignedAuthMiddleware } from '@/middleware/auth-aligned';
import { planBasedRateLimit } from '@/middleware/rateLimit';
import { validateProjectScope } from '@/middleware/projectScope';
import type { UnifiedUser } from '@/middleware/auth-aligned';
import { IntelligenceService } from '@/services/intelligenceService';

const router: Router = Router();
const intelligenceService = new IntelligenceService();

/**
 * GET /api/v1/intelligence/conclusions
 * List pre-reasoned inferred conclusions for a subject
 */
router.get(
  '/conclusions',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const subjectId = req.query.subject_id as string;
    if (!subjectId) {
      res.status(400).json({ error: 'subject_id is required' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const includeSuperseded = req.query.include_superseded === 'true';

    try {
      const result = await intelligenceService.listInferredConclusions({
        subject_id: subjectId,
        limit,
        include_superseded: includeSuperseded,
      });

      res.json(result);
    } catch (err) {
      console.error('listInferredConclusions error:', err);
      res.status(500).json({ error: 'Failed to retrieve conclusions' });
    }
  }),
);

/**
 * GET /api/v1/intelligence/jobs/:id
 * Get reasoning job status by ID
 */
router.get(
  '/jobs/:id',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'job id is required' });
      return;
    }

    try {
      const job = await intelligenceService.getReasoningJobStatus(id);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      res.json({ job });
    } catch (err) {
      console.error('getReasoningJobStatus error:', err);
      res.status(500).json({ error: 'Failed to retrieve job status' });
    }
  }),
);

/**
 * POST /api/v1/intelligence/flush
 * Force-immediate reasoning for a subject
 */
router.post(
  '/flush',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const { subject_id } = req.body as { subject_id?: string };
    if (!subject_id) {
      res.status(400).json({ error: 'subject_id required' });
      return;
    }

    try {
      const result = await intelligenceService.flushReasoningQueue(subject_id);
      res.json(result);
    } catch (err) {
      console.error('flushReasoningQueue error:', err);
      res.status(500).json({ error: 'Failed to flush reasoning queue' });
    }
  }),
);

export default router;