import { Router } from 'express';
import { TokenRepository } from '@ducky/database';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler, assertOwned } from '../utils/handlers';
import { serializeToken } from '../utils/serializers';

const router = Router();
const tokenRepo = new TokenRepository();

// List user's tokens
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const tokens = await tokenRepo.listByUser(req.user!.id);
    res.json({ tokens: tokens.map(serializeToken) });
  })
);

// Create new token
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Token name is required' });
    }
    const token = await tokenRepo.create(req.user!.id, name);
    res.status(201).json({ token: serializeToken(token) });
  })
);

// Rename token
router.patch(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Token name is required' });
    }
    const existing = await tokenRepo.findById(req.params.id);
    if (!assertOwned(existing, req.user!.id, res, 'Token')) return;
    const token = await tokenRepo.update(req.params.id, name);
    res.json({ token: serializeToken(token) });
  })
);

// Revoke token
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const existing = await tokenRepo.findById(req.params.id);
    if (!assertOwned(existing, req.user!.id, res, 'Token')) return;
    await tokenRepo.revoke(req.params.id);
    res.json({ message: 'Token revoked successfully' });
  })
);

export default router;
