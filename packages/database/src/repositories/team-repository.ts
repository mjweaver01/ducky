import { getDatabase } from '../client';
import { Team, TeamMember, TeamInvitation } from '../types';
import * as crypto from 'crypto';

export class TeamRepository {
  generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async create(name: string, ownerId: string): Promise<Team> {
    const db = getDatabase();
    const result = await db.query<Team>(
      `INSERT INTO teams (name, owner_id)
       VALUES ($1, $2)
       RETURNING *`,
      [name, ownerId]
    );

    const team = result.rows[0];

    await db.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [team.id, ownerId]
    );

    return team;
  }

  async findById(id: string): Promise<Team | null> {
    const db = getDatabase();
    const result = await db.query<Team>(
      'SELECT * FROM teams WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByOwnerId(ownerId: string): Promise<Team | null> {
    const db = getDatabase();
    const result = await db.query<Team>(
      'SELECT * FROM teams WHERE owner_id = $1',
      [ownerId]
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<Team | null> {
    const db = getDatabase();
    const result = await db.query<Team>(
      `SELECT t.* FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async getMembers(teamId: string): Promise<Array<TeamMember & { email: string; full_name?: string }>> {
    const db = getDatabase();
    const result = await db.query<TeamMember & { email: string; full_name?: string }>(
      `SELECT tm.*, u.email, u.full_name
       FROM team_members tm
       INNER JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY 
         CASE tm.role
           WHEN 'owner' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'member' THEN 3
         END,
         tm.joined_at`,
      [teamId]
    );
    return result.rows;
  }

  async getMemberByUserId(teamId: string, userId: string): Promise<TeamMember | null> {
    const db = getDatabase();
    const result = await db.query<TeamMember>(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    return result.rows[0] || null;
  }

  async addMember(teamId: string, userId: string, role: 'admin' | 'member'): Promise<TeamMember> {
    const db = getDatabase();
    const result = await db.query<TeamMember>(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [teamId, userId, role]
    );
    return result.rows[0];
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    const db = getDatabase();
    await db.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
  }

  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member'): Promise<TeamMember> {
    const db = getDatabase();
    const result = await db.query<TeamMember>(
      `UPDATE team_members 
       SET role = $3
       WHERE team_id = $1 AND user_id = $2
       RETURNING *`,
      [teamId, userId, role]
    );
    return result.rows[0];
  }

  async delete(teamId: string): Promise<void> {
    const db = getDatabase();
    await db.query('DELETE FROM teams WHERE id = $1', [teamId]);
  }

  async createInvitation(
    teamId: string,
    email: string,
    role: 'admin' | 'member',
    invitedBy: string
  ): Promise<TeamInvitation> {
    const db = getDatabase();
    const token = this.generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const result = await db.query<TeamInvitation>(
      `INSERT INTO team_invitations (team_id, email, role, invited_by, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [teamId, email, role, invitedBy, token, expiresAt]
    );
    return result.rows[0];
  }

  async findInvitationByToken(token: string): Promise<TeamInvitation | null> {
    const db = getDatabase();
    const result = await db.query<TeamInvitation>(
      'SELECT * FROM team_invitations WHERE token = $1 AND accepted_at IS NULL',
      [token]
    );
    return result.rows[0] || null;
  }

  async acceptInvitation(token: string, userId: string): Promise<void> {
    const db = getDatabase();
    
    const invitation = await this.findInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invitation not found or already accepted');
    }

    if (new Date() > new Date(invitation.expires_at)) {
      throw new Error('Invitation has expired');
    }

    const existingMember = await this.getMemberByUserId(invitation.team_id, userId);
    if (existingMember) {
      throw new Error('User is already a member of this team');
    }

    await db.query('BEGIN');
    try {
      await db.query(
        'UPDATE team_invitations SET accepted_at = CURRENT_TIMESTAMP WHERE token = $1',
        [token]
      );

      await this.addMember(invitation.team_id, userId, invitation.role);

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async listPendingInvitations(teamId: string): Promise<TeamInvitation[]> {
    const db = getDatabase();
    const result = await db.query<TeamInvitation>(
      `SELECT * FROM team_invitations 
       WHERE team_id = $1 AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC`,
      [teamId]
    );
    return result.rows;
  }

  async revokeInvitation(id: string): Promise<void> {
    const db = getDatabase();
    await db.query('DELETE FROM team_invitations WHERE id = $1', [id]);
  }

  async getMemberCount(teamId: string): Promise<number> {
    const db = getDatabase();
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
      [teamId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}
