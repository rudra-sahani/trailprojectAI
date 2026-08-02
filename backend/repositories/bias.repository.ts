import { query } from './pg-client.js';
import { BiasFlag } from '../../shared/types/bias.js';

export class BiasRepository {
  async findByReviewId(reviewId: string): Promise<BiasFlag[]> {
    const res = await query('SELECT * FROM bias_flags WHERE review_id = $1 ORDER BY created_at ASC', [reviewId]);
    return res.rows.map(r => this.mapRowToFlag(r));
  }

  async findByClaimId(claimId: string): Promise<BiasFlag[]> {
    const res = await query('SELECT * FROM bias_flags WHERE claim_id = $1 ORDER BY created_at ASC', [claimId]);
    return res.rows.map(r => this.mapRowToFlag(r));
  }

  async findAll(): Promise<BiasFlag[]> {
    const res = await query('SELECT * FROM bias_flags ORDER BY created_at ASC');
    return res.rows.map(r => this.mapRowToFlag(r));
  }

  async create(flag: BiasFlag, reviewId?: string, client?: any): Promise<BiasFlag> {
    const exec = client ? client.query.bind(client) : query;
    const evidenceRefsJson = JSON.stringify(flag.evidence_refs || []);

    const targetReviewId = reviewId || flag.review_id || 'r1000000-0000-0000-0000-000000000001';
    const biasType = flag.bias_type || flag.flag_type || 'source_imbalance';

    const res = await exec(
      `INSERT INTO bias_flags (id, review_id, claim_id, bias_type, severity, explanation, evidence_refs, detector_type, check_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW())
       RETURNING *`,
      [
        flag.flag_id,
        targetReviewId,
        flag.claim_id || null,
        biasType,
        flag.severity,
        flag.explanation,
        evidenceRefsJson,
        flag.detector_type || 'deterministic',
        'COMPLETED'
      ]
    );
    return this.mapRowToFlag(res.rows[0]);
  }

  private mapRowToFlag(row: any): BiasFlag {
    let evidence_refs: string[] = [];
    if (typeof row.evidence_refs === 'string') {
      try { evidence_refs = JSON.parse(row.evidence_refs); } catch (e) { evidence_refs = []; }
    } else if (Array.isArray(row.evidence_refs)) {
      evidence_refs = row.evidence_refs;
    }

    return {
      schema_version: '1.0',
      flag_id: row.id,
      review_id: row.review_id,
      claim_id: row.claim_id,
      bias_type: row.bias_type,
      flag_type: (row.bias_type || 'source_imbalance') as any,
      severity: row.severity,
      explanation: row.explanation,
      evidence_refs,
      detector_type: row.detector_type,
      check_status: row.check_status
    };
  }
}

export const biasRepository = new BiasRepository();
