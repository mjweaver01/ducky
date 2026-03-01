import { getDatabase } from '../client';
import { User } from '../types';
import bcrypt from 'bcrypt';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const db = getDatabase();
    const result = await db.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = getDatabase();
    const result = await db.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async create(email: string, password: string, fullName?: string): Promise<User> {
    const db = getDatabase();
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await db.query<User>(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, passwordHash, fullName]
    );
    
    return result.rows[0];
  }

  async updateLastLogin(userId: string): Promise<void> {
    const db = getDatabase();
    await db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password_hash);
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const db = getDatabase();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
  }

  async update(userId: string, updates: Partial<Pick<User, 'full_name' | 'email' | 'plan' | 'plan_expires_at' | 'stripe_customer_id' | 'stripe_subscription_id'>>): Promise<User> {
    const db = getDatabase();
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.full_name !== undefined) {
      setClauses.push(`full_name = $${paramIndex++}`);
      values.push(updates.full_name);
    }

    if (updates.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }

    if (updates.plan !== undefined) {
      setClauses.push(`plan = $${paramIndex++}`);
      values.push(updates.plan);
    }

    if (updates.plan_expires_at !== undefined) {
      setClauses.push(`plan_expires_at = $${paramIndex++}`);
      values.push(updates.plan_expires_at);
    }

    if (updates.stripe_customer_id !== undefined) {
      setClauses.push(`stripe_customer_id = $${paramIndex++}`);
      values.push(updates.stripe_customer_id);
    }

    if (updates.stripe_subscription_id !== undefined) {
      setClauses.push(`stripe_subscription_id = $${paramIndex++}`);
      values.push(updates.stripe_subscription_id);
    }

    values.push(userId);

    const result = await db.query<User>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async deactivate(userId: string): Promise<void> {
    const db = getDatabase();
    await db.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [userId]
    );
  }

  async list(limit: number = 100, offset: number = 0): Promise<User[]> {
    const db = getDatabase();
    const result = await db.query<User>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }
}
