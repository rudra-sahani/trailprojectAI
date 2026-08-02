import { Router, Response } from 'express';
import { reportsRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { redactPeerFeedbackQuotes } from '../../agents/governance/redact.js';

const router = Router();

// GET /api/v1/reports/:reviewId/draft
router.get('/:reviewId/draft', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.reviewId;
  const report = await reportsRepository.findByReviewId(reviewId);

  if (!report) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Draft report not found for this review cycle' },
      timestamp: new Date().toISOString()
    });
  }

  // Employee cannot access draft report prior to finalization
  if (req.user!.role === 'EMPLOYEE') {
    return res.status(403).json({
      success: false,
      error: { code: 'ERR_FORBIDDEN', message: 'Draft reports are not accessible to employees prior to publication' },
      timestamp: new Date().toISOString()
    });
  }

  return res.json({
    success: true,
    data: report,
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/reports/:reviewId
router.get('/:reviewId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.reviewId;
  const report = await reportsRepository.findByReviewId(reviewId);

  if (!report) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Report not found' },
      timestamp: new Date().toISOString()
    });
  }

  // Employee can only access if report is finalized
  if (req.user!.role === 'EMPLOYEE') {
    if ((report as any).status !== 'FINALIZED') {
      return res.status(403).json({
        success: false,
        error: { code: 'ERR_FORBIDDEN', message: 'Report has not been finalized yet' },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Apply privacy redaction if needed
  const redactedReport = redactPeerFeedbackQuotes(report, req.user!.role, req.user!.id);

  return res.json({
    success: true,
    data: redactedReport,
    timestamp: new Date().toISOString()
  });
});

// POST /api/v1/reports/:reviewId/export
router.post('/:reviewId/export', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { format } = req.body;
  const report = await reportsRepository.findByReviewId(req.params.reviewId);

  if (!report) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Report not found' },
      timestamp: new Date().toISOString()
    });
  }

  return res.json({
    success: true,
    data: {
      downloadUrl: `/api/v1/reports/${req.params.reviewId}`,
      format: format || 'PDF',
      exportDate: new Date().toISOString()
    },
    message: `Report exported as ${format || 'PDF'} successfully`,
    timestamp: new Date().toISOString()
  });
});

export default router;
