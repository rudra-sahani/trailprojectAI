import { query } from './pg-client.js';
import { DbUser } from './db.js';
import {
  HierarchyDetailsResponse,
  HierarchyChainNode,
  OrgTreeNode,
  HierarchyHealthMetrics
} from '../../shared/types/api-contracts.js';

export class UsersRepository {
  async findById(id: string): Promise<DbUser | null> {
    const sql = `
      SELECT u.*,
             des.title as designation_title,
             des.seniority_level as designation_level,
             des.job_family as designation_job_family,
             d.name as department_name,
             t.name as team_name,
             m.full_name as manager_name,
             o.name as organization_name
      FROM users u
      LEFT JOIN designations des ON u.designation_id = des.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;
    const user = this.mapRowToUser(res.rows[0]);

    try {
      const cyclesRes = await query(
        `SELECT id, review_period, status, finalized_at
         FROM review_cycles
         WHERE employee_id = $1
         ORDER BY created_at DESC`,
        [id]
      );
      if (cyclesRes.rows.length > 0) {
        const activeCycle = cyclesRes.rows.find(c => c.status !== 'FINALIZED');
        if (activeCycle) {
          user.current_review_cycle = {
            id: activeCycle.id,
            review_period: activeCycle.review_period,
            status: activeCycle.status
          };
        }
        user.review_history = cyclesRes.rows.map(c => ({
          id: c.id,
          review_period: c.review_period,
          status: c.status,
          finalized_at: c.finalized_at ? new Date(c.finalized_at).toISOString() : null
        }));
      }
    } catch (err) {
      // ignore table query fallback
    }

    return user;
  }

  async findByEmail(email: string): Promise<DbUser | null> {
    const res = await query(
      `SELECT u.*,
              des.title as designation_title,
              des.seniority_level as designation_level,
              des.job_family as designation_job_family,
              d.name as department_name,
              t.name as team_name,
              m.full_name as manager_name,
              o.name as organization_name
       FROM users u
       LEFT JOIN designations des ON u.designation_id = des.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN teams t ON u.team_id = t.id
       LEFT JOIN users m ON u.manager_id = m.id
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  async findAll(filter?: { organizationId?: string; isArchived?: boolean }): Promise<DbUser[]> {
    return this.getEmployees(filter || {});
  }

  async findByOrgId(organizationId: string, includeArchived = false): Promise<DbUser[]> {
    return this.getEmployees({
      organizationId,
      isArchived: includeArchived ? undefined : false
    });
  }

  async findByManagerId(managerId: string): Promise<DbUser[]> {
    return this.findTeamMembers(managerId);
  }

  async findTeamMembers(managerId: string): Promise<DbUser[]> {
    const res = await query(
      `SELECT u.*,
              des.title as designation_title,
              des.seniority_level as designation_level,
              des.job_family as designation_job_family,
              d.name as department_name,
              t.name as team_name,
              m.full_name as manager_name,
              o.name as organization_name
       FROM users u
       LEFT JOIN designations des ON u.designation_id = des.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN teams t ON u.team_id = t.id
       LEFT JOIN users m ON u.manager_id = m.id
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE t.manager_id = $1 OR u.manager_id = $1
       ORDER BY u.created_at ASC`,
      [managerId]
    );
    return res.rows.map(r => this.mapRowToUser(r));
  }

  async getEmployees(params: {
    organizationId?: string;
    isArchived?: boolean;
    managerId?: string;
    departmentId?: string;
    teamId?: string;
  }): Promise<DbUser[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.organizationId) {
      conditions.push(`u.organization_id = $${idx}`);
      values.push(params.organizationId);
      idx++;
    }

    if (params.isArchived !== undefined) {
      conditions.push(`COALESCE(u.is_archived, FALSE) = $${idx}`);
      values.push(params.isArchived);
      idx++;
    }

    if (params.managerId) {
      conditions.push(`u.manager_id = $${idx}`);
      values.push(params.managerId);
      idx++;
    }

    if (params.departmentId) {
      conditions.push(`u.department_id = $${idx}`);
      values.push(params.departmentId);
      idx++;
    }

    if (params.teamId) {
      conditions.push(`u.team_id = $${idx}`);
      values.push(params.teamId);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT u.*,
             des.title as designation_title,
             des.seniority_level as designation_level,
             des.job_family as designation_job_family,
             d.name as department_name,
             t.name as team_name,
             m.full_name as manager_name,
             o.name as organization_name
      FROM users u
      LEFT JOIN designations des ON u.designation_id = des.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      ${whereClause}
      ORDER BY u.full_name ASC
    `;

    const res = await query(sql, values);
    return res.rows.map(r => this.mapRowToUser(r));
  }

  async create(user: DbUser, client?: any): Promise<DbUser> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO users (
        id, employee_code, full_name, email, role,
        phone, designation_id, job_title, department_id, team_id, manager_id,
        employment_type, joining_date, location, organization_id, avatar_url,
        is_active, is_archived, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        user.id,
        user.employee_code || `EMP-${Date.now().toString().slice(-4)}`,
        user.full_name,
        user.email,
        user.role || 'EMPLOYEE',
        user.phone || null,
        user.designation_id || null,
        user.job_title || 'Software Engineer',
        user.department_id || null,
        user.team_id || null,
        user.manager_id || null,
        user.employment_type || 'Full-time',
        user.joining_date || new Date().toISOString().split('T')[0],
        user.location || 'Remote',
        user.organization_id || null,
        user.avatar_url || null,
        user.is_active !== undefined ? user.is_active : true,
        user.is_archived !== undefined ? user.is_archived : false,
        user.created_at || new Date().toISOString(),
        user.updated_at || new Date().toISOString()
      ]
    );
    const created = await this.findById(res.rows[0].id);
    return created || this.mapRowToUser(res.rows[0]);
  }

  async update(id: string, updates: Partial<DbUser>, client?: any): Promise<DbUser | null> {
    const exec = client ? client.query.bind(client) : query;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (key === 'id' || key === 'department_name' || key === 'team_name' || key === 'manager_name' || key === 'organization_name' || key === 'current_review_cycle' || key === 'review_history') {
        continue;
      }
      fields.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = $${idx}`);
    values.push(new Date().toISOString());
    idx++;

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await exec(sql, values);
    if (res.rows.length === 0) return null;
    return this.findById(id);
  }

  async archive(id: string, client?: any): Promise<DbUser | null> {
    return this.update(id, { is_archived: true, is_active: false }, client);
  }

  async restore(id: string, client?: any): Promise<DbUser | null> {
    return this.update(id, { is_archived: false, is_active: true }, client);
  }

  async wouldCreateCycle(userId: string, proposedManagerId: string): Promise<boolean> {
    if (userId === proposedManagerId) return true;
    let currentId: string | null = proposedManagerId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === userId) return true;
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const res = await query('SELECT manager_id FROM users WHERE id = $1', [currentId]);
      if (res.rows.length === 0) break;
      currentId = res.rows[0].manager_id;
    }
    return false;
  }

  async assignManager(userId: string, managerId: string | null, client?: any): Promise<DbUser | null> {
    if (managerId && userId === managerId) {
      throw new Error('An employee cannot be assigned as their own reporting manager');
    }

    if (managerId) {
      const isCycle = await this.wouldCreateCycle(userId, managerId);
      if (isCycle) {
        throw new Error('Invalid reporting assignment: would create a circular reporting hierarchy');
      }
    }

    return this.update(userId, { manager_id: managerId }, client);
  }

  async getHierarchyDetails(userId: string): Promise<HierarchyDetailsResponse | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    const chain: HierarchyChainNode[] = [];
    let currId: string | null = user.id;
    const visited = new Set<string>();
    let depth = 1;

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const currUser = await this.findById(currId);
      if (!currUser) break;

      chain.push({
        id: currUser.id,
        employee_code: currUser.employee_code,
        full_name: currUser.full_name,
        email: currUser.email,
        role: currUser.role,
        job_title: currUser.job_title,
        designation_title: currUser.designation_title || undefined,
        department_name: currUser.department_name,
        team_name: currUser.team_name,
        avatar_url: currUser.avatar_url,
        depth
      });

      currId = currUser.manager_id || null;
      depth++;
    }

    const manager = chain.length > 1 ? chain[1] : null;
    const skip_level_manager = chain.length > 2 ? chain[2] : null;

    const direct_reports = await this.getEmployees({ managerId: userId, isArchived: false });

    return {
      user,
      manager,
      skip_level_manager,
      chain,
      direct_reports,
      depth: chain.length
    };
  }

  async getOrgTree(organizationId?: string): Promise<{ nodes: OrgTreeNode[]; health: HierarchyHealthMetrics }> {
    const allUsers = await this.getEmployees({ organizationId, isArchived: false });
    const userMap = new Map<string, OrgTreeNode>();
    const roots: OrgTreeNode[] = [];

    allUsers.forEach(u => {
      userMap.set(u.id, {
        id: u.id,
        employee_code: u.employee_code,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        job_title: u.job_title,
        designation_title: u.designation_title || undefined,
        department_id: u.department_id,
        department_name: u.department_name,
        team_id: u.team_id,
        team_name: u.team_name,
        manager_id: u.manager_id,
        avatar_url: u.avatar_url,
        direct_reports_count: 0,
        children: []
      });
    });

    allUsers.forEach(u => {
      const node = userMap.get(u.id)!;
      if (u.manager_id && userMap.has(u.manager_id)) {
        const parent = userMap.get(u.manager_id)!;
        parent.children.push(node);
        parent.direct_reports_count++;
      } else {
        roots.push(node);
      }
    });

    const health = await this.getHierarchyHealth(organizationId);

    return {
      nodes: roots,
      health
    };
  }

  async getHierarchyHealth(organizationId?: string): Promise<HierarchyHealthMetrics> {
    const allUsers = await this.getEmployees({ organizationId, isArchived: false });
    const total_employees = allUsers.length;

    let missing_manager_count = 0;
    let missing_designation_count = 0;

    allUsers.forEach(u => {
      // Top level OWNER/CEO might legitimately not have a manager, but multiple unassigned users need indicators
      if (!u.manager_id && u.role !== 'OWNER') {
        missing_manager_count++;
      }
      if (!u.designation_id && !u.designation_title) {
        missing_designation_count++;
      }
    });

    const totalDefects = missing_manager_count + missing_designation_count;
    const hierarchy_health_score = total_employees > 0
      ? Math.max(0, Math.min(100, Math.round(100 - ((totalDefects / (total_employees * 2)) * 100))))
      : 100;

    // Fetch largest departments
    const deptSql = `
      SELECT d.id, d.name, COUNT(u.id) as employee_count
      FROM departments d
      LEFT JOIN users u ON u.department_id = d.id AND COALESCE(u.is_archived, FALSE) = FALSE
      ${organizationId ? 'WHERE d.organization_id = $1 OR d.organization_id IS NULL' : ''}
      GROUP BY d.id, d.name
      ORDER BY employee_count DESC
      LIMIT 5
    `;
    const deptRes = await query(deptSql, organizationId ? [organizationId] : []);
    const largest_departments = deptRes.rows.map(r => ({
      id: r.id,
      name: r.name,
      employee_count: parseInt(String(r.employee_count), 10) || 0
    }));

    // Fetch largest teams
    const teamSql = `
      SELECT t.id, t.name, COUNT(u.id) as member_count
      FROM teams t
      LEFT JOIN users u ON u.team_id = t.id AND COALESCE(u.is_archived, FALSE) = FALSE
      ${organizationId ? 'WHERE t.organization_id = $1 OR t.organization_id IS NULL' : ''}
      GROUP BY t.id, t.name
      ORDER BY member_count DESC
      LIMIT 5
    `;
    const teamRes = await query(teamSql, organizationId ? [organizationId] : []);
    const largest_teams = teamRes.rows.map(r => ({
      id: r.id,
      name: r.name,
      member_count: parseInt(String(r.member_count), 10) || 0
    }));

    return {
      total_employees,
      missing_manager_count,
      missing_designation_count,
      hierarchy_health_score,
      largest_departments,
      largest_teams
    };
  }

  private mapRowToUser(row: any): DbUser {
    return {
      id: row.id,
      employee_code: row.employee_code,
      full_name: row.full_name,
      email: row.email,
      role: row.role,
      phone: row.phone || null,
      designation_id: row.designation_id || null,
      designation_title: row.designation_title || null,
      seniority_level: row.designation_level !== undefined && row.designation_level !== null ? Number(row.designation_level) : (row.seniority_level ? Number(row.seniority_level) : null),
      job_family: row.designation_job_family || row.job_family || null,
      job_title: row.job_title || 'Software Engineer',
      department_id: row.department_id || null,
      department_name: row.department_name,
      team_id: row.team_id || null,
      team_name: row.team_name,
      manager_id: row.manager_id || null,
      manager_name: row.manager_name,
      employment_type: row.employment_type || 'Full-time',
      joining_date: row.joining_date ? String(row.joining_date).split('T')[0] : new Date().toISOString().split('T')[0],
      location: row.location || 'Remote',
      organization_id: row.organization_id || null,
      organization_name: row.organization_name,
      avatar_url: row.avatar_url || null,
      is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
      is_archived: Boolean(row.is_archived),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }
}

export const usersRepository = new UsersRepository();
