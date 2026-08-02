import { query } from './pg-client.js';
import { DbReviewCycle } from './db.js';

export class ReviewsRepository {
  async findById(id: string): Promise<DbReviewCycle | null> {
    const res = await query('SELECT * FROM review_cycles WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToReviewCycle(res.rows[0]);
  }

  async findByEmployee(employeeId: string): Promise<DbReviewCycle[]> {
    const res = await query('SELECT * FROM review_cycles WHERE employee_id = $1 ORDER BY created_at DESC', [employeeId]);
    return res.rows.map(r => this.mapRowToReviewCycle(r));
  }

  async findByManager(managerId: string): Promise<DbReviewCycle[]> {
    const res = await query('SELECT * FROM review_cycles WHERE manager_id = $1 ORDER BY created_at DESC', [managerId]);
    return res.rows.map(r => this.mapRowToReviewCycle(r));
  }

  async findByEmployeeAndPeriod(employeeId: string, period: string): Promise<DbReviewCycle | null> {
    const res = await query(
      'SELECT * FROM review_cycles WHERE employee_id = $1 AND review_period = $2',
      [employeeId, period]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToReviewCycle(res.rows[0]);
  }

  async findAll(): Promise<DbReviewCycle[]> {
    const res = await query('SELECT * FROM review_cycles ORDER BY created_at DESC');
    return res.rows.map(r => this.mapRowToReviewCycle(r));
  }

  async create(cycle: DbReviewCycle, client?: any): Promise<DbReviewCycle> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO review_cycles (id, employee_id, manager_id, review_period, status, started_at, finalized_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        cycle.id,
        cycle.employee_id,
        cycle.manager_id,
        cycle.review_period,
        cycle.status || 'DRAFT',
        cycle.started_at || null,
        cycle.finalized_at || null,
        cycle.created_at || new Date().toISOString(),
        cycle.updated_at || new Date().toISOString()
      ]
    );
    return this.mapRowToReviewCycle(res.rows[0]);
  }

  async updateStatus(id: string, status: string, pipelineStage?: string, client?: any): Promise<DbReviewCycle | null> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `UPDATE review_cycles
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    if (res.rows.length === 0) return null;
    const mapped = this.mapRowToReviewCycle(res.rows[0]);
    if (pipelineStage) mapped.pipeline_stage = pipelineStage;
    return mapped;
  }

  async finalize(id: string, finalizedBy: string, client?: any): Promise<DbReviewCycle | null> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `UPDATE review_cycles
       SET status = 'FINALIZED', finalized_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToReviewCycle(res.rows[0]);
  }

  private mapRowToReviewCycle(row: any): DbReviewCycle {
    return {
      id: row.id,
      employee_id: row.employee_id,
      manager_id: row.manager_id,
      review_period: row.review_period,
      status: row.status,
      pipeline_stage: row.status === 'HUMAN_REVIEW' ? 'SYNTHESIS' : (row.status === 'FINALIZED' ? 'GOVERNANCE' : 'COLLECTOR'),
      started_at: row.started_at ? new Date(row.started_at).toISOString() : null,
      finalized_at: row.finalized_at ? new Date(row.finalized_at).toISOString() : null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }
}

export const reviewsRepository = new ReviewsRepository();
