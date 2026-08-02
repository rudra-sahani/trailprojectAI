import { Router, Response } from 'express';
import {
  operationsQueueRepository,
  reviewsRepository,
  usersRepository,
  evidenceRepository,
  auditRepository,
  agentRunsRepository
} from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { runFullPipelineForReviewCycle } from '../../agents/orchestration/state-machine.js';

const router = Router();

// GET /api/v1/operations
router.get('/operations', authMiddleware, rbacMiddleware(['HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const allOps = await operationsQueueRepository.findAll();
  const allCycles = await reviewsRepository.findAll();
  const allUsers = await usersRepository.findAll();

  const cycleMap = new Map(allCycles.map(c => [c.id, c]));
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  const items = allOps.map(op => {
    const cycle = cycleMap.get(op.review_id);
    const emp = cycle ? userMap.get(cycle.employee_id) : null;
    return {
      ...op,
      employeeName: emp ? emp.full_name : 'Unknown'
    };
  });

  return res.json({
    success: true,
    data: items,
    timestamp: new Date().toISOString()
  });
});

// POST /api/v1/operations/:id/retrigger
router.post('/operations/:id/retrigger', authMiddleware, rbacMiddleware(['HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const opId = req.params.id;
  const op = await operationsQueueRepository.findById(opId);

  if (!op) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Escalated operations item not found' },
      timestamp: new Date().toISOString()
    });
  }

  await operationsQueueRepository.updateStatus(op.id, 'RETRYING');

  try {
    await runFullPipelineForReviewCycle(op.review_id);
    await operationsQueueRepository.updateStatus(op.id, 'RESOLVED');

    return res.json({
      success: true,
      data: { status: 'RESOLVED', reviewId: op.review_id },
      message: 'Pipeline resumed and completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    await operationsQueueRepository.updateStatus(op.id, 'OPEN', op.retry_count + 1);
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_RETRIGGER_FAILED', message: err.message || 'Pipeline re-trigger failed' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/operations/ingestion-issues
router.get('/operations/ingestion-issues', authMiddleware, rbacMiddleware(['HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const allNodes = await evidenceRepository.findAll();
  const rejected = allNodes.filter(n => n.status === 'REJECTED');
  return res.json({
    success: true,
    data: rejected,
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/audit
router.get('/audit', authMiddleware, rbacMiddleware(['HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.query.reviewId as string;
  const logs = await auditRepository.findByReviewId(reviewId);

  return res.json({
    success: true,
    data: logs,
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/agent-runs
router.get('/agent-runs', authMiddleware, rbacMiddleware(['HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const runs = await agentRunsRepository.findAll();
  return res.json({
    success: true,
    data: runs,
    timestamp: new Date().toISOString()
  });
});

export default router;
