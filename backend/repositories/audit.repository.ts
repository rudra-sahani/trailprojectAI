import { validate as uuidValidate } from 'uuid';
import { query } from './pg-client.js';
import { AuditLogEntry } from '../../shared/types/audit.js';

const SYSTEM_ACTOR_UUID = '00000000-0000-4000-a000-000000000000';

export class AuditRepository {
  async findByReviewId(reviewId?: string): Promise<AuditLogEntry[]> {
    if (reviewId) {
      const res = await query(
        'SELECT * FROM audit_log WHERE review_id = $1 ORDER BY created_at DESC',
        [reviewId]
      );
      return res.rows.map(r => this.mapRowToAudit(r));
    }
    const res = await query('SELECT * FROM audit_log ORDER BY created_at DESC');
    return res.rows.map(r => this.mapRowToAudit(r));
  }

  async addEntry(entry: AuditLogEntry, client?: any): Promise<AuditLogEntry> {
    const exec = client ? client.query.bind(client) : query;
    const rawActorId = entry.actor?.actor_id || entry.actor_id || null;
    const actorId = rawActorId && uuidValidate(rawActorId) ? rawActorId : SYSTEM_ACTOR_UUID;
    const actorType = entry.actor?.actor_type || entry.actor_type || 'human';
    
    const baseDetails = entry.details || entry.metadata || {};
    const metadata = JSON.stringify({
      ...baseDetails,
      original_actor_id: rawActorId
    });
    const oldVal = entry.before_state ? JSON.stringify(entry.before_state) : null;
    const newVal = entry.after_state ? JSON.stringify(entry.after_state) : null;

    const reviewId = entry.review_cycle_id || null;

    const res = await exec(
      `INSERT INTO audit_log (id, review_id, claim_id, actor_id, actor_type, event_type, old_value, new_value, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, NOW())
       RETURNING *`,
      [
        entry.log_id || entry.id,
        reviewId,
        entry.claim_id || null,
        actorId,
        actorType,
        entry.event_type,
        oldVal,
        newVal,
        metadata
      ]
    );
    return this.mapRowToAudit(res.rows[0]);
  }

  private mapRowToAudit(row: any): AuditLogEntry {
    let details = {};
    if (typeof row.metadata === 'string') {
      try { details = JSON.parse(row.metadata); } catch (e) { details = {}; }
    } else if (row.metadata) {
      details = row.metadata;
    }

    let before_state = null;
    if (typeof row.old_value === 'string') {
      try { before_state = JSON.parse(row.old_value); } catch (e) {}
    } else if (row.old_value) {
      before_state = row.old_value;
    }

    let after_state = null;
    if (typeof row.new_value === 'string') {
      try { after_state = JSON.parse(row.new_value); } catch (e) {}
    } else if (row.new_value) {
      after_state = row.new_value;
    }

    return {
      schema_version: '1.0',
      log_id: row.id,
      id: row.id,
      review_cycle_id: row.review_id,
      report_id: row.review_id || '',
      claim_id: row.claim_id || null,
      event_type: row.event_type as any,
      actor: {
        actor_type: row.actor_type as any,
        actor_id: row.actor_id || 'system'
      },
      actor_id: row.actor_id,
      actor_type: row.actor_type,
      timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      before_state,
      after_state,
      details,
      metadata: details
    };
  }
}

export const auditRepository = new AuditRepository();
