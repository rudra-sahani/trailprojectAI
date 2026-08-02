import { query } from './pg-client.js';

export interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata?: any;
  created_at: string;
}

export class NotificationsRepository {
  async findByUserId(userId: string): Promise<DbNotification[]> {
    const res = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      is_read: r.is_read,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      created_at: new Date(r.created_at).toISOString()
    }));
  }

  async create(notification: DbNotification, client?: any): Promise<DbNotification> {
    const exec = client ? client.query.bind(client) : query;
    const metaJson = JSON.stringify(notification.metadata || {});
    const res = await exec(
      `INSERT INTO notifications (id, user_id, type, title, message, is_read, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
       RETURNING *`,
      [
        notification.id,
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.is_read || false,
        metaJson
      ]
    );
    return {
      id: res.rows[0].id,
      user_id: res.rows[0].user_id,
      type: res.rows[0].type,
      title: res.rows[0].title,
      message: res.rows[0].message,
      is_read: res.rows[0].is_read,
      metadata: typeof res.rows[0].metadata === 'string' ? JSON.parse(res.rows[0].metadata) : res.rows[0].metadata,
      created_at: new Date(res.rows[0].created_at).toISOString()
    };
  }

  async markAsRead(id: string, client?: any): Promise<void> {
    const exec = client ? client.query.bind(client) : query;
    await exec('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
  }
}

export const notificationsRepository = new NotificationsRepository();
