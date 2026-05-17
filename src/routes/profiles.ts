import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  alignedAuthMiddleware,
  planBasedRateLimit,
  validateProjectScope,
} from '@/middleware/auth-aligned';
import { logger } from '@/utils/logger';
import { ProfileService } from '@/services/profileService';
import {
  resolveIntelligenceSubjectBoundary,
  canReadIntelligenceSubject,
} from '@/services/intelligenceAccess';

const profileParamsSchema = z.object({ subject_id: z.string().uuid() });
const profileVersionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const router: Router = Router();
const profileService = new ProfileService();

/**
 * GET /api/v1/profiles/:subject_id
 */
router.get(
  '/:subject_id',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsedParams = profileParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: 'Validation failed', details: parsedParams.error.issues });
      return;
    }

    const { subject_id } = parsedParams.data;
    const boundary = resolveIntelligenceSubjectBoundary(req.user, subject_id);
    if (!boundary) {
      logger.warn('profiles.get: subject outside visibility boundary', { subject_id, user: req.user?.id });
      res.status(403).json({ error: 'Subject is outside the authenticated visibility boundary' });
      return;
    }

    // Pass organization_id for non-personal subjects so the service-role query
    // is constrained to the caller's org and cannot read cross-tenant profiles.
    const orgScope = boundary.personalSubject ? undefined : boundary.organizationId;
    const profile = await profileService.getProfile(boundary.subjectId, orgScope);
    if (!profile) {
      logger.info('profiles.get: profile not found', { subject_id: boundary.subjectId });
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    logger.info('profiles.get: retrieved', { subject_id: boundary.subjectId });
    res.json({ profile });
  }),
);

/**
 * GET /api/v1/profiles/:subject_id/versions
 * Query: ?limit=20
 */
router.get(
  '/:subject_id/versions',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsedParams = profileParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: 'Validation failed', details: parsedParams.error.issues });
      return;
    }
    const parsedQuery = profileVersionsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ error: 'Validation failed', details: parsedQuery.error.issues });
      return;
    }

    const { subject_id } = parsedParams.data;
    const { limit } = parsedQuery.data;

    if (!canReadIntelligenceSubject(req.user, subject_id)) {
      logger.warn('profiles.versions: access denied', { subject_id, user: req.user?.id });
      res.status(403).json({ error: 'Subject is outside the authenticated visibility boundary' });
      return;
    }

    logger.info('profiles.versions: fetching', { subject_id, limit });
    const versions = await profileService.getProfileHistory(subject_id, limit);
    res.json({ versions });
  }),
);

/**
 * POST /api/v1/profiles/:subject_id/ask
 * Body: { question: string }
 */
router.post(
  '/:subject_id/ask',
  validateProjectScope,
  alignedAuthMiddleware,
  planBasedRateLimit('intelligence'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsedParams = profileParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: 'Validation failed', details: parsedParams.error.issues });
      return;
    }

    const { subject_id } = parsedParams.data;
    const { question } = req.body as { question?: string };

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const boundary = resolveIntelligenceSubjectBoundary(req.user, subject_id);
    if (!boundary) {
      logger.warn('profiles.ask: subject outside visibility boundary', { subject_id, user: req.user?.id });
      res.status(403).json({ error: 'Subject is outside the authenticated visibility boundary' });
      return;
    }

    logger.info('profiles.ask: querying', { subject_id: boundary.subjectId, question_length: question.length });
    const result = await profileService.askProfile(boundary.subjectId, question);
    res.json(result);
  }),
);

export default router;
