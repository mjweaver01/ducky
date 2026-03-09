import { Router } from 'express';
import { TokenRepository, UserRepository, getEffectivePlan } from '@ducky.wtf/database';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createTokenSchema,
  updateTokenSchema,
  updateSubdomainSchema,
  paginationSchema,
} from '../validation/schemas';
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
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const validated = paginationSchema.parse(req.query);
    const tokens = await tokenRepo.listByUser(req.user!.id, validated.limit, validated.offset);
    res.json({
      tokens: tokens.map(serializeToken),
      pagination: {
        limit: validated.limit,
        offset: validated.offset,
        hasMore: tokens.length === validated.limit,
      },
    });
  })
);

// Create new token
router.post(
  '/',
  authenticateToken,
  validateBody(createTokenSchema),
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    // Get effective plan (includes team membership)
    const effectivePlan = await getEffectivePlan(req.user!.id);

    const token = await tokenRepo.create(req.user!.id, name, effectivePlan);
    res.status(201).json({ token: serializeToken(token) });
  })
);

// Rename token
router.patch(
  '/:id',
  authenticateToken,
  validateBody(updateTokenSchema),
  asyncHandler(async (req, res) => {
    const { name } = req.body;
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
  validateBody(updateSubdomainSchema),
  asyncHandler(async (req, res) => {
    const { subdomain } = req.body;

    const existing = await tokenRepo.findById(req.params.id);
    if (!assertOwned(existing, req.user!.id, res, 'Token')) return;

    // Check user's effective plan (includes team membership)
    const effectivePlan = await getEffectivePlan(req.user!.id);
    if (!['pro', 'enterprise'].includes(effectivePlan)) {
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

    // Check user's effective plan (includes team membership)
    const effectivePlan = await getEffectivePlan(req.user!.id);
    if (!['pro', 'enterprise'].includes(effectivePlan)) {
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
