import { query } from './pg-client.js';
import { OrganizationRecord } from '../../shared/types/api-contracts.js';

export class OrganizationRepository {
  async findById(id: string): Promise<OrganizationRecord | null> {
    const res = await query('SELECT * FROM organizations WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToOrg(res.rows[0]);
  }

  async findByName(name: string): Promise<OrganizationRecord | null> {
    const res = await query('SELECT * FROM organizations WHERE LOWER(name) = LOWER($1)', [name]);
    if (res.rows.length === 0) return null;
    return this.mapRowToOrg(res.rows[0]);
  }

  async findByCode(orgCode: string): Promise<OrganizationRecord | null> {
    const res = await query('SELECT * FROM organizations WHERE UPPER(org_code) = UPPER($1)', [orgCode]);
    if (res.rows.length === 0) return null;
    return this.mapRowToOrg(res.rows[0]);
  }

  async create(org: Partial<OrganizationRecord>): Promise<OrganizationRecord> {
    const res = await query(
      `INSERT INTO organizations (
        id, name, logo_url, industry, company_size, website, timezone,
        default_review_cycle, language, review_frequency, org_code, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        org.id,
        org.name,
        org.logo_url || null,
        org.industry || null,
        org.company_size || null,
        org.website || null,
        org.timezone || 'UTC',
        org.default_review_cycle || 'Q2 2026',
        org.language || 'en',
        org.review_frequency || 'Quarterly',
        org.org_code,
        org.created_at || new Date().toISOString(),
        org.updated_at || new Date().toISOString()
      ]
    );
    return this.mapRowToOrg(res.rows[0]);
  }

  async update(id: string, updates: Partial<OrganizationRecord>): Promise<OrganizationRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (key === 'id') continue;
      fields.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = $${idx}`);
    values.push(new Date().toISOString());
    idx++;

    values.push(id);
    const sql = `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    return this.mapRowToOrg(res.rows[0]);
  }

  private mapRowToOrg(row: any): OrganizationRecord {
    return {
      id: row.id,
      name: row.name,
      logo_url: row.logo_url,
      industry: row.industry,
      company_size: row.company_size,
      website: row.website,
      timezone: row.timezone || 'UTC',
      default_review_cycle: row.default_review_cycle || 'Q2 2026',
      language: row.language || 'en',
      review_frequency: row.review_frequency || 'Quarterly',
      org_code: row.org_code,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }
}

export const organizationRepository = new OrganizationRepository();
