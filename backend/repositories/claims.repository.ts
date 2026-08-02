import { query } from './pg-client.js';
import { ClaimCandidate } from '../../shared/types/claims.js';

export class ClaimsRepository {
  async findByReviewId(reviewId: string): Promise<ClaimCandidate[]> {
    const res = await query('SELECT * FROM claim_candidates WHERE review_id = $1 ORDER BY created_at ASC', [reviewId]);
    return res.rows.map(r => this.mapRowToClaim(r));
  }

  async findBySubjectEmployeeId(subjectEmployeeId: string): Promise<ClaimCandidate[]> {
    const res = await query(
      `SELECT c.* FROM claim_candidates c
       JOIN review_cycles r ON c.review_id = r.id
       WHERE r.employee_id = $1
       ORDER BY c.created_at ASC`,
      [subjectEmployeeId]
    );
    return res.rows.map(r => this.mapRowToClaim(r));
  }

  async findById(claimId: string): Promise<ClaimCandidate | null> {
    const res = await query('SELECT * FROM claim_candidates WHERE id = $1', [claimId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToClaim(res.rows[0]);
  }

  async findAll(): Promise<ClaimCandidate[]> {
    const res = await query('SELECT * FROM claim_candidates ORDER BY created_at ASC');
    return res.rows.map(r => this.mapRowToClaim(r));
  }

  async create(claim: ClaimCandidate, reviewId?: string, client?: any): Promise<ClaimCandidate> {
    const exec = client ? client.query.bind(client) : query;
    const evidenceIdsJson = JSON.stringify(claim.evidence_ids || []);
    const roleDiversityJson = JSON.stringify(claim.role_diversity || { self: 0, peer: 0, manager: 0 });

    const targetReviewId = reviewId || claim.review_id || 'r1000000-0000-0000-0000-000000000001';

    const res = await exec(
      `INSERT INTO claim_candidates (id, review_id, claim_text, theme, evidence_ids, source_count, role_diversity, coverage_confidence, status, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, NOW())
       RETURNING *`,
      [
        claim.claim_id,
        targetReviewId,
        claim.summary || claim.theme || 'Performance Theme',
        claim.theme,
        evidenceIdsJson,
        claim.source_count || 0,
        roleDiversityJson,
        claim.coverage_confidence !== undefined ? claim.coverage_confidence : 0.8,
        claim.status || 'SUFFICIENT'
      ]
    );
    return this.mapRowToClaim(res.rows[0]);
  }

  private mapRowToClaim(row: any): ClaimCandidate {
    let evidence_ids: string[] = [];
    if (typeof row.evidence_ids === 'string') {
      try { evidence_ids = JSON.parse(row.evidence_ids); } catch (e) { evidence_ids = []; }
    } else if (Array.isArray(row.evidence_ids)) {
      evidence_ids = row.evidence_ids;
    }

    let role_diversity = { self: 0, peer: 0, manager: 0 };
    if (typeof row.role_diversity === 'string') {
      try { role_diversity = JSON.parse(row.role_diversity); } catch (e) {}
    } else if (row.role_diversity) {
      role_diversity = row.role_diversity;
    }

    return {
      schema_version: '1.0',
      claim_id: row.id,
      review_id: row.review_id,
      subject_employee_id: row.subject_employee_id || row.employee_id || '10000000-0000-4000-a000-000000000003',
      theme: row.theme,
      summary: row.claim_text,
      evidence_ids,
      source_count: row.source_count,
      role_diversity,
      coverage_confidence: parseFloat(row.coverage_confidence),
      status: row.status
    };
  }
}

export const claimsRepository = new ClaimsRepository();
