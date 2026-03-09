import { Router } from 'express';
import { DomainRepository, getEffectivePlan } from '@ducky.wtf/database';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { createDomainSchema, paginationSchema } from '../validation/schemas';
import { asyncHandler, assertOwned } from '../utils/handlers';
import { serializeDomain } from '../utils/serializers';
import { verifyDnsTxtRecord } from '../services/dns';

const router = Router();
const domainRepo = new DomainRepository();

// List user's domains
router.get(
  '/',
  authenticateToken,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const validated = paginationSchema.parse(req.query);
    const domains = await domainRepo.listByUser(req.user!.id, validated.limit, validated.offset);
    res.json({ 
      domains: domains.map(serializeDomain),
      pagination: { limit: validated.limit, offset: validated.offset, hasMore: domains.length === validated.limit }
    });
  })
);

// Add custom domain
router.post(
  '/',
  authenticateToken,
  validateBody(createDomainSchema),
  asyncHandler(async (req, res) => {
    const { domain } = req.body;

    // Check user's effective plan - custom domains require Enterprise
    const effectivePlan = await getEffectivePlan(req.user!.id);
    if (effectivePlan !== 'enterprise') {
      return res.status(403).json({
        error: 'Custom domains require Enterprise plan',
        plan: effectivePlan,
      });
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
    
    // Check DNS TXT record
    const verificationResult = await verifyDnsTxtRecord(
      domainRecord.domain,
      domainRecord.verification_token
    );
    
    if (!verificationResult.verified) {
      return res.status(400).json({
        error: verificationResult.error || 'DNS verification failed',
        details: `Add a TXT record to ${domainRecord.domain} with value: ducky-verification=${domainRecord.verification_token}`,
        records: verificationResult.records,
      });
    }
    
    // Mark as verified
    const verified = await domainRepo.verify(req.params.id);
    res.json({ 
      domain: serializeDomain(verified),
      message: 'Domain verified successfully' 
    });
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
