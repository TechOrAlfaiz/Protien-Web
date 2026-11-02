import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models.js';
import { auth, setCookie, pub } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { wrap } from '../middleware/errorHandler.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

router.post('/register', authLimiter, wrap(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email is already registered', code: 'EMAIL_EXISTS' });
  }

  const count = await User.countDocuments();
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: count === 0 ? 'admin' : 'customer'
  });

  setCookie(res, user);
  res.status(201).json(pub(user));
}));

router.post('/login', authLimiter, wrap(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email });

  if (!user || !(await bcrypt.compare(data.password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  setCookie(res, user);
  res.json(pub(user));
}));

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true, message: 'Logged out successfully' });
});

router.get('/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found', code: 'USER_NOT_FOUND' });
  }
  res.json(pub(user));
}));

export default router;

