import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  alignedAuthMiddleware,
  planBasedRateLimit,
  validateProjectScope,
} from '@/middleware/auth-aligned';
import { logger } from '@/utils/logger';
import { IntelligenceService } from '@/services/intelligenceService';
import {
  canReadIntelligenceSubject,
  resolveIntelligenceSubjectBoundary,
} from '@/services/intelligenceAccess';

const router: Router = Router();
const intelligenceService = new IntelligenceService();

const firstParamValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const conclusionsQuerySchema = z.object({
  subject_id: z.string().min(1, 'subject_id is required'),
  limit: z.coerce.number().int().positive().max(100).optional(),
  include_superseded: z.enum(['true', 'false']).optional(),
});

const flushRequestSchema = z.object({
  subject_id: z.string().min(1, 'subject_id required'),
});

// ---------------------------------------------------------------------------
// GET /api/v1/intelligence/conclusions
// ---------------------------------------------------------------------------

router.get(
  '/conclusions',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = conclusionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }

    const { subject_id, limit, include_superseded } = parsed.data;
    const effectiveLimit = limit ?? 20;
    const includeSuperseded = include_superseded === 'true';

    const boundary = resolveIntelligenceSubjectBoundary(req.user, subject_id);
    if (!boundary) {
      logger.warn('conclusions: subject outside visibility boundary', { subject_id, user: req.user?.id });
      res.status(403).json({ error: 'Subject is outside the authenticated visibility boundary' });
      return;
    }

    try {
      const result = await intelligenceService.listInferredConclusions({
        subject_id: boundary.subjectId,
        limit: effectiveLimit,
        include_superseded: includeSuperseded,
        ...(!boundary.personalSubject && boundary.organizationId
          ? { organization_id: boundary.organizationId }
          : {}),
      });

      logger.info('conclusions: listed', {
        subject_id: boundary.subjectId,
        count: result.conclusions.length,
      });
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('listInferredConclusions error', { err: msg, subject_id: boundary.subjectId });
      res.status(500).json({ error: 'Failed to retrieve conclusions' });
    }
  }),
);

// ---------------------------------------------------------------------------
// GET /api/v1/intelligence/jobs/:id
// ---------------------------------------------------------------------------

router.get(
  '/jobs/:id',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = firstParamValue(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'job id is required' });
      return;
    }

    try {
      const job = await intelligenceService.getReasoningJobStatus(id);
      if (!job) {
        logger.info('getReasoningJobStatus: job not found', { jobId: id });
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      if (!canReadIntelligenceSubject(req.user, job.subject_id, job.organization_id)) {
        logger.warn('getReasoningJobStatus: access denied', { jobId: id, user: req.user?.id });
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      logger.info('getReasoningJobStatus: retrieved', { jobId: id, status: job.status });
      res.json({ job });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('getReasoningJobStatus error', { err: msg, jobId: id });
      res.status(500).json({ error: 'Failed to retrieve job status' });
    }
  }),
);

// ---------------------------------------------------------------------------
// POST /api/v1/intelligence/flush
// ---------------------------------------------------------------------------

router.post(
  '/flush',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = flushRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }

    const { subject_id } = parsed.data;
    const boundary = resolveIntelligenceSubjectBoundary(req.user, subject_id);
    if (!boundary) {
      logger.warn('flush: subject outside visibility boundary', { subject_id, user: req.user?.id });
      res.status(403).json({ error: 'Subject is outside the authenticated visibility boundary' });
      return;
    }

    try {
      const result = await intelligenceService.flushReasoningQueue(boundary.subjectId);
      logger.info('flushReasoningQueue: completed', {
        subject_id: boundary.subjectId,
        flushed: result.flushed,
        job_count: result.job_ids.length,
      });
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('flushReasoningQueue error', { err: msg, subject_id: boundary.subjectId });
      res.status(500).json({ error: 'Failed to flush reasoning queue' });
    }
  }),
);

export default router;
