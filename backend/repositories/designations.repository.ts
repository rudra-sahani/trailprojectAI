import { query } from './pg-client.js';
import { DesignationRecord } from '../../shared/types/api-contracts.js';
import { v4 as uuidv4 } from 'uuid';

export class DesignationsRepository {
  async findAll(filter?: {
    organizationId?: string;
    departmentId?: string;
    includeArchived?: boolean;
  }): Promise<DesignationRecord[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter?.organizationId) {
      conditions.push(`(des.organization_id = $${idx} OR des.organization_id IS NULL)`);
      values.push(filter.organizationId);
      idx++;
    }

    if (filter?.departmentId) {
      conditions.push(`des.department_id = $${idx}`);
      values.push(filter.departmentId);
      idx++;
    }

    if (!filter?.includeArchived) {
      conditions.push(`COALESCE(des.is_archived, FALSE) = FALSE`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT des.*,
             d.name as department_name,
             (SELECT COUNT(*) FROM users u WHERE u.designation_id = des.id AND COALESCE(u.is_archived, FALSE) = FALSE) as employee_count
      FROM designations des
      LEFT JOIN departments d ON des.department_id = d.id
      ${whereClause}
      ORDER BY des.seniority_level DESC, des.title ASC
    `;

    const res = await query(sql, values);
    return res.rows.map(row => this.mapRowToRecord(row));
  }

  async findById(id: string): Promise<DesignationRecord | null> {
    const sql = `
      SELECT des.*,
             d.name as department_name,
             (SELECT COUNT(*) FROM users u WHERE u.designation_id = des.id AND COALESCE(u.is_archived, FALSE) = FALSE) as employee_count
      FROM designations des
      LEFT JOIN departments d ON des.department_id = d.id
      WHERE des.id = $1
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToRecord(res.rows[0]);
  }

  async findByTitle(title: string, organizationId?: string): Promise<DesignationRecord | null> {
    const conditions = ['LOWER(des.title) = LOWER($1)'];
    const values: any[] = [title.trim()];

    if (organizationId) {
      conditions.push('(des.organization_id = $2 OR des.organization_id IS NULL)');
      values.push(organizationId);
    }

    const sql = `
      SELECT des.*,
             d.name as department_name,
             (SELECT COUNT(*) FROM users u WHERE u.designation_id = des.id AND COALESCE(u.is_archived, FALSE) = FALSE) as employee_count
      FROM designations des
      LEFT JOIN departments d ON des.department_id = d.id
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `;
    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    return this.mapRowToRecord(res.rows[0]);
  }

  async create(data: {
    id?: string;
    organization_id: string;
    title: string;
    description?: string;
    department_id?: string | null;
    seniority_level?: number;
    job_family?: string;
  }): Promise<DesignationRecord> {
    const id = data.id || uuidv4();
    const sql = `
      INSERT INTO designations (
        id, organization_id, title, description, department_id,
        seniority_level, job_family, is_archived, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, 'ACTIVE', now(), now())
      RETURNING *
    `;
    const res = await query(sql, [
      id,
      data.organization_id,
      data.title.trim(),
      data.description || null,
      data.department_id || null,
      data.seniority_level || 1,
      data.job_family || 'Engineering'
    ]);

    const created = await this.findById(res.rows[0].id);
    return created || this.mapRowToRecord(res.rows[0]);
  }

  async update(id: string, updates: Partial<DesignationRecord>): Promise<DesignationRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowed = ['title', 'description', 'department_id', 'seniority_level', 'job_family', 'is_archived', 'status'];
    for (const key of allowed) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push((updates as any)[key]);
        idx++;
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = $${idx}`);
    values.push(new Date().toISOString());
    idx++;

    values.push(id);
    const sql = `UPDATE designations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, values);
    if (res.rows.length === 0) return null;

    return this.findById(id);
  }

  async archive(id: string): Promise<DesignationRecord | null> {
    return this.update(id, { is_archived: true, status: 'ARCHIVED' });
  }

  async restore(id: string): Promise<DesignationRecord | null> {
    return this.update(id, { is_archived: false, status: 'ACTIVE' });
  }

  private mapRowToRecord(row: any): DesignationRecord {
    const isArchived = Boolean(row.is_archived);
    return {
      id: row.id,
      organization_id: row.organization_id,
      title: row.title,
      description: row.description || null,
      department_id: row.department_id || null,
      department_name: row.department_name || null,
      seniority_level: row.seniority_level !== undefined && row.seniority_level !== null ? Number(row.seniority_level) : 1,
      job_family: row.job_family || 'Engineering',
      is_archived: isArchived,
      status: row.status || (isArchived ? 'ARCHIVED' : 'ACTIVE'),
      employee_count: row.employee_count !== undefined ? parseInt(String(row.employee_count), 10) : 0,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
    };
  }
}

export const designationsRepository = new DesignationsRepository();
