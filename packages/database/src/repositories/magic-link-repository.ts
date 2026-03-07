import { getDatabase } from '../client';
import { MagicLink } from '../types';
import * as crypto from 'crypto';

export class MagicLinkRepository {
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async create(email: string, anonymousToken?: string, purpose: 'login' | 'password_reset' = 'login'): Promise<MagicLink> {
    const db = getDatabase();
    const token = this.generateToken();
    
    const result = await db.query<MagicLink>(
      `INSERT INTO magic_links (email, token, anonymous_token, purpose, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes')
       RETURNING *`,
      [email, token, anonymousToken || null, purpose]
    );
    
    return result.rows[0];
  }

  async findByToken(token: string, purpose?: 'login' | 'password_reset'): Promise<MagicLink | null> {
    const db = getDatabase();
    const purposeCondition = purpose ? 'AND purpose = $2' : '';
    const params = purpose ? [token, purpose] : [token];
    
    const result = await db.query<MagicLink>(
      `SELECT * FROM magic_links 
       WHERE token = $1 
       AND expires_at > NOW() 
       AND used_at IS NULL
       ${purposeCondition}`,
      params
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
