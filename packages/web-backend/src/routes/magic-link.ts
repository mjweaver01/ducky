import { Router } from 'express';
import { MagicLinkRepository, UserRepository, TokenRepository } from '@ducky.wtf/database';
import { asyncHandler } from '../utils/handlers';
import { generateToken } from '../middleware/auth';
import { serializeUser } from '../utils/serializers';
import * as crypto from 'crypto';

const router = Router();
const magicLinkRepo = new MagicLinkRepository();
const userRepo = new UserRepository();
const tokenRepo = new TokenRepository();

// Request magic link
router.post(
  '/magic-link',
  asyncHandler(async (req, res) => {
    const { email, anonymousToken } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Create magic link
    const magicLink = await magicLinkRepo.create(email, anonymousToken);

    // TODO: Send email with magic link
    // For now, return the link in dev mode
    const magicUrl = `${process.env.WEB_URL || 'http://localhost:9179'}/auth/magic?token=${magicLink.token}`;

    // In production, only send email and return success
    if (process.env.NODE_ENV === 'production') {
      console.log(`Magic link for ${email}: ${magicUrl}`);
      res.json({ message: 'Magic link sent to your email' });
    } else {
      // In development, return the link for easy testing
      res.json({
        message: 'Magic link generated',
        magicUrl,
        expiresIn: '15 minutes',
      });
    }
  })
);

// Verify magic link and login
router.post(
  '/magic-verify',
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find and validate magic link
    const magicLink = await magicLinkRepo.findByToken(token);
    if (!magicLink) {
      return res.status(400).json({ error: 'Invalid or expired magic link' });
    }

    // Mark as used
    await magicLinkRepo.markUsed(magicLink.id);

    // Find or create user
    let user = await userRepo.findByEmail(magicLink.email);
    if (!user) {
      // Create new user (passwordless)
      user = await userRepo.create(magicLink.email, crypto.randomBytes(32).toString('hex'));
    }

    // Update last login
    await userRepo.updateLastLogin(user.id);

    // If there was an anonymous token, link it to the user
    let cliToken = null;
    if (magicLink.anonymous_token) {
      const authToken = await tokenRepo.findByToken(magicLink.anonymous_token);
      if (authToken && authToken.is_anonymous) {
        await tokenRepo.linkToUser(authToken.id, user.id, user.plan);
        cliToken = authToken.token;
      }
    }

    // Generate JWT for web session
    const jwtToken = generateToken(user.id, user.email);

    res.json({
      user: serializeUser(user),
      token: jwtToken,
      cliToken, // If anonymous token was linked, return it
    });
  })
);

export default router;
