import { query } from './pg-client.js';
import { EvidenceNode } from '../../shared/types/evidence.js';

export class EvidenceRepository {
  async findByReviewId(reviewId: string): Promise<EvidenceNode[]> {
    const res = await query(
      'SELECT * FROM evidence_nodes WHERE review_id = $1 ORDER BY created_at ASC',
      [reviewId]
    );
    return res.rows.map(r => this.mapRowToEvidence(r));
  }

  async findBySubjectEmployeeId(subjectEmployeeId: string): Promise<EvidenceNode[]> {
    const res = await query(
      `SELECT e.* FROM evidence_nodes e
       JOIN review_cycles r ON e.review_id = r.id
       WHERE r.employee_id = $1 OR e.author_id = $1
       ORDER BY e.created_at ASC`,
      [subjectEmployeeId]
    );
    return res.rows.map(r => this.mapRowToEvidence(r));
  }

  async findById(evidenceId: string): Promise<EvidenceNode | null> {
    const res = await query('SELECT * FROM evidence_nodes WHERE id = $1', [evidenceId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToEvidence(res.rows[0]);
  }

  async findAll(): Promise<EvidenceNode[]> {
    const res = await query('SELECT * FROM evidence_nodes ORDER BY created_at ASC');
    return res.rows.map(r => this.mapRowToEvidence(r));
  }

  async create(node: EvidenceNode, reviewId?: string, client?: any): Promise<EvidenceNode> {
    const exec = client ? client.query.bind(client) : query;
    const tagsJson = JSON.stringify(node.tags || []);
    const metaJson = JSON.stringify(node.metadata || {});

    const targetReviewId = reviewId || node.review_id || 'r1000000-0000-0000-0000-000000000001';

    const res = await exec(
      `INSERT INTO evidence_nodes (id, review_id, raw_feedback_id, source_type, author_role, author_id, title, normalized_text, tags, confidence, status, rejection_reason, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::jsonb, $14)
       RETURNING *`,
      [
        node.evidence_id,
        targetReviewId,
        node.raw_feedback_id || null,
        node.source_type ? node.source_type.toUpperCase() : 'SELF_ASSESSMENT',
        node.author_role,
        node.author_id || null,
        node.title || null,
        node.text_unit.slice(0, 1999),
        tagsJson,
        node.confidence || 1.0,
        node.status || 'ACCEPTED',
        node.rejection_reason || null,
        metaJson,
        node.submitted_at || new Date().toISOString()
      ]
    );
    return this.mapRowToEvidence(res.rows[0]);
  }

  async updateStatus(evidenceId: string, status: string, rejectionReason?: string, client?: any): Promise<EvidenceNode | null> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      'UPDATE evidence_nodes SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *',
      [status, rejectionReason || null, evidenceId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToEvidence(res.rows[0]);
  }

  private mapRowToEvidence(row: any): EvidenceNode {
    let tags: string[] = [];
    if (typeof row.tags === 'string') {
      try { tags = JSON.parse(row.tags); } catch (e) { tags = []; }
    } else if (Array.isArray(row.tags)) {
      tags = row.tags;
    }

    let metadata = {};
    if (typeof row.metadata === 'string') {
      try { metadata = JSON.parse(row.metadata); } catch (e) { metadata = {}; }
    } else if (row.metadata) {
      metadata = row.metadata;
    }

    return {
      schema_version: '1.0',
      evidence_id: row.id,
      review_id: row.review_id,
      raw_feedback_id: row.raw_feedback_id,
      subject_employee_id: row.subject_employee_id || '10000000-0000-4000-a000-000000000003',
      source_type: String(row.source_type).toLowerCase() as any,
      author_role: row.author_role,
      author_id: row.author_id,
      submitted_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      text_unit: row.normalized_text,
      tags,
      confidence: row.confidence ? parseFloat(row.confidence) : 1.0,
      status: row.status,
      rejection_reason: row.rejection_reason || null,
      metadata
    };
  }
}

export const evidenceRepository = new EvidenceRepository();
