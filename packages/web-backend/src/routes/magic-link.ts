import * as crypto from 'crypto';
import { Router } from 'express';
import { MagicLinkRepository, UserRepository, TokenRepository } from '@ducky.wtf/database';
import { generateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/handlers';
import { serializeUser } from '../utils/serializers';
import { emailService } from '../lib/email';
import { WWW_WEB_URL } from '../lib/webUrl';

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
    const magicUrl = `${WWW_WEB_URL}/auth/magic?token=${magicLink.token}`;

    // Try to send email
    try {
      await emailService.sendMagicLinkEmail(email, magicUrl);

      // In production, don't reveal the link
      if (process.env.NODE_ENV === 'production') {
        return res.json({ message: 'Magic link sent to your email' });
      }

      // In development, also return the link for easy testing
      return res.json({
        message: 'Magic link sent to your email',
        magicUrl,
        expiresIn: '15 minutes',
      });
    } catch (error) {
      console.error('Failed to send magic link email:', error);

      // In development without email config, still allow sign-in by returning URL
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Magic link for ${email}: ${magicUrl}`);
        return res.json({
          message: 'Magic link generated (email not sent - configure EMAIL_USER/EMAIL_PASSWORD)',
          magicUrl,
          expiresIn: '15 minutes',
        });
      }

      // In production, still return success to avoid email enumeration
      return res.json({ message: 'If the email is valid, a magic link has been sent' });
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

// Request password reset
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Look up user (but always return success to avoid email enumeration)
    const user = await userRepo.findByEmail(email);

    if (user) {
      // Create password reset magic link
      const magicLink = await magicLinkRepo.create(email, undefined, 'password_reset');
      const resetUrl = `${WWW_WEB_URL}/reset-password?token=${magicLink.token}`;

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(email, resetUrl);
      } catch (error) {
        console.error('Failed to send password reset email:', error);
        // In development without email config, still allow reset by returning URL
        if (process.env.NODE_ENV !== 'production') {
          return res.json({
            message:
              'Password reset link generated (email not sent - configure EMAIL_USER/EMAIL_PASSWORD)',
            resetUrl,
            expiresIn: '15 minutes',
          });
        }
        // In production, still return success to avoid email enumeration
      }

      // In development, return the reset URL for easy testing
      if (process.env.NODE_ENV !== 'production') {
        return res.json({
          message: 'Password reset link sent',
          resetUrl,
          expiresIn: '15 minutes',
        });
      }
    }

    // Always return the same success message (no email enumeration)
    res.json({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  })
);

// Reset password
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find and validate password reset magic link
    const magicLink = await magicLinkRepo.findByToken(token, 'password_reset');

    if (!magicLink) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    // Find user
    const user = await userRepo.findByEmail(magicLink.email);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Update password
    await userRepo.updatePassword(user.id, newPassword);

    // Mark magic link as used
    await magicLinkRepo.markUsed(magicLink.id);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Password Reset] Success for user:', user.email);
    }

    res.json({
      message: 'Password has been reset successfully',
    });
  })
);

export default router;
