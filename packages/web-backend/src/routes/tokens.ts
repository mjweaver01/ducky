import { Router } from 'express';
import { TokenRepository } from '@ngrok-clone/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const tokenRepo = new TokenRepository();

// List user's tokens
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tokens = await tokenRepo.listByUser(req.user!.id);
    res.json({
      tokens: tokens.map(t => ({
        id: t.id,
        name: t.name,
        token: t.token,
        createdAt: t.created_at,
        lastUsedAt: t.last_used_at,
        isActive: t.is_active,
      })),
    });
  } catch (error) {
    console.error('List tokens error:', error);
    res.status(500).json({ error: 'Failed to list tokens' });
  }
});

// Create new token
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Token name is required' });
    }

    const token = await tokenRepo.create(req.user!.id, name);

    res.status(201).json({
      token: {
        id: token.id,
        name: token.name,
        token: token.token,
        createdAt: token.created_at,
        isActive: token.is_active,
      },
    });
  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

// Update token
router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Token name is required' });
    }

    // Verify token belongs to user
    const existing = await tokenRepo.findById(id);
    if (!existing || existing.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const token = await tokenRepo.update(id, name);

    res.json({
      token: {
        id: token.id,
        name: token.name,
        token: token.token,
        createdAt: token.created_at,
        isActive: token.is_active,
      },
    });
  } catch (error) {
    console.error('Update token error:', error);
    res.status(500).json({ error: 'Failed to update token' });
  }
});

// Revoke token
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify token belongs to user
    const existing = await tokenRepo.findById(id);
    if (!existing || existing.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Token not found' });
    }

    await tokenRepo.revoke(id);

    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    console.error('Revoke token error:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

export default router;
