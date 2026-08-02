import { query } from './pg-client.js';
import { DbRawFeedback } from './db.js';

export class FeedbackRepository {
  async findByReviewId(reviewId: string): Promise<DbRawFeedback[]> {
    const res = await query(
      'SELECT * FROM raw_feedback WHERE review_id = $1 ORDER BY submitted_at ASC',
      [reviewId]
    );
    return res.rows.map(r => this.mapRowToFeedback(r));
  }

  async findById(id: string): Promise<DbRawFeedback | null> {
    const res = await query('SELECT * FROM raw_feedback WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToFeedback(res.rows[0]);
  }

  async findAll(): Promise<DbRawFeedback[]> {
    const res = await query('SELECT * FROM raw_feedback ORDER BY submitted_at ASC');
    return res.rows.map(r => this.mapRowToFeedback(r));
  }

  async create(fb: DbRawFeedback, client?: any): Promise<DbRawFeedback> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO raw_feedback (id, review_id, submitted_by, source_type, title, content, submitted_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        fb.id,
        fb.review_id,
        fb.submitted_by || null,
        fb.source_type,
        fb.title || null,
        fb.content,
        fb.submitted_at || new Date().toISOString(),
        fb.created_at || new Date().toISOString()
      ]
    );
    return this.mapRowToFeedback(res.rows[0]);
  }

  private mapRowToFeedback(row: any): DbRawFeedback {
    return {
      id: row.id,
      review_id: row.review_id,
      submitted_by: row.submitted_by,
      source_type: row.source_type,
      title: row.title,
      content: row.content,
      submitted_at: row.submitted_at ? new Date(row.submitted_at).toISOString() : new Date().toISOString(),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }
}

export const feedbackRepository = new FeedbackRepository();
