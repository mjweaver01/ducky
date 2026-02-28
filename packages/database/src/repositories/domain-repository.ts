import { getDatabase } from '../client';
import { CustomDomain } from '../types';
import * as crypto from 'crypto';

export class DomainRepository {
  generateVerificationToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async create(userId: string, domain: string): Promise<CustomDomain> {
    const db = getDatabase();
    const verificationToken = this.generateVerificationToken();
    
    const result = await db.query<CustomDomain>(
      `INSERT INTO custom_domains (user_id, domain, verification_token)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, domain, verificationToken]
    );
    
    return result.rows[0];
  }

  async findById(id: string): Promise<CustomDomain | null> {
    const db = getDatabase();
    const result = await db.query<CustomDomain>(
      'SELECT * FROM custom_domains WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByDomain(domain: string): Promise<CustomDomain | null> {
    const db = getDatabase();
    const result = await db.query<CustomDomain>(
      'SELECT * FROM custom_domains WHERE domain = $1',
      [domain]
    );
    return result.rows[0] || null;
  }

  async listByUser(userId: string): Promise<CustomDomain[]> {
    const db = getDatabase();
    const result = await db.query<CustomDomain>(
      'SELECT * FROM custom_domains WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async verify(domainId: string): Promise<CustomDomain> {
    const db = getDatabase();
    const result = await db.query<CustomDomain>(
      `UPDATE custom_domains 
       SET is_verified = true, verified_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [domainId]
    );
    return result.rows[0];
  }

  async delete(domainId: string): Promise<void> {
    const db = getDatabase();
    await db.query(
      'DELETE FROM custom_domains WHERE id = $1',
      [domainId]
    );
  }

  async regenerateToken(domainId: string): Promise<CustomDomain> {
    const db = getDatabase();
    const newToken = this.generateVerificationToken();
    
    const result = await db.query<CustomDomain>(
      `UPDATE custom_domains 
       SET verification_token = $1, is_verified = false, verified_at = NULL 
       WHERE id = $2 
       RETURNING *`,
      [newToken, domainId]
    );
    
    return result.rows[0];
  }
}
