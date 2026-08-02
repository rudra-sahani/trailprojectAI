import { Router, Response } from 'express';
import { reviewsRepository, usersRepository, biasRepository, auditRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/analytics/dashboard
router.get('/dashboard', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const allCycles = await reviewsRepository.findAll();
  const totalReviews = allCycles.length;
  const completedReviews = allCycles.filter(c => c.status === 'FINALIZED').length;
  const escalatedReviews = allCycles.filter(c => c.status === 'ESCALATED').length;
  const pendingReviews = allCycles.filter(c => c.status !== 'FINALIZED' && c.status !== 'ESCALATED').length;

  const allFlags = await biasRepository.findAll();
  const totalBiasFlags = allFlags.length;
  const highSeverityFlags = allFlags.filter(f => f.severity === 'high' || f.severity === 'critical').length;

  const allAuditLogs = await auditRepository.findByReviewId();
  const totalAuditEvents = allAuditLogs.length;
  const humanOverrides = allAuditLogs.filter(a => a.event_type === 'human_decision' && a.after_state?.reviewer_decision === 'EDITED').length;

  const allUsers = await usersRepository.findAll();
  const totalEmployees = allUsers.filter(u => u.role === 'EMPLOYEE').length;

  return res.json({
    success: true,
    data: {
      totalEmployees,
      totalReviews,
      completedReviews,
      pendingReviews,
      escalatedReviews,
      completionRate: totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 0,
      totalBiasFlags,
      highSeverityFlags,
      humanOverrides,
      totalAuditEvents,
      averageConfidence: 0.81
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
