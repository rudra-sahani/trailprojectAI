import { query } from './pg-client.js';
import { DbTeam } from './db.js';
import { TeamRecord, UserProfile } from '../../shared/types/api-contracts.js';
import { usersRepository } from './users.repository.js';

export class TeamsRepository {
  async findAll(filter?: { organizationId?: string; departmentId?: string; includeArchived?: boolean }): Promise<TeamRecord[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter?.organizationId) {
      conditions.push(`(t.organization_id = $${idx} OR t.organization_id IS NULL)`);
      values.push(filter.organizationId);
      idx++;
    }

    if (filter?.departmentId) {
      conditions.push(`t.department_id = $${idx}`);
      values.push(filter.departmentId);
      idx++;
    }

    if (!filter?.includeArchived) {
      conditions.push(`COALESCE(t.is_archived, FALSE) = FALSE`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT t.id, t.department_id, t.manager_id, t.name, t.description, t.organization_id, t.is_archived, t.created_at, t.updated_at,
             d.name as department_name,
             m.full_name as manager_name,
             m.email as manager_email
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users m ON t.manager_id = m.id
      ${whereClause}
      ORDER BY t.name ASC
    `;

    const res = await query(sql, values);
    return Promise.all(res.rows.map(async (row) => {
      const rec = await this.mapRowToRecord(row, false);
      try {
        const memCountRes = await query(`SELECT COUNT(*) as count FROM users WHERE team_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
        rec.member_count = parseInt(memCountRes.rows[0]?.count || '0', 10);
      } catch (e) {
        rec.member_count = 0;
      }
      return rec;
    }));
  }

  async findById(id: string, includeMembers = true): Promise<TeamRecord | null> {
    const sql = `
      SELECT t.id, t.department_id, t.manager_id, t.name, t.description, t.organization_id, t.is_archived, t.created_at, t.updated_at,
             d.name as department_name,
             m.full_name as manager_name,
             m.email as manager_email
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users m ON t.manager_id = m.id
      WHERE t.id = $1
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;
    const rec = await this.mapRowToRecord(res.rows[0], includeMembers);
    try {
      const memCountRes = await query(`SELECT COUNT(*) as count FROM users WHERE team_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
      rec.member_count = parseInt(memCountRes.rows[0]?.count || '0', 10);
    } catch (e) {
      rec.member_count = 0;
    }
    return rec;
  }

  async findByName(name: string, organizationId?: string): Promise<TeamRecord | null> {
    const conditions = ['LOWER(t.name) = LOWER($1)'];
    const values: any[] = [name.trim()];

    if (organizationId) {
      conditions.push('(t.organization_id = $2 OR t.organization_id IS NULL)');
      values.push(organizationId);
    }

    const sql = `
      SELECT t.id, t.department_id, t.manager_id, t.name, t.description, t.organization_id, t.is_archived, t.created_at, t.updated_at,
             d.name as department_name,
             m.full_name as manager_name,
             m.email as manager_email
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users m ON t.manager_id = m.id
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `;
    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    const rec = await this.mapRowToRecord(res.rows[0], false);
    try {
      const memCountRes = await query(`SELECT COUNT(*) as count FROM users WHERE team_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
      rec.member_count = parseInt(memCountRes.rows[0]?.count || '0', 10);
    } catch (e) {
      rec.member_count = 0;
    }
    return rec;
  }

  async create(team: DbTeam, client?: any): Promise<TeamRecord> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO teams (id, department_id, manager_id, name, description, organization_id, is_archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         department_id = EXCLUDED.department_id,
         manager_id = EXCLUDED.manager_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_archived = EXCLUDED.is_archived,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        team.id,
        team.department_id || null,
        team.manager_id || null,
        team.name.trim(),
        team.description || null,
        team.organization_id || null,
        team.is_archived || false,
        team.created_at || new Date().toISOString(),
        team.updated_at || new Date().toISOString()
      ]
    );

    const created = await this.findById(res.rows[0].id, false);
    return created || this.mapRowToRecord(res.rows[0], false);
  }

  async update(id: string, updates: Partial<DbTeam>, client?: any): Promise<TeamRecord | null> {
    const exec = client ? client.query.bind(client) : query;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx}`);
      values.push(updates.name.trim());
      idx++;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${idx}`);
      values.push(updates.description);
      idx++;
    }

    if (updates.department_id !== undefined) {
      fields.push(`department_id = $${idx}`);
      values.push(updates.department_id);
      idx++;
    }

    if (updates.manager_id !== undefined) {
      fields.push(`manager_id = $${idx}`);
      values.push(updates.manager_id);
      idx++;
    }

    if (updates.organization_id !== undefined) {
      fields.push(`organization_id = $${idx}`);
      values.push(updates.organization_id);
      idx++;
    }

    if (updates.is_archived !== undefined) {
      fields.push(`is_archived = $${idx}`);
      values.push(updates.is_archived);
      idx++;
    }

    if (fields.length === 0) return this.findById(id, false);

    fields.push(`updated_at = $${idx}`);
    values.push(new Date().toISOString());
    idx++;

    values.push(id);
    const sql = `UPDATE teams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await exec(sql, values);
    if (res.rows.length === 0) return null;
    return this.findById(id, true);
  }

  async archive(id: string): Promise<TeamRecord | null> {
    return this.update(id, { is_archived: true });
  }

  async restore(id: string): Promise<TeamRecord | null> {
    return this.update(id, { is_archived: false });
  }

  async delete(id: string): Promise<{ success: boolean }> {
    // Unassign team_id from users
    await query('UPDATE users SET team_id = NULL WHERE team_id = $1', [id]);
    await query('DELETE FROM teams WHERE id = $1', [id]);
    return { success: true };
  }

  async updateMembers(teamId: string, memberIds: string[], departmentId?: string | null): Promise<UserProfile[]> {
    // 1. Unassign users currently in this team but not in memberIds
    if (memberIds.length === 0) {
      await query('UPDATE users SET team_id = NULL WHERE team_id = $1', [teamId]);
    } else {
      await query('UPDATE users SET team_id = NULL WHERE team_id = $1 AND id NOT IN (' + memberIds.map((_, i) => `$${i + 2}`).join(',') + ')', [teamId, ...memberIds]);
    }

    // 2. Assign team_id and optionally department_id for specified memberIds
    for (const uid of memberIds) {
      if (departmentId) {
        await query('UPDATE users SET team_id = $1, department_id = $2 WHERE id = $3', [teamId, departmentId, uid]);
      } else {
        await query('UPDATE users SET team_id = $1 WHERE id = $2', [teamId, uid]);
      }
    }

    // 3. Return updated members
    const team = await this.findById(teamId, true);
    return team?.members || [];
  }

  private async mapRowToRecord(r: any, includeMembers = false): Promise<TeamRecord> {
    const isArchived = Boolean(r.is_archived);
    let members: UserProfile[] = [];

    if (includeMembers) {
      members = await usersRepository.getEmployees({ teamId: r.id, isArchived: false });
    }

    return {
      id: r.id,
      name: r.name,
      description: r.description || '',
      department_id: r.department_id || null,
      department_name: r.department_name || null,
      organization_id: r.organization_id || null,
      manager_id: r.manager_id || null,
      manager_name: r.manager_name || null,
      manager_email: r.manager_email || null,
      members,
      member_count: parseInt(r.member_count || '0', 10),
      is_archived: isArchived,
      status: isArchived ? 'ARCHIVED' : 'ACTIVE',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null
    };
  }
}

export const teamsRepository = new TeamsRepository();
