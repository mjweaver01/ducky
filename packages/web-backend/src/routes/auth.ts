import { Router } from 'express';
import { UserRepository } from '@ducky/database';
import { generateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/handlers';
import { serializeUser } from '../utils/serializers';

const router = Router();
const userRepo = new UserRepository();

// Register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await userRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const user = await userRepo.create(email, password, fullName);
    const token = generateToken(user.id, user.email);

    res.status(201).json({ user: serializeUser(user), token });
  })
);

// Login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userRepo.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await userRepo.verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await userRepo.updateLastLogin(user.id);
    const token = generateToken(user.id, user.email);

    res.json({ user: serializeUser(user), token });
  })
);

export default router;
