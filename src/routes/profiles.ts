import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { alignedAuthMiddleware } from '@/middleware/auth-aligned';
import { planBasedRateLimit } from '@/middleware/rateLimit';
import { validateProjectScope } from '@/middleware/projectScope';
import { ProfileService } from '@/services/profileService';
import {
  resolveIntelligenceSubjectBoundary,
  canReadIntelligenceSubject,
} from '@/services/intelligenceAccess';

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
    const { subject_id } = req.params;
    const boundary = resolveIntelligenceSubjectBoundary(req.user, subject_id);
    if (!boundary) {
      res.status(403).json({ error: 'Subject is outside the authenticated visibility boundary' });
      return;
    }

    const profile = await profileService.getProfile(boundary.subjectId);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
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
    const { subject_id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    if (!canReadIntelligenceSubject(req.user, subject_id)) {
      res.status(403).json({ error: 'Subject is outside the authenticated visibility boundary' });
      return;
    }

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
    const { subject_id } = req.params;
    const { question } = req.body as { question?: string };

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const boundary = resolveIntelligenceSubjectBoundary(req.user, subject_id);
    if (!boundary) {
      res.status(403).json({ error: 'Subject is outside the authenticated visibility boundary' });
      return;
    }

    const result = await profileService.askProfile(boundary.subjectId, question);
    res.json(result);
  }),
);

export default router;
