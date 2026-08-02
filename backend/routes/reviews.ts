import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { reviewsRepository, usersRepository, auditRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { runFullPipelineForReviewCycle } from '../../agents/orchestration/state-machine.js';
import { assembleFinalReport } from '../../agents/governance/assemble-final-report.js';

const router = Router();

// GET /api/v1/reviews
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let cycles = await reviewsRepository.findAll();

  if (user.role === 'EMPLOYEE') {
    cycles = cycles.filter(c => c.employee_id === user.id);
  } else if (user.role === 'MANAGER') {
    cycles = cycles.filter(c => c.manager_id === user.id || c.employee_id === user.id);
  }

  const allUsers = await usersRepository.findAll();
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  const enriched = cycles.map(c => {
    const emp = userMap.get(c.employee_id);
    const mgr = userMap.get(c.manager_id);
    return {
      ...c,
      employee_name: emp ? emp.full_name : 'Employee',
      manager_name: mgr ? mgr.full_name : 'Manager'
    };
  });

  return res.json({
    success: true,
    data: enriched,
    timestamp: new Date().toISOString()
  });
});

// POST /api/v1/reviews
router.post('/', authMiddleware, rbacMiddleware(['MANAGER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { employeeId, reviewPeriod, managerId } = req.body;
  if (!employeeId || !reviewPeriod) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'employeeId and reviewPeriod are required' },
      timestamp: new Date().toISOString()
    });
  }

  const cycleId = uuidv4();
  const newCycle = await reviewsRepository.create({
    id: cycleId,
    employee_id: employeeId,
    manager_id: managerId || req.user!.id,
    review_period: reviewPeriod,
    status: 'DRAFT',
    pipeline_stage: 'COLLECTOR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  await auditRepository.addEntry({
    schema_version: '1.0',
    log_id: uuidv4(),
    report_id: newCycle.id,
    review_cycle_id: newCycle.id,
    claim_id: null,
    event_type: 'agent_run' as any,
    actor: { actor_type: 'human', actor_id: req.user!.id },
    timestamp: new Date().toISOString(),
    before_state: null,
    after_state: { status: 'DRAFT' },
    details: { action: 'REVIEW_CREATED' }
  });

  return res.json({
    success: true,
    data: { reviewId: newCycle.id },
    message: 'Review cycle created successfully',
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/reviews/:id
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.id;
  const cycle = await reviewsRepository.findById(reviewId);

  if (!cycle) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Review cycle not found' },
      timestamp: new Date().toISOString()
    });
  }

  if (req.user!.role === 'EMPLOYEE' && cycle.employee_id !== req.user!.id) {
    return res.status(403).json({
      success: false,
      error: { code: 'ERR_FORBIDDEN', message: 'Access denied to this review cycle' },
      timestamp: new Date().toISOString()
    });
  }

  const emp = await usersRepository.findById(cycle.employee_id);
  const mgr = await usersRepository.findById(cycle.manager_id);

  return res.json({
    success: true,
    data: {
      ...cycle,
      employee_name: emp ? emp.full_name : 'Employee',
      manager_name: mgr ? mgr.full_name : 'Manager'
    },
    timestamp: new Date().toISOString()
  });
});

// POST /api/v1/reviews/:id/start
router.post('/:id/start', authMiddleware, rbacMiddleware(['MANAGER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.id;
  const cycle = await reviewsRepository.findById(reviewId);

  if (!cycle) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Review cycle not found' },
      timestamp: new Date().toISOString()
    });
  }

  try {
    await runFullPipelineForReviewCycle(reviewId);
    const updatedCycle = await reviewsRepository.findById(reviewId);
    return res.json({
      success: true,
      data: {
        pipelineRunId: uuidv4(),
        status: updatedCycle?.status || 'PIPELINE_RUNNING',
        stage: updatedCycle?.pipeline_stage || 'SYNTHESIS'
      },
      message: 'Pipeline executed successfully and draft is ready for review',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'ERR_PIPELINE_FAILED',
        message: err.message || 'AI pipeline execution failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/reviews/:id/pipeline
router.get('/:id/pipeline', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.id;
  const cycle = await reviewsRepository.findById(reviewId);

  if (!cycle) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Review cycle not found' },
      timestamp: new Date().toISOString()
    });
  }

  return res.json({
    success: true,
    data: {
      currentStage: cycle.pipeline_stage || 'SYNTHESIS',
      progress: cycle.status === 'FINALIZED' ? 100 : (cycle.status === 'HUMAN_REVIEW' ? 85 : 50),
      status: cycle.status,
      startedAt: cycle.started_at || cycle.created_at
    },
    timestamp: new Date().toISOString()
  });
});

// POST /api/v1/reviews/:id/finalize
router.post('/:id/finalize', authMiddleware, rbacMiddleware(['MANAGER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.id;
  try {
    const finalReport = await assembleFinalReport(reviewId, req.user!.id);
    return res.json({
      success: true,
      data: {
        status: 'FINALIZED',
        publishedAt: finalReport.finalized_at,
        reportId: finalReport.report_id
      },
      message: 'Review finalized and report published',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(422).json({
      success: false,
      error: {
        code: err.message.startsWith('ERR_') ? err.message.split(':')[0] : 'ERR_INVALID_STATE',
        message: err.message || 'Cannot finalize review'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
