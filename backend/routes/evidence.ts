import { Router, Response } from 'express';
import { evidenceRepository, reviewsRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/evidence/:reviewId
router.get('/:reviewId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.reviewId;
  const cycle = await reviewsRepository.findById(reviewId);

  if (!cycle) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Review cycle not found' },
      timestamp: new Date().toISOString()
    });
  }

  const nodes = await evidenceRepository.findByReviewId(reviewId);

  return res.json({
    success: true,
    data: { items: nodes },
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/evidence/item/:evidenceId
router.get('/item/:evidenceId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const node = await evidenceRepository.findById(req.params.evidenceId);

  if (!node) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Evidence node not found' },
      timestamp: new Date().toISOString()
    });
  }

  return res.json({
    success: true,
    data: node,
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/evidence/timeline/:reviewId
router.get('/timeline/:reviewId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.reviewId;
  const cycle = await reviewsRepository.findById(reviewId);

  if (!cycle) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Review cycle not found' },
      timestamp: new Date().toISOString()
    });
  }

  const nodes = await evidenceRepository.findByReviewId(reviewId);
  nodes.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  return res.json({
    success: true,
    data: nodes,
    timestamp: new Date().toISOString()
  });
});

export default router;
