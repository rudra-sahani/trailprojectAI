import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { teamsRepository, departmentsRepository, auditRepository } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { CreateTeamRequest, UpdateTeamRequest } from '../../shared/types/api-contracts.js';

const router = Router();

// GET /api/v1/teams - List teams
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const departmentId = req.query.department_id as string | undefined;
    const includeArchived = req.query.include_archived === 'true';

    const teams = await teamsRepository.findAll({
      organizationId: user.organization_id || undefined,
      departmentId,
      includeArchived
    });

    return res.json({
      success: true,
      data: teams,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_TEAMS_FETCH', message: err.message || 'Failed to fetch teams' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/teams/:id - Get team details with members
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const team = await teamsRepository.findById(req.params.id, true);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_TEAM_NOT_FOUND', message: 'Team not found' },
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: team,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_TEAM_FETCH', message: err.message || 'Failed to fetch team' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/teams - Create team
router.post('/', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const body: CreateTeamRequest = req.body;

    if (!body.name || !body.name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_INVALID_NAME', message: 'Team name is required' },
        timestamp: new Date().toISOString()
      });
    }

    // Check duplicate team name in org
    const existing = await teamsRepository.findByName(body.name.trim(), user.organization_id || undefined);
    if (existing && !existing.is_archived) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_DUPLICATE_TEAM', message: 'A team with this name already exists in the organization' },
        timestamp: new Date().toISOString()
      });
    }

    const teamId = uuidv4();
    const created = await teamsRepository.create({
      id: teamId,
      name: body.name.trim(),
      description: body.description || '',
      department_id: body.department_id || null,
      manager_id: body.manager_id || (user.role === 'MANAGER' ? user.id : null),
      organization_id: user.organization_id || null,
      is_archived: false,
      created_at: new Date().toISOString()
    });

    // If member_ids were supplied, assign them
    let assignedMembers: any[] = [];
    if (Array.isArray(body.member_ids) && body.member_ids.length > 0) {
      assignedMembers = await teamsRepository.updateMembers(teamId, body.member_ids, body.department_id);
    }

    const fullTeam = await teamsRepository.findById(teamId, true);

    // Audit Log: Team Created
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || teamId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'team_created' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: fullTeam,
      details: { team_id: teamId, name: created.name, department_id: body.department_id }
    });

    return res.status(201).json({
      success: true,
      data: fullTeam,
      message: 'Team created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_TEAM_CREATE', message: err.message || 'Failed to create team' },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/v1/teams/:id - Update team
router.put('/:id', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const teamId = req.params.id;
    const body: UpdateTeamRequest = req.body;

    const existing = await teamsRepository.findById(teamId, true);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_TEAM_NOT_FOUND', message: 'Team not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Manager RBAC check: Manager can only edit teams they manage or in their department
    if (user.role === 'MANAGER' && existing.manager_id !== user.id && existing.department_id !== user.department_id) {
      return res.status(403).json({
        success: false,
        error: { code: 'ERR_FORBIDDEN', message: 'You are not authorized to manage this team' },
        timestamp: new Date().toISOString()
      });
    }

    if (body.name && body.name.trim() !== existing.name) {
      const duplicate = await teamsRepository.findByName(body.name.trim(), user.organization_id || undefined);
      if (duplicate && duplicate.id !== teamId) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_DUPLICATE_TEAM', message: 'Another team already has this name' },
          timestamp: new Date().toISOString()
        });
      }
    }

    await teamsRepository.update(teamId, {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.department_id !== undefined ? { department_id: body.department_id } : {}),
      ...(body.manager_id !== undefined ? { manager_id: body.manager_id } : {})
    });

    if (Array.isArray(body.member_ids)) {
      const deptId = body.department_id !== undefined ? body.department_id : existing.department_id;
      await teamsRepository.updateMembers(teamId, body.member_ids, deptId);
    }

    const updated = await teamsRepository.findById(teamId, true);

    // Audit Log: Team Updated
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || teamId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'team_updated' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: updated,
      details: { team_id: teamId, updates: body }
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Team updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_TEAM_UPDATE', message: err.message || 'Failed to update team' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/teams/:id/members - Assign / update team members
router.post('/:id/members', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const teamId = req.params.id;
    const { member_ids } = req.body;

    if (!Array.isArray(member_ids)) {
      return res.status(400).json({
        success: false,
        error: { code: 'ERR_INVALID_MEMBERS', message: 'member_ids must be an array of user IDs' },
        timestamp: new Date().toISOString()
      });
    }

    const existing = await teamsRepository.findById(teamId, true);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_TEAM_NOT_FOUND', message: 'Team not found' },
        timestamp: new Date().toISOString()
      });
    }

    const updatedMembers = await teamsRepository.updateMembers(teamId, member_ids, existing.department_id);
    const updatedTeam = await teamsRepository.findById(teamId, true);

    // Audit Log: Team Members Updated
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || teamId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'team_members_updated' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: { member_ids: existing.members?.map(m => m.id) },
      after_state: { member_ids },
      details: { team_id: teamId, member_count: member_ids.length }
    });

    return res.json({
      success: true,
      data: updatedTeam,
      message: 'Team members updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_TEAM_MEMBERS_UPDATE', message: err.message || 'Failed to update team members' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST or PATCH /api/v1/teams/:id/archive - Archive team
const handleArchive = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const teamId = req.params.id;

    const existing = await teamsRepository.findById(teamId, false);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_TEAM_NOT_FOUND', message: 'Team not found' },
        timestamp: new Date().toISOString()
      });
    }

    const archived = await teamsRepository.archive(teamId);

    // Audit Log: Team Archived
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || teamId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'team_archived' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: archived,
      details: { team_id: teamId, name: existing.name }
    });

    return res.json({
      success: true,
      data: archived,
      message: 'Team archived successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_TEAM_ARCHIVE', message: err.message || 'Failed to archive team' },
      timestamp: new Date().toISOString()
    });
  }
};

router.post('/:id/archive', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), handleArchive);
router.patch('/:id/archive', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), handleArchive);

// POST or PATCH /api/v1/teams/:id/restore - Restore team
const handleRestore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const teamId = req.params.id;

    const existing = await teamsRepository.findById(teamId, false);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_TEAM_NOT_FOUND', message: 'Team not found' },
        timestamp: new Date().toISOString()
      });
    }

    const restored = await teamsRepository.restore(teamId);

    // Audit Log: Team Restored
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || teamId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'team_restored' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: restored,
      details: { team_id: teamId, name: existing.name }
    });

    return res.json({
      success: true,
      data: restored,
      message: 'Team restored successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_TEAM_RESTORE', message: err.message || 'Failed to restore team' },
      timestamp: new Date().toISOString()
    });
  }
};

router.post('/:id/restore', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), handleRestore);
router.patch('/:id/restore', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), handleRestore);

// DELETE /api/v1/teams/:id - Delete team
router.delete('/:id', authMiddleware, rbacMiddleware(['OWNER', 'HR_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const teamId = req.params.id;

    const existing = await teamsRepository.findById(teamId, false);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ERR_TEAM_NOT_FOUND', message: 'Team not found' },
        timestamp: new Date().toISOString()
      });
    }

    await teamsRepository.delete(teamId);

    // Audit Log: Team Deleted
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: user.organization_id || teamId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'team_deleted' as any,
      actor: { actor_type: 'human', actor_id: user.id },
      timestamp: new Date().toISOString(),
      before_state: existing,
      after_state: null,
      details: { team_id: teamId, name: existing.name }
    });

    return res.json({
      success: true,
      message: 'Team deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ERR_TEAM_DELETE', message: err.message || 'Failed to delete team' },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
