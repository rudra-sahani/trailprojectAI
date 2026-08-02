import { query } from './pg-client.js';
import { AgentRunRecord } from '../../shared/types/audit.js';

export class AgentRunsRepository {
  async findByReviewCycleId(reviewCycleId: string): Promise<AgentRunRecord[]> {
    const res = await query('SELECT * FROM agent_runs WHERE review_cycle_id = $1 ORDER BY started_at ASC', [reviewCycleId]);
    return res.rows.map(r => this.mapRowToAgentRun(r));
  }

  async findAll(): Promise<AgentRunRecord[]> {
    const res = await query('SELECT * FROM agent_runs ORDER BY started_at DESC');
    return res.rows.map(r => this.mapRowToAgentRun(r));
  }

  async create(record: AgentRunRecord, client?: any): Promise<AgentRunRecord> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO agent_runs (id, pipeline_run_id, review_cycle_id, agent_name, started_at, completed_at, duration_ms, status, input_ref, output_ref, retry_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [
        record.id,
        record.pipeline_run_id || null,
        record.review_cycle_id || null,
        record.agent_name,
        record.started_at ? new Date(record.started_at) : new Date(),
        record.ended_at ? new Date(record.ended_at) : null,
        record.duration_ms || null,
        record.status || 'RUNNING',
        record.input_ref || null,
        record.output_ref || null,
        record.retry_count || 0
      ]
    );
    return this.mapRowToAgentRun(res.rows[0]);
  }

  private mapRowToAgentRun(row: any): AgentRunRecord {
    return {
      id: row.id,
      agent_name: row.agent_name as any,
      review_cycle_id: row.review_cycle_id,
      pipeline_run_id: row.pipeline_run_id,
      input_ref: row.input_ref,
      output_ref: row.output_ref,
      status: row.status,
      started_at: row.started_at ? new Date(row.started_at).toISOString() : new Date().toISOString(),
      ended_at: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
      duration_ms: row.duration_ms,
      retry_count: row.retry_count || 0
    };
  }
}

export const agentRunsRepository = new AgentRunsRepository();
