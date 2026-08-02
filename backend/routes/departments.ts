import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { departmentsRepository, auditRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { CreateDepartmentRequest, UpdateDepartmentRequest } from '../../shared/types/api-contracts.js';

const router = Router();

// GET /api/v1/departments - List departments
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const includeArchived = req.query.include_archived === 'true';
    const departments = await departmentsRepository.findAll({
      organizationId: user.organization_id || undefined,
      includeArchived
    });

    return res.json({
      success: true,
      data: departments,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DEPARTMENTS_FETCH', message: err.message || 'Failed to fetch departments' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/departments/:id - Get department details
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dept = await departmentsRepository.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DEPARTMENT_NOT_FOUND', message: 'Department not found' },
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: dept,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DEPARTMENT_FETCH', message: err.message || 'Failed to fetch department' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/departments - Create department
router.post('/', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const body: CreateDepartmentRequest = req.body;

    if (!body.name || !body.name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_INVALID_NAME', message: 'Department name is required' },
        timestamp: new Date().toISOString()
      });
    }

    // Check duplicate name
    const existing = await departmentsRepository.findByName(body.name.trim(), user.organization_id || undefined);
    if (existing && !existing.is_archived) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_DUPLICATE_DEPARTMENT', message: 'A department with this name already exists' },
        timestamp: new Date().toISOString()
      });
    }

    const deptId = uuidv4();
    const created = await departmentsRepository.create({
      id: deptId,
      name: body.name.trim(),
      description: body.description || '',
      organization_id: user.organization_id || null,
      head_id: body.head_id || null,
      is_archived: false,
      created_at: new Date().toISOString()
    });

    // Audit Log: Department Created
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || deptId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'department_created' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: created,
      details: { department_id: deptId, name: created.name }
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: 'Department created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DEPARTMENT_CREATE', message: err.message || 'Failed to create department' },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/v1/departments/:id - Update department
router.put('/:id', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const deptId = req.params.id;
    const body: UpdateDepartmentRequest = req.body;

    const existing = await departmentsRepository.findById(deptId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DEPARTMENT_NOT_FOUND', message: 'Department not found' },
        timestamp: new Date().toISOString()
      });
    }

    if (body.name && body.name.trim() !== existing.name) {
      const duplicate = await departmentsRepository.findByName(body.name.trim(), user.organization_id || undefined);
      if (duplicate && duplicate.id !== deptId) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_DUPLICATE_DEPARTMENT', message: 'Another department already has this name' },
          timestamp: new Date().toISOString()
        });
      }
    }

    const updated = await departmentsRepository.update(deptId, {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.head_id !== undefined ? { head_id: body.head_id } : {})
    });

    // Audit Log: Department Updated
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || deptId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'department_updated' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: updated,
      details: { department_id: deptId, updates: body }
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Department updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DEPARTMENT_UPDATE', message: err.message || 'Failed to update department' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST or PATCH /api/v1/departments/:id/archive - Archive department
const handleArchive = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const deptId = req.params.id;

    const existing = await departmentsRepository.findById(deptId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DEPARTMENT_NOT_FOUND', message: 'Department not found' },
        timestamp: new Date().toISOString()
      });
    }

    const archived = await departmentsRepository.archive(deptId);

    // Audit Log: Department Archived
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || deptId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'department_archived' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: archived,
      details: { department_id: deptId, name: existing.name }
    });

    return res.json({
      success: true,
      data: archived,
      message: 'Department archived successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DEPARTMENT_ARCHIVE', message: err.message || 'Failed to archive department' },
      timestamp: new Date().toISOString()
    });
  }
};

router.post('/:id/archive', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), handleArchive);
router.patch('/:id/archive', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), handleArchive);

// POST or PATCH /api/v1/departments/:id/restore - Restore department
const handleRestore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const deptId = req.params.id;

    const existing = await departmentsRepository.findById(deptId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DEPARTMENT_NOT_FOUND', message: 'Department not found' },
        timestamp: new Date().toISOString()
      });
    }

    const restored = await departmentsRepository.restore(deptId);

    // Audit Log: Department Restored
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || deptId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'department_restored' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: restored,
      details: { department_id: deptId, name: existing.name }
    });

    return res.json({
      success: true,
      data: restored,
      message: 'Department restored successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DEPARTMENT_RESTORE', message: err.message || 'Failed to restore department' },
      timestamp: new Date().toISOString()
    });
  }
};

router.post('/:id/restore', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), handleRestore);
router.patch('/:id/restore', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), handleRestore);

// DELETE /api/v1/departments/:id - Safe Delete department (only if no active dependencies)
router.delete('/:id', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const deptId = req.params.id;

    const existing = await departmentsRepository.findById(deptId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DEPARTMENT_NOT_FOUND', message: 'Department not found' },
        timestamp: new Date().toISOString()
      });
    }

    const result = await departmentsRepository.delete(deptId);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_DEPARTMENT_HAS_DEPENDENCIES', message: result.error || 'Cannot delete department with active dependencies' },
        timestamp: new Date().toISOString()
      });
    }

    // Audit Log: Department Deleted
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || deptId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'department_deleted' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: null,
      details: { department_id: deptId, name: existing.name }
    });

    return res.json({
      success: true,
      message: 'Department safely deleted',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DEPARTMENT_DELETE', message: err.message || 'Failed to delete department' },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
