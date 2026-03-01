import { Router } from 'express';
import { UserRepository } from '@ducky/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const userRepo = new UserRepository();

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await userRepo.findById(req.user!.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.patch('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { fullName, email } = req.body;
    const updates: any = {};

    if (fullName !== undefined) updates.full_name = fullName;
    if (email !== undefined) {
      // Check if email is already taken
      const existing = await userRepo.findByEmail(email);
      if (existing && existing.id !== req.user!.id) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      updates.email = email;
    }

    const user = await userRepo.update(req.user!.id, updates);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change password
router.post('/me/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const user = await userRepo.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await userRepo.verifyPassword(user, currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await userRepo.updatePassword(req.user!.id, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
