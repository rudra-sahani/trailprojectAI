import { query } from './pg-client.js';
import { DbOperationsQueue } from './db.js';

export class OperationsQueueRepository {
  async findAll(): Promise<DbOperationsQueue[]> {
    const res = await query('SELECT * FROM operations_queue ORDER BY created_at DESC');
    return res.rows.map(r => this.mapRowToOp(r));
  }

  async findById(id: string): Promise<DbOperationsQueue | null> {
    const res = await query('SELECT * FROM operations_queue WHERE id = $1 OR review_id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToOp(res.rows[0]);
  }

  async create(op: DbOperationsQueue, client?: any): Promise<DbOperationsQueue> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO operations_queue (id, review_id, pipeline_run_id, failed_stage, failure_reason, retry_count, assigned_to, status, created_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
       RETURNING *`,
      [
        op.id,
        op.review_id,
        op.pipeline_run_id || null,
        op.failed_stage,
        op.failure_reason,
        op.retry_count || 0,
        op.assigned_to || null,
        op.status || 'OPEN',
        op.resolved_at ? new Date(op.resolved_at) : null
      ]
    );
    return this.mapRowToOp(res.rows[0]);
  }

  async updateStatus(id: string, status: string, retryCount?: number, client?: any): Promise<DbOperationsQueue | null> {
    const exec = client ? client.query.bind(client) : query;
    const isResolved = status === 'RESOLVED';
    const res = await exec(
      `UPDATE operations_queue
       SET status = $1,
           retry_count = COALESCE($2, retry_count),
           resolved_at = CASE WHEN $3 = true THEN NOW() ELSE resolved_at END
       WHERE id = $4 OR review_id = $4
       RETURNING *`,
      [status, retryCount !== undefined ? retryCount : null, isResolved, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToOp(res.rows[0]);
  }

  private mapRowToOp(row: any): DbOperationsQueue {
    return {
      id: row.id,
      review_id: row.review_id,
      pipeline_run_id: row.pipeline_run_id,
      failed_stage: row.failed_stage,
      failure_reason: row.failure_reason,
      retry_count: row.retry_count || 0,
      assigned_to: row.assigned_to,
      status: row.status,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      resolved_at: row.resolved_at ? new Date(row.resolved_at).toISOString() : null
    };
  }
}

export const operationsQueueRepository = new OperationsQueueRepository();
