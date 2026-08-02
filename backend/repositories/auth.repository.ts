import { query } from './pg-client.js';
import { UserCredential, EmailVerificationRecord, RefreshTokenRecord, LoginAttemptRecord } from './db.js';

export class AuthRepository {
  // User Credentials
  async findCredentialByUserId(userId: string): Promise<UserCredential | null> {
    const res = await query('SELECT * FROM user_credentials WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) return null;
    return this.mapCredentialRow(res.rows[0]);
  }

  async findCredentialByEmail(email: string): Promise<UserCredential | null> {
    const res = await query('SELECT * FROM user_credentials WHERE LOWER(email) = LOWER($1)', [email]);
    if (res.rows.length === 0) return null;
    return this.mapCredentialRow(res.rows[0]);
  }

  async createCredential(cred: UserCredential, client?: any): Promise<UserCredential> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO user_credentials (user_id, email, password_hash, salt, is_email_verified, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         salt = EXCLUDED.salt,
         is_email_verified = EXCLUDED.is_email_verified,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [cred.userId, cred.email.toLowerCase(), cred.passwordHash, cred.salt, cred.isEmailVerified, new Date().toISOString()]
    );
    return this.mapCredentialRow(res.rows[0]);
  }

  async updateCredentialVerification(userId: string, isVerified: boolean, client?: any): Promise<void> {
    const exec = client ? client.query.bind(client) : query;
    await exec(
      'UPDATE user_credentials SET is_email_verified = $1, updated_at = $2 WHERE user_id = $3',
      [isVerified, new Date().toISOString(), userId]
    );
  }

  async updatePassword(userId: string, passwordHash: string, salt: string, client?: any): Promise<void> {
    const exec = client ? client.query.bind(client) : query;
    await exec(
      'UPDATE user_credentials SET password_hash = $1, salt = $2, updated_at = $3 WHERE user_id = $4',
      [passwordHash, salt, new Date().toISOString(), userId]
    );
  }

  // Email Verifications
  async createEmailVerification(record: EmailVerificationRecord, client?: any): Promise<EmailVerificationRecord> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO email_verifications (id, user_id, email, code, type, expires_at, used_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [record.id, record.userId, record.email.toLowerCase(), record.code, record.type, record.expiresAt, record.usedAt || null, record.createdAt]
    );
    return this.mapVerificationRow(res.rows[0]);
  }

  async findValidVerification(email: string, code: string, type: string): Promise<EmailVerificationRecord | null> {
    const res = await query(
      `SELECT * FROM email_verifications
       WHERE LOWER(email) = LOWER($1) AND code = $2 AND type = $3 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code, type]
    );
    if (res.rows.length === 0) return null;
    return this.mapVerificationRow(res.rows[0]);
  }

  async markVerificationUsed(id: string, client?: any): Promise<void> {
    const exec = client ? client.query.bind(client) : query;
    await exec('UPDATE email_verifications SET used_at = NOW() WHERE id = $1', [id]);
  }

  // Refresh Tokens
  async createRefreshToken(record: RefreshTokenRecord, client?: any): Promise<RefreshTokenRecord> {
    const exec = client ? client.query.bind(client) : query;
    const res = await exec(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [record.id, record.userId, record.token, record.expiresAt, record.revoked, record.createdAt]
    );
    return this.mapRefreshTokenRow(res.rows[0]);
  }

  async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    const res = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW()',
      [token]
    );
    if (res.rows.length === 0) return null;
    return this.mapRefreshTokenRow(res.rows[0]);
  }

  async revokeRefreshToken(token: string, client?: any): Promise<void> {
    const exec = client ? client.query.bind(client) : query;
    await exec('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [token]);
  }

  async revokeAllUserRefreshTokens(userId: string, client?: any): Promise<void> {
    const exec = client ? client.query.bind(client) : query;
    await exec('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
  }

  // Revoked Access Tokens (JTI / Token Blacklist)
  async revokeAccessToken(jti: string, expiresAt: string, client?: any): Promise<void> {
    const exec = client ? client.query.bind(client) : query;
    await exec(
      `INSERT INTO revoked_access_tokens (id, token_jti, revoked_at, expires_at)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (token_jti) DO NOTHING`,
      [`rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, jti, expiresAt]
    );
  }

  async isAccessTokenRevoked(jti: string): Promise<boolean> {
    const res = await query('SELECT 1 FROM revoked_access_tokens WHERE token_jti = $1', [jti]);
    return res.rows.length > 0;
  }

  // Login Attempts (Brute Force Protection)
  async getLoginAttempt(email: string): Promise<LoginAttemptRecord | null> {
    const res = await query('SELECT * FROM login_attempts WHERE LOWER(email) = LOWER($1)', [email]);
    if (res.rows.length === 0) return null;
    return {
      email: res.rows[0].email,
      failedCount: res.rows[0].failed_count,
      lockedUntil: res.rows[0].locked_until ? new Date(res.rows[0].locked_until).toISOString() : null
    };
  }

  async recordFailedLogin(email: string, failedCount: number, lockedUntil?: string | null): Promise<void> {
    await query(
      `INSERT INTO login_attempts (email, failed_count, locked_until, updated_at)
       VALUES (LOWER($1), $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE SET
         failed_count = EXCLUDED.failed_count,
         locked_until = EXCLUDED.locked_until,
         updated_at = NOW()`,
      [email, failedCount, lockedUntil || null]
    );
  }

  async resetLoginAttempts(email: string): Promise<void> {
    await query('DELETE FROM login_attempts WHERE LOWER(email) = LOWER($1)', [email]);
  }

  private mapCredentialRow(row: any): UserCredential {
    return {
      userId: row.user_id,
      email: row.email,
      passwordHash: row.password_hash,
      salt: row.salt,
      isEmailVerified: row.is_email_verified,
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  private mapVerificationRow(row: any): EmailVerificationRecord {
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      code: row.code,
      type: row.type,
      expiresAt: new Date(row.expires_at).toISOString(),
      usedAt: row.used_at ? new Date(row.used_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString()
    };
  }

  private mapRefreshTokenRow(row: any): RefreshTokenRecord {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: new Date(row.expires_at).toISOString(),
      revoked: row.revoked,
      createdAt: new Date(row.created_at).toISOString()
    };
  }
}

export const authRepository = new AuthRepository();
