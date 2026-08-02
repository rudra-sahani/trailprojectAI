import { query } from './pg-client.js';
import { InvitationRecord } from '../../shared/types/api-contracts.js';

export class InvitationRepository {
  async findById(id: string): Promise<InvitationRecord | null> {
    const res = await query('SELECT * FROM invitations WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToInvitation(res.rows[0]);
  }

  async findByCodeOrToken(codeOrToken: string): Promise<InvitationRecord | null> {
    const res = await query(
      'SELECT * FROM invitations WHERE UPPER(invitation_code) = UPPER($1) OR token = $1',
      [codeOrToken]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToInvitation(res.rows[0]);
  }

  async findByOrgId(organizationId: string): Promise<InvitationRecord[]> {
    const res = await query(
      'SELECT * FROM invitations WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );
    return res.rows.map(r => this.mapRowToInvitation(r));
  }

  async create(invitation: Partial<InvitationRecord>): Promise<InvitationRecord> {
    const res = await query(
      `INSERT INTO invitations (
        id, organization_id, email, role, department_id, team_id,
        invitation_code, token, status, invited_by, expires_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        invitation.id,
        invitation.organization_id,
        invitation.email,
        invitation.role || 'EMPLOYEE',
        invitation.department_id || null,
        invitation.team_id || null,
        invitation.invitation_code,
        invitation.token,
        invitation.status || 'PENDING',
        invitation.invited_by || null,
        invitation.expires_at,
        invitation.created_at || new Date().toISOString(),
        invitation.updated_at || new Date().toISOString()
      ]
    );
    return this.mapRowToInvitation(res.rows[0]);
  }

  async updateStatus(id: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'): Promise<InvitationRecord | null> {
    const res = await query(
      'UPDATE invitations SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [status, new Date().toISOString(), id]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToInvitation(res.rows[0]);
  }

  async extendExpiration(id: string, expiresAt: string): Promise<InvitationRecord | null> {
    const res = await query(
      'UPDATE invitations SET expires_at = $1, status = $2, updated_at = $3 WHERE id = $4 RETURNING *',
      [expiresAt, 'PENDING', new Date().toISOString(), id]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToInvitation(res.rows[0]);
  }

  private mapRowToInvitation(row: any): InvitationRecord {
    return {
      id: row.id,
      organization_id: row.organization_id,
      email: row.email,
      role: row.role,
      department_id: row.department_id,
      team_id: row.team_id,
      invitation_code: row.invitation_code,
      token: row.token,
      status: row.status,
      invited_by: row.invited_by,
      expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : new Date().toISOString(),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }
}

export const invitationRepository = new InvitationRepository();
