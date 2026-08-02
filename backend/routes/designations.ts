import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { designationsRepository, auditRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { CreateDesignationRequest, UpdateDesignationRequest } from '../../shared/types/api-contracts.js';

const router = Router();

// GET /api/v1/designations - List all designations
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const includeArchived = req.query.include_archived === 'true' || req.query.includeArchived === 'true';
    const departmentId = req.query.department_id as string | undefined;

    const designations = await designationsRepository.findAll({
      organizationId: user.organization_id || undefined,
      departmentId,
      includeArchived
    });

    return res.json({
      success: true,
      data: designations,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DESIGNATIONS_FETCH', message: err.message || 'Failed to fetch designations' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/designations/:id - Get single designation details
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const des = await designationsRepository.findById(req.params.id);
    if (!des) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DESIGNATION_NOT_FOUND', message: 'Designation not found' },
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: des,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DESIGNATION_FETCH', message: err.message || 'Failed to fetch designation' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/designations - Create designation (OWNER / HR_ADMIN)
router.post('/', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const body: CreateDesignationRequest = req.body;

    if (!body.title || !body.title.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_INVALID_PAYLOAD', message: 'Designation title is required' },
        timestamp: new Date().toISOString()
      });
    }

    // Check duplicate
    const existing = await designationsRepository.findByTitle(body.title.trim(), user.organization_id || undefined);
    if (existing && !existing.is_archived) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_DESIGNATION_EXISTS', message: 'A designation with this title already exists' },
        timestamp: new Date().toISOString()
      });
    }

    const created = await designationsRepository.create({
      organization_id: user.organization_id || '00000000-0000-0000-0000-000000000001',
      title: body.title.trim(),
      description: body.description,
      department_id: body.department_id || null,
      seniority_level: body.seniority_level || 1,
      job_family: body.job_family || 'Engineering'
    });

    // Audit log
    await auditRepository.log({
      id: uuidv4(),
      actor_id: user.id,
      action: 'DESIGNATION_CREATED',
      resource_type: 'DESIGNATION',
      resource_id: created.id,
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: created,
      details: { title: created.title, seniority_level: created.seniority_level, job_family: created.job_family }
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: 'Designation created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DESIGNATION_CREATE', message: err.message || 'Failed to create designation' },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/v1/designations/:id - Update designation (OWNER / HR_ADMIN)
router.put('/:id', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const designationId = req.params.id;
    const body: UpdateDesignationRequest = req.body;

    const existing = await designationsRepository.findById(designationId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DESIGNATION_NOT_FOUND', message: 'Designation not found' },
        timestamp: new Date().toISOString()
      });
    }

    if (body.title && body.title.trim() !== existing.title) {
      const dup = await designationsRepository.findByTitle(body.title.trim(), user.organization_id || undefined);
      if (dup && dup.id !== designationId && !dup.is_archived) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_DESIGNATION_EXISTS', message: 'Another designation with this title already exists' },
          timestamp: new Date().toISOString()
        });
      }
    }

    const updated = await designationsRepository.update(designationId, {
      title: body.title ? body.title.trim() : undefined,
      description: body.description !== undefined ? body.description : undefined,
      department_id: body.department_id !== undefined ? body.department_id : undefined,
      seniority_level: body.seniority_level !== undefined ? body.seniority_level : undefined,
      job_family: body.job_family !== undefined ? body.job_family : undefined,
      status: body.status !== undefined ? body.status : undefined
    });

    await auditRepository.log({
      id: uuidv4(),
      actor_id: user.id,
      action: 'DESIGNATION_UPDATED',
      resource_type: 'DESIGNATION',
      resource_id: designationId,
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: updated,
      details: { updates: body }
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Designation updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DESIGNATION_UPDATE', message: err.message || 'Failed to update designation' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/designations/:id/archive - Archive designation (OWNER / HR_ADMIN)
router.post('/:id/archive', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const designationId = req.params.id;

    const existing = await designationsRepository.findById(designationId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DESIGNATION_NOT_FOUND', message: 'Designation not found' },
        timestamp: new Date().toISOString()
      });
    }

    const archived = await designationsRepository.archive(designationId);

    await auditRepository.log({
      id: uuidv4(),
      actor_id: user.id,
      action: 'DESIGNATION_ARCHIVED',
      resource_type: 'DESIGNATION',
      resource_id: designationId,
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: archived,
      details: { title: existing.title }
    });

    return res.json({
      success: true,
      data: archived,
      message: 'Designation archived successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DESIGNATION_ARCHIVE', message: err.message || 'Failed to archive designation' },
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/v1/designations/:id - Delete or archive designation
router.delete('/:id', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const designationId = req.params.id;

    const existing = await designationsRepository.findById(designationId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DESIGNATION_NOT_FOUND', message: 'Designation not found' },
        timestamp: new Date().toISOString()
      });
    }

    const archived = await designationsRepository.archive(designationId);

    await auditRepository.log({
      id: uuidv4(),
      actor_id: user.id,
      action: 'DESIGNATION_ARCHIVED',
      resource_type: 'DESIGNATION',
      resource_id: designationId,
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: archived,
      details: { title: existing.title }
    });

    return res.json({
      success: true,
      data: archived,
      message: 'Designation archived successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DESIGNATION_DELETE', message: err.message || 'Failed to delete designation' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/designations/:id/restore - Restore designation (OWNER / HR_ADMIN)
router.post('/:id/restore', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const designationId = req.params.id;

    const existing = await designationsRepository.findById(designationId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_DESIGNATION_NOT_FOUND', message: 'Designation not found' },
        timestamp: new Date().toISOString()
      });
    }

    const restored = await designationsRepository.restore(designationId);

    await auditRepository.log({
      id: uuidv4(),
      actor_id: user.id,
      action: 'DESIGNATION_RESTORED',
      resource_type: 'DESIGNATION',
      resource_id: designationId,
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: restored,
      details: { title: existing.title }
    });

    return res.json({
      success: true,
      data: restored,
      message: 'Designation restored successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_DESIGNATION_RESTORE', message: err.message || 'Failed to restore designation' },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
