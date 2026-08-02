import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { usersRepository, auditRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';

const router = Router();

// GET /api/v1/users/team - Team members for manager / HR
router.get('/team', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.id;
  let teamMembers = await usersRepository.findByManagerId(currentUserId);
  if (req.user!.role === 'HR_ADMIN' || req.user!.role === 'OWNER') {
    teamMembers = await usersRepository.getEmployees({
      organizationId: req.user!.organization_id || undefined,
      isArchived: false
    });
  }

  return res.json({
    success: true,
    data: teamMembers,
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/users/org-chart - Org Chart Tree
router.get('/org-chart', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tree = await usersRepository.getOrgTree(req.user!.organization_id || undefined);
    return res.json({
      success: true,
      data: tree,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_ORG_CHART', message: err.message || 'Failed to fetch org chart' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/users/:id/hierarchy - Get employee hierarchy
router.get('/:id/hierarchy', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hierarchy = await usersRepository.getHierarchyDetails(req.params.id);
    if (!hierarchy) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_NOT_FOUND', message: 'Employee not found' },
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
      error: { code: 'ERR_HIERARCHY_FETCH', message: err.message || 'Failed to fetch hierarchy' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/users/:id/direct-reports - Get direct reports
router.get('/:id/direct-reports', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const directReports = await usersRepository.getEmployees({
      managerId: req.params.id,
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
      error: { code: 'ERR_DIRECT_REPORTS', message: err.message || 'Failed to fetch direct reports' },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/v1/users/:id/manager - Assign / change manager
router.post('/:id/manager', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  return handleManagerAssignment(req, res);
});
router.put('/:id/manager', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  return handleManagerAssignment(req, res);
});

async function handleManagerAssignment(req: AuthenticatedRequest, res: Response) {
  const targetId = req.params.id;
  const { manager_id, managerId } = req.body;
  const newManagerId = manager_id !== undefined ? manager_id : managerId;

  try {
    const targetUser = await usersRepository.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_NOT_FOUND', message: 'Employee not found' },
        timestamp: new Date().toISOString()
      });
    }

    const updatedUser = await usersRepository.assignManager(targetId, newManagerId || null);

    await auditRepository.log({
      id: uuidv4(),
      actor_id: req.user!.id,
      action: 'MANAGER_CHANGED',
      resource_type: 'USER',
      resource_id: targetId,
      timestamp: new Date().toISOString(),
      before_state: { manager_id: targetUser.manager_id },
      after_state: { manager_id: updatedUser?.manager_id },
      details: { previous_manager: targetUser.manager_id, new_manager: newManagerId }
    });

    await auditRepository.log({
      id: uuidv4(),
      actor_id: req.user!.id,
      action: 'HIERARCHY_UPDATED',
      resource_type: 'ORGANIZATION',
      resource_id: req.user!.organization_id || 'DEFAULT_ORG',
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: { targetId, newManagerId },
      details: { employee_name: targetUser.full_name }
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: 'Reporting manager updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_HIERARCHY_ASSIGNMENT', message: err.message || 'Failed to update manager' },
      timestamp: new Date().toISOString()
    });
  }
}

// GET /api/v1/users - List employees
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const includeArchived = req.query.includeArchived === 'true';
  const orgId = req.user!.organization_id || undefined;

  // Only OWNER or HR_ADMIN can query archived employees
  const canSeeArchived = req.user!.role === 'OWNER' || req.user!.role === 'HR_ADMIN';
  const isArchived = canSeeArchived && includeArchived ? true : false;

  let employees = await usersRepository.getEmployees({
    organizationId: orgId,
    isArchived
  });

  return res.json({
    success: true,
    data: employees,
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/users/:id - Get single employee profile
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const user = await usersRepository.findById(targetId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Employee not found' },
      timestamp: new Date().toISOString()
    });
  }

  return res.json({
    success: true,
    data: user,
    timestamp: new Date().toISOString()
  });
});

// POST /api/v1/users - Create new employee
router.post('/', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const {
    full_name,
    email,
    role,
    phone,
    job_title,
    designation_id,
    department_id,
    team_id,
    manager_id,
    employment_type,
    joining_date,
    location,
    avatar_url
  } = req.body;

  if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_INVALID_INPUT', message: 'Full name is required' },
      timestamp: new Date().toISOString()
    });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_INVALID_INPUT', message: 'Valid email address is required' },
      timestamp: new Date().toISOString()
    });
  }

  const existingEmail = await usersRepository.findByEmail(email.trim());
  if (existingEmail) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_DUPLICATE_EMAIL', message: 'An employee with this email address already exists' },
      timestamp: new Date().toISOString()
    });
  }

  const newUserId = uuidv4();
  const empCode = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const created = await usersRepository.create({
    id: newUserId,
    employee_code: empCode,
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    role: role || 'EMPLOYEE',
    phone: phone || null,
    job_title: job_title || 'Software Engineer',
    designation_id: designation_id || null,
    department_id: department_id || null,
    team_id: team_id || null,
    manager_id: manager_id || null,
    employment_type: employment_type || 'Full-time',
    joining_date: joining_date || new Date().toISOString().split('T')[0],
    location: location || 'Remote',
    organization_id: req.user!.organization_id || null,
    avatar_url: avatar_url || null,
    is_active: true,
    is_archived: false,
    created_at: new Date().toISOString()
  });

  // Audit Log
  await auditRepository.addEntry({
    log_id: uuidv4(),
    event_type: 'EMPLOYEE_CREATED' as any,
    actor_id: req.user!.id,
    actor_type: 'human',
    after_state: created,
    details: { employee_id: created.id, employee_name: created.full_name, created_by: req.user!.email }
  });

  return res.status(201).json({
    success: true,
    data: created,
    message: 'Employee created successfully',
    timestamp: new Date().toISOString()
  });
});

// PUT /api/v1/users/:id - Edit employee profile
router.put('/:id', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const existingUser = await usersRepository.findById(targetId);

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Employee not found' },
      timestamp: new Date().toISOString()
    });
  }

  // RBAC Hierarchy check for Manager
  if (req.user!.role === 'MANAGER') {
    const isDirectReport = existingUser.manager_id === req.user!.id;
    const teamMembers = await usersRepository.findByManagerId(req.user!.id);
    const isTeamMember = teamMembers.some(m => m.id === targetId);

    if (!isDirectReport && !isTeamMember && existingUser.id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'ERR_FORBIDDEN', message: 'Managers cannot edit users outside their reporting hierarchy' },
        timestamp: new Date().toISOString()
      });
    }
  }

  const {
    full_name,
    email,
    role,
    phone,
    job_title,
    designation_id,
    department_id,
    team_id,
    manager_id,
    employment_type,
    joining_date,
    location,
    avatar_url,
    is_active
  } = req.body;

  if (email && email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
    const existingEmail = await usersRepository.findByEmail(email.trim());
    if (existingEmail && existingEmail.id !== targetId) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_DUPLICATE_EMAIL', message: 'Email address is already in use' },
        timestamp: new Date().toISOString()
      });
    }
  }

  const updates: Partial<any> = {};
  if (full_name !== undefined) updates.full_name = full_name.trim();
  if (email !== undefined) updates.email = email.trim().toLowerCase();
  if (role !== undefined && (req.user!.role === 'OWNER' || req.user!.role === 'HR_ADMIN')) updates.role = role;
  if (phone !== undefined) updates.phone = phone;
  if (job_title !== undefined) updates.job_title = job_title;
  if (designation_id !== undefined) updates.designation_id = designation_id;
  if (department_id !== undefined) updates.department_id = department_id;
  if (team_id !== undefined) updates.team_id = team_id;
  if (manager_id !== undefined) updates.manager_id = manager_id;
  if (employment_type !== undefined) updates.employment_type = employment_type;
  if (joining_date !== undefined) updates.joining_date = joining_date;
  if (location !== undefined) updates.location = location;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  if (is_active !== undefined) updates.is_active = Boolean(is_active);

  const updated = await usersRepository.update(targetId, updates);

  // Audit Log
  await auditRepository.addEntry({
    log_id: uuidv4(),
    event_type: 'EMPLOYEE_UPDATED' as any,
    actor_id: req.user!.id,
    actor_type: 'human',
    before_state: existingUser,
    after_state: updated,
    details: { employee_id: targetId, updated_by: req.user!.email }
  });

  return res.json({
    success: true,
    data: updated,
    message: 'Employee updated successfully',
    timestamp: new Date().toISOString()
  });
});

// PATCH /api/v1/users/:id/archive - Archive employee (soft delete)
router.patch('/:id/archive', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const existingUser = await usersRepository.findById(targetId);

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Employee not found' },
      timestamp: new Date().toISOString()
    });
  }

  const archived = await usersRepository.archive(targetId);

  // Audit Log
  await auditRepository.addEntry({
    log_id: uuidv4(),
    event_type: 'EMPLOYEE_ARCHIVED' as any,
    actor_id: req.user!.id,
    actor_type: 'human',
    before_state: existingUser,
    after_state: archived,
    details: { employee_id: targetId, archived_by: req.user!.email }
  });

  return res.json({
    success: true,
    data: archived,
    message: 'Employee archived successfully',
    timestamp: new Date().toISOString()
  });
});

// PATCH /api/v1/users/:id/restore - Restore archived employee
router.patch('/:id/restore', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const existingUser = await usersRepository.findById(targetId);

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: 'Employee not found' },
      timestamp: new Date().toISOString()
    });
  }

  const restored = await usersRepository.restore(targetId);

  // Audit Log
  await auditRepository.addEntry({
    log_id: uuidv4(),
    event_type: 'EMPLOYEE_RESTORED' as any,
    actor_id: req.user!.id,
    actor_type: 'human',
    before_state: existingUser,
    after_state: restored,
    details: { employee_id: targetId, restored_by: req.user!.email }
  });

  return res.json({
    success: true,
    data: restored,
    message: 'Employee restored successfully',
    timestamp: new Date().toISOString()
  });
});

export default router;
