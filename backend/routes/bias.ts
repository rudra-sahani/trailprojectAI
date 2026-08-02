import { Router, Response } from 'express';
import { biasRepository, reviewsRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/bias/:reviewId
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

  const flags = await biasRepository.findByReviewId(reviewId);

  const hasHighSeverity = flags.some(f => f.severity === 'high' || f.severity === 'critical');
  const overallRisk = hasHighSeverity ? 'HIGH' : (flags.length > 0 ? 'MEDIUM' : 'LOW');

  return res.json({
    success: true,
    data: {
      overallRisk,
      flags,
      flagCount: flags.length
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
