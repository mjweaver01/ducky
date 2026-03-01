import { getDatabase } from '../client';
import { MagicLink } from '../types';
import * as crypto from 'crypto';

export class MagicLinkRepository {
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async create(email: string, anonymousToken?: string): Promise<MagicLink> {
    const db = getDatabase();
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    const result = await db.query<MagicLink>(
      `INSERT INTO magic_links (email, token, anonymous_token, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, token, anonymousToken || null, expiresAt]
    );
    
    return result.rows[0];
  }

  async findByToken(token: string): Promise<MagicLink | null> {
    const db = getDatabase();
    const result = await db.query<MagicLink>(
      `SELECT * FROM magic_links 
       WHERE token = $1 
       AND expires_at > NOW() 
       AND used_at IS NULL`,
      [token]
    );
    return result.rows[0] || null;
  }

  async markUsed(id: string): Promise<void> {
    const db = getDatabase();
    await db.query(
      'UPDATE magic_links SET used_at = NOW() WHERE id = $1',
      [id]
    );
  }

  async deleteExpired(): Promise<void> {
    const db = getDatabase();
    await db.query('DELETE FROM magic_links WHERE expires_at < NOW()');
  }
}
