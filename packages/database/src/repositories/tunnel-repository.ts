import { getDatabase } from '../client';
import { Tunnel } from '../types';

export class TunnelRepository {
  async create(
    userId: string,
    subdomain: string,
    localPort: number,
    tokenId?: string
  ): Promise<Tunnel> {
    const db = getDatabase();
    const result = await db.query<Tunnel>(
      `INSERT INTO tunnels (user_id, token_id, subdomain, local_port, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [userId, tokenId, subdomain, localPort]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Tunnel | null> {
    const db = getDatabase();
    const result = await db.query<Tunnel>(
      'SELECT * FROM tunnels WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findBySubdomain(subdomain: string): Promise<Tunnel | null> {
    const db = getDatabase();
    const result = await db.query<Tunnel>(
      'SELECT * FROM tunnels WHERE subdomain = $1 AND status = $2',
      [subdomain, 'active']
    );
    return result.rows[0] || null;
  }

  async listByUser(
    userId: string,
    status?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Tunnel[]> {
    const db = getDatabase();
    let query = 'SELECT * FROM tunnels WHERE user_id = $1';
    const params: any[] = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY connected_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query<Tunnel>(query, params);
    return result.rows;
  }

  async listActive(): Promise<Tunnel[]> {
    const db = getDatabase();
    const result = await db.query<Tunnel>(
      'SELECT * FROM tunnels WHERE status = $1 ORDER BY connected_at DESC',
      ['active']
    );
    return result.rows;
  }

  async updateStatus(tunnelId: string, status: 'active' | 'disconnected' | 'stopped'): Promise<void> {
    const db = getDatabase();
    const updates: string[] = ['status = $1'];
    const params: any[] = [status];

    if (status === 'disconnected' || status === 'stopped') {
      updates.push('disconnected_at = CURRENT_TIMESTAMP');
    }

    params.push(tunnelId);

    await db.query(
      `UPDATE tunnels SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );
  }

  async incrementStats(
    tunnelId: string,
    requestCount: number,
    bytesTransferred: number
  ): Promise<void> {
    const db = getDatabase();
    await db.query(
      `UPDATE tunnels 
       SET request_count = request_count + $1, 
           bytes_transferred = bytes_transferred + $2
       WHERE id = $3`,
      [requestCount, bytesTransferred]
    );
  }

  async getStats(userId: string): Promise<{
    total_tunnels: number;
    active_tunnels: number;
    total_requests: number;
    total_bytes: number;
  }> {
    const db = getDatabase();
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_tunnels,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tunnels,
        COALESCE(SUM(request_count), 0) as total_requests,
        COALESCE(SUM(bytes_transferred), 0) as total_bytes
       FROM tunnels
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }
}
