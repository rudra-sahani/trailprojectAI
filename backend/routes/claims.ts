import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { claimsRepository, reviewsRepository, reportsRepository, auditRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';

const router = Router();

// GET /api/v1/claims/:reviewId
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

  const claims = await claimsRepository.findByReviewId(reviewId);

  return res.json({
    success: true,
    data: { claims },
    timestamp: new Date().toISOString()
  });
});

// PATCH /api/v1/claims/:claimId
router.patch('/:claimId', authMiddleware, rbacMiddleware(['MANAGER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const claimId = req.params.claimId;
  const { action, editedText, comment } = req.body;

  if (!action || !['APPROVE', 'REJECT', 'EDIT'].includes(action)) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Valid action (APPROVE, REJECT, EDIT) is required' },
      timestamp: new Date().toISOString()
    });
  }

  if (action === 'EDIT' && (!editedText || editedText.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'editedText is required when action is EDIT' },
      timestamp: new Date().toISOString()
    });
  }

  if (action === 'REJECT' && (!comment || comment.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'comment (reason) is required when rejecting a claim' },
      timestamp: new Date().toISOString()
    });
  }

  const allReports = await reportsRepository.findAll();
  let targetReport: any = null;
  let targetClaim: any = null;

  for (const report of allReports) {
    for (const section of report.sections) {
      const found = section.claims.find((c: any) => c.claim_id === claimId);
      if (found) {
        targetClaim = found;
        targetReport = report;
        break;
      }
    }
    if (targetClaim) break;
  }

  if (!targetClaim) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: `Claim ${claimId} not found in draft reports` },
      timestamp: new Date().toISOString()
    });
  }

  const oldDecision = targetClaim.reviewer_decision;

  if (action === 'APPROVE') {
    targetClaim.reviewer_decision = 'ACCEPTED';
  } else if (action === 'REJECT') {
    targetClaim.reviewer_decision = 'REJECTED';
    targetClaim.reviewer_comment = comment;
  } else if (action === 'EDIT') {
    targetClaim.reviewer_decision = 'EDITED';
    targetClaim.reviewer_edit_text = editedText;
    if (comment) targetClaim.reviewer_comment = comment;
  }

  await reportsRepository.saveOrUpdate(targetReport);

  await auditRepository.addEntry({
    schema_version: '1.0',
    log_id: uuidv4(),
    report_id: targetReport.report_id,
    review_cycle_id: targetReport.review_cycle_id || targetReport.review_id,
    claim_id: claimId,
    event_type: 'human_decision' as any,
    actor: { actor_type: 'human', actor_id: req.user!.id },
    timestamp: new Date().toISOString(),
    before_state: { reviewer_decision: oldDecision, text: targetClaim.text },
    after_state: {
      reviewer_decision: targetClaim.reviewer_decision,
      reviewer_edit_text: targetClaim.reviewer_edit_text,
      reviewer_comment: targetClaim.reviewer_comment
    },
    details: { action, comment }
  });

  return res.json({
    success: true,
    data: targetClaim,
    message: 'Claim decision saved successfully',
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/claims/:claimId/history
router.get('/:claimId/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const claimId = req.params.claimId;
  const allLogs = await auditRepository.findByReviewId();
  const history = allLogs.filter(a => a.claim_id === claimId);

  return res.json({
    success: true,
    data: history,
    timestamp: new Date().toISOString()
  });
});

export default router;
