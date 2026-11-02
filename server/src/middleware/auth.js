import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models.js';

export function setCookie(res, user) {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return token;
}

export function auth(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ error: 'Please sign in to proceed', code: 'UNAUTHORIZED' });
    }
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Please sign in to proceed', code: 'UNAUTHORIZED' });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ error: 'Admin authentication required', code: 'UNAUTHORIZED' });
    }
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only', code: 'FORBIDDEN' });
    }
    req.user = { id: user._id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin credentials', code: 'UNAUTHORIZED' });
  }
}

export function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      req.user = jwt.verify(token, env.JWT_SECRET);
    }
  } catch {
    // Continue without user
  }
  next();
}

export function pub(user) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatar: user.avatar || '',
    role: user.role,
    healthGoals: user.healthGoals || ['Muscle Recovery', 'Deep Sleep'],
    dietaryPreference: user.dietaryPreference || '100% Vegetarian',
    notificationPreferences: user.notificationPreferences || { emailOrders: true, emailNewsletter: true, smsTracking: true },
    addresses: user.addresses || [],
    wishlist: user.wishlist || [],
    cart: user.cart || [],
    recommendationConsent: user.recommendationConsent !== false,
    createdAt: user.createdAt
  };
}

