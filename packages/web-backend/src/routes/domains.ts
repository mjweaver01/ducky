import { Router } from 'express';
import { DomainRepository } from '@ducky/database';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler, assertOwned } from '../utils/handlers';
import { serializeDomain } from '../utils/serializers';

const router = Router();
const domainRepo = new DomainRepository();

// List user's domains
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const domains = await domainRepo.listByUser(req.user!.id);
    res.json({ domains: domains.map(serializeDomain) });
  })
);

// Add custom domain
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    const existing = await domainRepo.findByDomain(domain);
    if (existing) {
      return res.status(409).json({ error: 'Domain already registered' });
    }
    const customDomain = await domainRepo.create(req.user!.id, domain);
    res.status(201).json({ domain: serializeDomain(customDomain) });
  })
);

// Verify domain
router.post(
  '/:id/verify',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const domainRecord = await domainRepo.findById(req.params.id);
    if (!assertOwned(domainRecord, req.user!.id, res, 'Domain')) return;
    // TODO: check DNS TXT record before marking verified
    const verified = await domainRepo.verify(req.params.id);
    res.json({ domain: serializeDomain(verified) });
  })
);

// Regenerate verification token
router.post(
  '/:id/regenerate-token',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const domainRecord = await domainRepo.findById(req.params.id);
    if (!assertOwned(domainRecord, req.user!.id, res, 'Domain')) return;
    const updated = await domainRepo.regenerateToken(req.params.id);
    res.json({ domain: serializeDomain(updated) });
  })
);

// Delete domain
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const domainRecord = await domainRepo.findById(req.params.id);
    if (!assertOwned(domainRecord, req.user!.id, res, 'Domain')) return;
    await domainRepo.delete(req.params.id);
    res.json({ message: 'Domain deleted successfully' });
  })
);

export default router;
