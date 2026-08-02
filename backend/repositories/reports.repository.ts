import { query } from './pg-client.js';
import { DraftReport, FinalReport } from '../../shared/types/reports.js';

export class ReportsRepository {
  async findByReviewId(reviewId: string): Promise<(DraftReport | FinalReport) | null> {
    const res = await query('SELECT * FROM reports WHERE review_id = $1', [reviewId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToReport(res.rows[0]);
  }

  async findById(reportId: string): Promise<(DraftReport | FinalReport) | null> {
    const res = await query('SELECT * FROM reports WHERE id = $1', [reportId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToReport(res.rows[0]);
  }

  async findAll(): Promise<(DraftReport | FinalReport)[]> {
    const res = await query('SELECT * FROM reports ORDER BY created_at DESC');
    return res.rows.map(r => this.mapRowToReport(r));
  }

  async saveOrUpdate(report: DraftReport | FinalReport, client?: any): Promise<DraftReport | FinalReport> {
    const exec = client ? client.query.bind(client) : query;
    const sectionsJson = JSON.stringify(report.sections || []);
    const reviewId = report.review_cycle_id || (report as any).review_id || 'r1000000-0000-0000-0000-000000000001';
    const status = report.status || 'DRAFT';
    const confidence = (report as any).overall_confidence || 0.8;
    const finalizedBy = (report as FinalReport).finalized_by || null;
    const finalizedAt = (report as FinalReport).finalized_at || null;

    const res = await exec(
      `INSERT INTO reports (id, review_id, subject_employee_id, status, overall_confidence, sections, prompt_version, finalized_by, finalized_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (review_id) DO UPDATE SET
         status = EXCLUDED.status,
         overall_confidence = EXCLUDED.overall_confidence,
         sections = EXCLUDED.sections,
         finalized_by = EXCLUDED.finalized_by,
         finalized_at = EXCLUDED.finalized_at,
         updated_at = NOW()
       RETURNING *`,
      [
        report.report_id,
        reviewId,
        report.subject_employee_id || 'u1000000-0000-0000-0000-000000000003',
        status,
        confidence,
        sectionsJson,
        (report as DraftReport).prompt_version || 'synthesis_v1',
        finalizedBy,
        finalizedAt
      ]
    );
    return this.mapRowToReport(res.rows[0]);
  }

  private mapRowToReport(row: any): DraftReport | FinalReport {
    let sections: any[] = [];
    if (typeof row.sections === 'string') {
      try { sections = JSON.parse(row.sections); } catch (e) { sections = []; }
    } else if (Array.isArray(row.sections)) {
      sections = row.sections;
    }

    if (row.status === 'FINALIZED') {
      return {
        schema_version: '1.0',
        report_id: row.id,
        review_cycle_id: row.review_id,
        review_id: row.review_id,
        subject_employee_id: row.subject_employee_id,
        status: 'FINALIZED',
        finalized_at: row.finalized_at ? new Date(row.finalized_at).toISOString() : new Date().toISOString(),
        finalized_by: row.finalized_by || 'u1000000-0000-0000-0000-000000000001',
        sections
      } as FinalReport;
    }

    return {
      schema_version: '1.0',
      report_id: row.id,
      review_cycle_id: row.review_id,
      review_id: row.review_id,
      subject_employee_id: row.subject_employee_id,
      generated_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      sections,
      overall_confidence: parseFloat(row.overall_confidence || '0.8'),
      prompt_version: row.prompt_version || 'synthesis_v1'
    } as DraftReport;
  }
}

export const reportsRepository = new ReportsRepository();
