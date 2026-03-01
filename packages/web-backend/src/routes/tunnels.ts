import { Router } from 'express';
import { TunnelRepository } from '@ducky/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const tunnelRepo = new TunnelRepository();

// List user's tunnels
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const tunnels = await tunnelRepo.listByUser(
      req.user!.id,
      status as string | undefined
    );

    res.json({
      tunnels: tunnels.map(t => ({
        id: t.id,
        subdomain: t.subdomain,
        localPort: t.local_port,
        status: t.status,
        connectedAt: t.connected_at,
        disconnectedAt: t.disconnected_at,
        requestCount: t.request_count,
        bytesTransferred: t.bytes_transferred,
      })),
    });
  } catch (error) {
    console.error('List tunnels error:', error);
    res.status(500).json({ error: 'Failed to list tunnels' });
  }
});

// Get tunnel stats
router.get('/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const stats = await tunnelRepo.getStats(req.user!.id);

    res.json({
      stats: {
        totalTunnels: parseInt(stats.total_tunnels as any),
        activeTunnels: parseInt(stats.active_tunnels as any),
        totalRequests: parseInt(stats.total_requests as any),
        totalBytes: parseInt(stats.total_bytes as any),
      },
    });
  } catch (error) {
    console.error('Get tunnel stats error:', error);
    res.status(500).json({ error: 'Failed to get tunnel stats' });
  }
});

// Get tunnel by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tunnel = await tunnelRepo.findById(req.params.id);

    if (!tunnel || tunnel.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Tunnel not found' });
    }

    res.json({
      tunnel: {
        id: tunnel.id,
        subdomain: tunnel.subdomain,
        localPort: tunnel.local_port,
        status: tunnel.status,
        connectedAt: tunnel.connected_at,
        disconnectedAt: tunnel.disconnected_at,
        requestCount: tunnel.request_count,
        bytesTransferred: tunnel.bytes_transferred,
      },
    });
  } catch (error) {
    console.error('Get tunnel error:', error);
    res.status(500).json({ error: 'Failed to get tunnel' });
  }
});

// Stop tunnel
router.post('/:id/stop', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tunnel = await tunnelRepo.findById(req.params.id);

    if (!tunnel || tunnel.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Tunnel not found' });
    }

    await tunnelRepo.updateStatus(req.params.id, 'stopped');

    res.json({ message: 'Tunnel stopped successfully' });
  } catch (error) {
    console.error('Stop tunnel error:', error);
    res.status(500).json({ error: 'Failed to stop tunnel' });
  }
});

export default router;
