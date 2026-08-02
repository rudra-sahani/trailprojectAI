import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { feedbackRepository, reviewsRepository, evidenceRepository, withTransaction } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { FeedbackSource } from '../../shared/types/common.js';

const router = Router();

async function handleFeedbackSubmission(
  req: AuthenticatedRequest,
  res: Response,
  sourceType: FeedbackSource,
  defaultAuthorRole: 'self' | 'peer' | 'manager'
) {
  const { reviewId, content, subjectEmployeeId, title } = req.body;

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Feedback content is required' },
      timestamp: new Date().toISOString()
    });
  }

  let targetReviewId = reviewId;
  let targetSubjectId = subjectEmployeeId || (req.user!.role === 'EMPLOYEE' ? req.user!.id : null);

  if (!targetReviewId && targetSubjectId) {
    const userCycles = await reviewsRepository.findByEmployee(targetSubjectId);
    const activeCycle = userCycles.find(c => c.status !== 'FINALIZED');
    if (activeCycle) targetReviewId = activeCycle.id;
  }

  const { newFeedback, activeReviewId } = await withTransaction(async (client) => {
    let currentReviewId = targetReviewId;
    if (!currentReviewId) {
      const newCycleId = uuidv4();
      await reviewsRepository.create(
        {
          id: newCycleId,
          employee_id: targetSubjectId || req.user!.id,
          manager_id: req.user!.manager_id || req.user!.id,
          review_period: '2026-Q2',
          status: 'COLLECTING_FEEDBACK',
          pipeline_stage: 'COLLECTOR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        client
      );
      currentReviewId = newCycleId;
    }

    const createdFeedback = await feedbackRepository.create(
      {
        id: uuidv4(),
        review_id: currentReviewId,
        submitted_by: req.user!.id,
        source_type: sourceType,
        title: title || `${sourceType} Feedback`,
        content,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      client
    );

    const authorRole = req.user!.id === targetSubjectId ? 'self' : (req.user!.role === 'MANAGER' ? 'manager' : 'peer');

    await evidenceRepository.create(
      {
        schema_version: '1.0',
        evidence_id: uuidv4(),
        review_id: currentReviewId,
        raw_feedback_id: createdFeedback.id,
        subject_employee_id: targetSubjectId || req.user!.id,
        source_type: sourceType.toLowerCase() as any,
        author_role: authorRole,
        author_id: req.user!.id,
        submitted_at: createdFeedback.submitted_at,
        text_unit: content.slice(0, 1999),
        tags: ['general'],
        status: 'ACCEPTED',
        rejection_reason: null
      },
      currentReviewId,
      client
    );

    return { newFeedback: createdFeedback, activeReviewId: currentReviewId };
  });

  return res.json({
    success: true,
    data: { feedbackId: newFeedback.id, reviewId: activeReviewId },
    message: 'Feedback submitted successfully',
    timestamp: new Date().toISOString()
  });
}

// POST /api/v1/feedback/self
router.post('/self', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  handleFeedbackSubmission(req, res, 'SELF_ASSESSMENT', 'self');
});

// POST /api/v1/feedback/peer
router.post('/peer', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  handleFeedbackSubmission(req, res, 'PEER_FEEDBACK', 'peer');
});

// POST /api/v1/feedback/manager
router.post('/manager', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  handleFeedbackSubmission(req, res, 'MANAGER_FEEDBACK', 'manager');
});

// POST /api/v1/feedback/goals
router.post('/goals', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  handleFeedbackSubmission(req, res, 'GOALS', 'manager');
});

// POST /api/v1/feedback/projects
router.post('/projects', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  handleFeedbackSubmission(req, res, 'PROJECT_OUTCOMES', 'manager');
});

// POST /api/v1/feedback/meetings
router.post('/meetings', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  handleFeedbackSubmission(req, res, 'MEETING_NOTES', 'manager');
});

// GET /api/v1/feedback/:reviewId
router.get('/:reviewId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.reviewId;
  const items = await feedbackRepository.findByReviewId(reviewId);

  return res.json({
    success: true,
    data: items,
    timestamp: new Date().toISOString()
  });
});

export default router;
