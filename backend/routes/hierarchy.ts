import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { usersRepository, auditRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';

const router = Router();

// GET /api/v1/hierarchy/tree - Fetch complete Organization Tree for Org Chart
router.get('/tree', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const treeData = await usersRepository.getOrgTree(user.organization_id || undefined);

    return res.json({
      success: true,
      data: treeData,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_ORG_TREE_FETCH', message: err.message || 'Failed to fetch organization tree' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/hierarchy/health - Fetch Hierarchy Health & Organization Metrics
router.get('/health', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const health = await usersRepository.getHierarchyHealth(user.organization_id || undefined);

    return res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_HIERARCHY_HEALTH_FETCH', message: err.message || 'Failed to fetch hierarchy health' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/hierarchy/user/:id - Fetch hierarchy details for specific employee
router.get('/user/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const hierarchy = await usersRepository.getHierarchyDetails(userId);

    if (!hierarchy) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_USER_NOT_FOUND', message: 'Employee not found' },
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: hierarchy,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_HIERARCHY_FETCH', message: err.message || 'Failed to fetch employee hierarchy' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/hierarchy/direct-reports/:id - Fetch direct reports of employee
router.get('/direct-reports/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const managerId = req.params.id;
    const directReports = await usersRepository.getEmployees({
      managerId,
      isArchived: false
    });

    return res.json({
      success: true,
      data: directReports,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DIRECT_REPORTS_FETCH', message: err.message || 'Failed to fetch direct reports' },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/v1/hierarchy/assign-manager - Assign or change manager (OWNER / HR_ADMIN)
router.put('/assign-manager', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { userId, managerId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_INVALID_PAYLOAD', message: 'userId is required' },
        timestamp: new Date().toISOString()
      });
    }

    const targetUser = await usersRepository.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_USER_NOT_FOUND', message: 'Target employee not found' },
        timestamp: new Date().toISOString()
      });
    }

    if (managerId) {
      const targetManager = await usersRepository.findById(managerId);
      if (!targetManager) {
        return res.status(404).json({
          success: false,
          error: { code: 'ERR_MANAGER_NOT_FOUND', message: 'Reporting manager not found' },
          timestamp: new Date().toISOString()
        });
      }
    }

    try {
      const updatedUser = await usersRepository.assignManager(userId, managerId || null);

      await auditRepository.log({
        id: uuidv4(),
        actor_id: user.id,
        action: 'MANAGER_CHANGED',
        resource_type: 'USER',
        resource_id: userId,
        timestamp: new Date().toISOString(),
        before_state: { manager_id: targetUser.manager_id, manager_name: targetUser.manager_name },
        after_state: { manager_id: updatedUser?.manager_id, manager_name: updatedUser?.manager_name },
        details: { userId, previous_manager_id: targetUser.manager_id, new_manager_id: managerId }
      });

      await auditRepository.log({
        id: uuidv4(),
        actor_id: user.id,
        action: 'HIERARCHY_UPDATED',
        resource_type: 'ORGANIZATION',
        resource_id: user.organization_id || 'DEFAULT_ORG',
        timestamp: new Date().toISOString(),
        before_state: null,
        after_state: { updated_employee: userId, new_manager: managerId },
        details: { employee_name: targetUser.full_name }
      });

      return res.json({
        success: true,
        data: updatedUser,
        message: 'Reporting manager assigned successfully',
        timestamp: new Date().toISOString()
      });
    } catch (assignErr: any) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_CIRCULAR_HIERARCHY', message: assignErr.message || 'Invalid hierarchy assignment' },
        timestamp: new Date().toISOString()
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_MANAGER_ASSIGNMENT', message: err.message || 'Failed to assign reporting manager' },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
