import { Router } from 'express';
import { DomainRepository } from '@ducky/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const domainRepo = new DomainRepository();

// List user's domains
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const domains = await domainRepo.listByUser(req.user!.id);

    res.json({
      domains: domains.map(d => ({
        id: d.id,
        domain: d.domain,
        verificationToken: d.verification_token,
        isVerified: d.is_verified,
        verifiedAt: d.verified_at,
        createdAt: d.created_at,
        isActive: d.is_active,
      })),
    });
  } catch (error) {
    console.error('List domains error:', error);
    res.status(500).json({ error: 'Failed to list domains' });
  }
});

// Add custom domain
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Check if domain already exists
    const existing = await domainRepo.findByDomain(domain);
    if (existing) {
      return res.status(409).json({ error: 'Domain already registered' });
    }

    const customDomain = await domainRepo.create(req.user!.id, domain);

    res.status(201).json({
      domain: {
        id: customDomain.id,
        domain: customDomain.domain,
        verificationToken: customDomain.verification_token,
        isVerified: customDomain.is_verified,
        createdAt: customDomain.created_at,
      },
    });
  } catch (error) {
    console.error('Add domain error:', error);
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

// Verify domain
router.post('/:id/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const domainRecord = await domainRepo.findById(req.params.id);

    if (!domainRecord || domainRecord.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // TODO: Actually check DNS records for verification token
    // For now, just mark as verified
    const verified = await domainRepo.verify(req.params.id);

    res.json({
      domain: {
        id: verified.id,
        domain: verified.domain,
        isVerified: verified.is_verified,
        verifiedAt: verified.verified_at,
      },
    });
  } catch (error) {
    console.error('Verify domain error:', error);
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

// Regenerate verification token
router.post('/:id/regenerate-token', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const domainRecord = await domainRepo.findById(req.params.id);

    if (!domainRecord || domainRecord.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const updated = await domainRepo.regenerateToken(req.params.id);

    res.json({
      domain: {
        id: updated.id,
        domain: updated.domain,
        verificationToken: updated.verification_token,
      },
    });
  } catch (error) {
    console.error('Regenerate token error:', error);
    res.status(500).json({ error: 'Failed to regenerate token' });
  }
});

// Delete domain
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const domainRecord = await domainRepo.findById(req.params.id);

    if (!domainRecord || domainRecord.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    await domainRepo.delete(req.params.id);

    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

export default router;
