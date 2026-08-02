import { query } from './pg-client.js';
import { DbDepartment } from './db.js';
import { DepartmentRecord } from '../../shared/types/api-contracts.js';

export class DepartmentsRepository {
  async findAll(filter?: { organizationId?: string; includeArchived?: boolean }): Promise<DepartmentRecord[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter?.organizationId) {
      conditions.push(`(d.organization_id = $${idx} OR d.organization_id IS NULL)`);
      values.push(filter.organizationId);
      idx++;
    }

    if (!filter?.includeArchived) {
      conditions.push(`COALESCE(d.is_archived, FALSE) = FALSE`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT d.id, d.name, d.description, d.organization_id, d.head_id, d.is_archived, d.created_at, d.updated_at,
             u.full_name as head_name,
             u.email as head_email
      FROM departments d
      LEFT JOIN users u ON d.head_id = u.id
      ${whereClause}
      ORDER BY d.name ASC
    `;

    const res = await query(sql, values);
    const records = await Promise.all(res.rows.map(async (row) => {
      const rec = this.mapRowToRecord(row);
      try {
        const empCountRes = await query(`SELECT COUNT(*) as count FROM users WHERE department_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
        rec.employee_count = parseInt(empCountRes.rows[0]?.count || '0', 10);

        const teamCountRes = await query(`SELECT COUNT(*) as count FROM teams WHERE department_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
        rec.active_team_count = parseInt(teamCountRes.rows[0]?.count || '0', 10);
      } catch (e) {
        rec.employee_count = 0;
        rec.active_team_count = 0;
      }
      return rec;
    }));

    return records;
  }

  async findById(id: string): Promise<DepartmentRecord | null> {
    const sql = `
      SELECT d.id, d.name, d.description, d.organization_id, d.head_id, d.is_archived, d.created_at, d.updated_at,
             u.full_name as head_name,
             u.email as head_email
      FROM departments d
      LEFT JOIN users u ON d.head_id = u.id
      WHERE d.id = $1
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;
    const rec = this.mapRowToRecord(res.rows[0]);
    try {
      const empCountRes = await query(`SELECT COUNT(*) as count FROM users WHERE department_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
      rec.employee_count = parseInt(empCountRes.rows[0]?.count || '0', 10);

      const teamCountRes = await query(`SELECT COUNT(*) as count FROM teams WHERE department_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
      rec.active_team_count = parseInt(teamCountRes.rows[0]?.count || '0', 10);
    } catch (e) {
      rec.employee_count = 0;
      rec.active_team_count = 0;
    }
    return rec;
  }

  async findByName(name: string, organizationId?: string): Promise<DepartmentRecord | null> {
    const conditions = ['LOWER(d.name) = LOWER($1)'];
    const values: any[] = [name.trim()];

    if (organizationId) {
      conditions.push('(d.organization_id = $2 OR d.organization_id IS NULL)');
      values.push(organizationId);
    }

    const sql = `
      SELECT d.id, d.name, d.description, d.organization_id, d.head_id, d.is_archived, d.created_at, d.updated_at,
             u.full_name as head_name,
             u.email as head_email
      FROM departments d
      LEFT JOIN users u ON d.head_id = u.id
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `;
    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    const rec = this.mapRowToRecord(res.rows[0]);
    try {
      const empCountRes = await query(`SELECT COUNT(*) as count FROM users WHERE department_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
      rec.employee_count = parseInt(empCountRes.rows[0]?.count || '0', 10);

      const teamCountRes = await query(`SELECT COUNT(*) as count FROM teams WHERE department_id = $1 AND COALESCE(is_archived, FALSE) = FALSE`, [rec.id]);
      rec.active_team_count = parseInt(teamCountRes.rows[0]?.count || '0', 10);
    } catch (e) {
      rec.employee_count = 0;
      rec.active_team_count = 0;
    }
    return rec;
  }

  async create(dept: DbDepartment, client?: any): Promise<DepartmentRecord> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO departments (id, name, description, organization_id, head_id, is_archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         head_id = EXCLUDED.head_id,
         is_archived = EXCLUDED.is_archived,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        dept.id,
        dept.name.trim(),
        dept.description || null,
        dept.organization_id || null,
        dept.head_id || null,
        dept.is_archived || false,
        dept.created_at || new Date().toISOString(),
        dept.updated_at || new Date().toISOString()
      ]
    );

    const record = await this.findById(res.rows[0].id);
    return record || this.mapRowToRecord(res.rows[0]);
  }

  async update(id: string, updates: Partial<DbDepartment>, client?: any): Promise<DepartmentRecord | null> {
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

    if (updates.head_id !== undefined) {
      fields.push(`head_id = $${idx}`);
      values.push(updates.head_id);
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

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = $${idx}`);
    values.push(new Date().toISOString());
    idx++;

    values.push(id);
    const sql = `UPDATE departments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await exec(sql, values);
    if (res.rows.length === 0) return null;
    return this.findById(id);
  }

  async archive(id: string): Promise<DepartmentRecord | null> {
    return this.update(id, { is_archived: true });
  }

  async restore(id: string): Promise<DepartmentRecord | null> {
    return this.update(id, { is_archived: false });
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    // Check dependent active teams or employees
    const empRes = await query('SELECT COUNT(*) as cnt FROM users WHERE department_id = $1 AND COALESCE(is_archived, FALSE) = FALSE', [id]);
    const empCount = parseInt(empRes.rows[0]?.cnt || '0', 10);

    const teamRes = await query('SELECT COUNT(*) as cnt FROM teams WHERE department_id = $1 AND COALESCE(is_archived, FALSE) = FALSE', [id]);
    const teamCount = parseInt(teamRes.rows[0]?.cnt || '0', 10);

    if (empCount > 0 || teamCount > 0) {
      return {
        success: false,
        error: `Cannot delete department: ${teamCount} active team(s) and ${empCount} employee(s) are still assigned. Please reassign or archive them first.`
      };
    }

    // Safe delete
    await query('DELETE FROM departments WHERE id = $1', [id]);
    return { success: true };
  }

  private mapRowToRecord(r: any): DepartmentRecord {
    const isArchived = Boolean(r.is_archived);
    return {
      id: r.id,
      name: r.name,
      description: r.description || '',
      organization_id: r.organization_id || null,
      head_id: r.head_id || null,
      head_name: r.head_name || null,
      head_email: r.head_email || null,
      is_archived: isArchived,
      employee_count: parseInt(r.employee_count || '0', 10),
      active_team_count: parseInt(r.active_team_count || '0', 10),
      active_review_count: parseInt(r.active_review_count || '0', 10),
      status: isArchived ? 'ARCHIVED' : 'ACTIVE',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null
    };
  }
}

export const departmentsRepository = new DepartmentsRepository();
