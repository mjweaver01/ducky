import { Router } from 'express';
import { TokenRepository, UserRepository } from '@ducky.wtf/database';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler, assertOwned } from '../utils/handlers';
import { serializeToken } from '../utils/serializers';

const router = Router();
const tokenRepo = new TokenRepository();
const userRepo = new UserRepository();

// Create anonymous token (for first-time CLI users)
router.post(
  '/anonymous',
  asyncHandler(async (req, res) => {
    const token = await tokenRepo.createAnonymous();
    res.status(201).json({ token: serializeToken(token) });
  })
);

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

    // Get user's plan to determine if they get a static subdomain
    const user = await userRepo.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = await tokenRepo.create(req.user!.id, name, user.plan);
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

// Update token subdomain (Pro/Enterprise only)
router.patch(
  '/:id/subdomain',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { subdomain } = req.body;
    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain is required' });
    }

    // Validate subdomain format (alphanumeric, 3-20 chars)
    if (!/^[a-z0-9]{3,20}$/.test(subdomain)) {
      return res.status(400).json({
        error: 'Subdomain must be 3-20 characters (lowercase letters and numbers only)',
      });
    }

    const existing = await tokenRepo.findById(req.params.id);
    if (!assertOwned(existing, req.user!.id, res, 'Token')) return;

    // Check user's plan
    const user = await userRepo.findById(req.user!.id);
    if (!user || !['pro', 'enterprise'].includes(user.plan)) {
      return res.status(403).json({ error: 'Custom subdomains require Pro or Enterprise plan' });
    }

    // Check if subdomain is available
    const subdomainInUse = await tokenRepo.findBySubdomain(subdomain);
    if (subdomainInUse && subdomainInUse.id !== req.params.id) {
      return res.status(409).json({ error: 'Subdomain already in use' });
    }

    const token = await tokenRepo.updateSubdomain(req.params.id, subdomain);
    res.json({ token: serializeToken(token) });
  })
);

// Regenerate token subdomain (Pro/Enterprise only)
router.post(
  '/:id/regenerate-subdomain',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const existing = await tokenRepo.findById(req.params.id);
    if (!assertOwned(existing, req.user!.id, res, 'Token')) return;

    // Check user's plan
    const user = await userRepo.findById(req.user!.id);
    if (!user || !['pro', 'enterprise'].includes(user.plan)) {
      return res.status(403).json({ error: 'Static subdomains require Pro or Enterprise plan' });
    }

    const token = await tokenRepo.regenerateSubdomain(req.params.id);
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
