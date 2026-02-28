import { getDatabase } from '../client';
import { AuthToken } from '../types';
import * as crypto from 'crypto';

export class TokenRepository {
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async create(userId: string, name: string): Promise<AuthToken> {
    const db = getDatabase();
    const token = this.generateToken();
    
    const result = await db.query<AuthToken>(
      `INSERT INTO auth_tokens (user_id, token, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, name]
    );
    
    return result.rows[0];
  }

  async findById(id: string): Promise<AuthToken | null> {
    const db = getDatabase();
    const result = await db.query<AuthToken>(
      'SELECT * FROM auth_tokens WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByToken(token: string): Promise<AuthToken | null> {
    const db = getDatabase();
    const result = await db.query<AuthToken>(
      'SELECT * FROM auth_tokens WHERE token = $1 AND is_active = true AND revoked_at IS NULL',
      [token]
    );
    
    if (result.rows[0]) {
      // Update last_used_at
      await db.query(
        'UPDATE auth_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].id]
      );
    }
    
    return result.rows[0] || null;
  }

  async listByUser(userId: string): Promise<AuthToken[]> {
    const db = getDatabase();
    const result = await db.query<AuthToken>(
      `SELECT * FROM auth_tokens 
       WHERE user_id = $1 AND revoked_at IS NULL 
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async revoke(tokenId: string): Promise<void> {
    const db = getDatabase();
    await db.query(
      'UPDATE auth_tokens SET revoked_at = CURRENT_TIMESTAMP, is_active = false WHERE id = $1',
      [tokenId]
    );
  }

  async revokeByToken(token: string): Promise<void> {
    const db = getDatabase();
    await db.query(
      'UPDATE auth_tokens SET revoked_at = CURRENT_TIMESTAMP, is_active = false WHERE token = $1',
      [token]
    );
  }

  async update(tokenId: string, name: string): Promise<AuthToken> {
    const db = getDatabase();
    const result = await db.query<AuthToken>(
      'UPDATE auth_tokens SET name = $1 WHERE id = $2 RETURNING *',
      [name, tokenId]
    );
    return result.rows[0];
  }
}
