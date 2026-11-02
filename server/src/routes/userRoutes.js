import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Review, Order, SupportTicket, Product } from '../models.js';
import { auth, pub } from '../middleware/auth.js';
import { wrap } from '../middleware/errorHandler.js';

const router = Router();

/* ------------------------------------------------------------
   1. USER ADDRESS BOOK
   ------------------------------------------------------------ */
const addressSchema = z.object({
  name: z.string().min(2, 'Recipient name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  line1: z.string().min(5, 'Full street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().default('Maharashtra'),
  pincode: z.string().regex(/^\d{6}$/, 'Postal PIN code must be exactly 6 digits'),
  isDefault: z.boolean().optional()
});

router.get('/addresses', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user?.addresses || []);
}));

router.post('/addresses', auth, wrap(async (req, res) => {
  const data = addressSchema.parse(req.body);
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (data.isDefault) {
    user.addresses.forEach(a => { a.isDefault = false; });
  } else if (user.addresses.length === 0) {
    data.isDefault = true;
  }

  user.addresses.push(data);
  await user.save();
  res.status(201).json(user.addresses);
}));

router.delete('/addresses/:id', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.addresses = user.addresses.filter(a => String(a._id) !== req.params.id);
  await user.save();
  res.json(user.addresses);
}));

router.put('/addresses/:id/default', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.addresses.forEach(a => {
    a.isDefault = String(a._id) === req.params.id;
  });
  await user.save();
  res.json(user.addresses);
}));

/* ------------------------------------------------------------
   2. PROFILE & SECURITY SETTINGS
   ------------------------------------------------------------ */
const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  healthGoals: z.array(z.string()).optional(),
  dietaryPreference: z.string().optional(),
  notificationPreferences: z.object({
    emailOrders: z.boolean().optional(),
    emailNewsletter: z.boolean().optional(),
    smsTracking: z.boolean().optional()
  }).optional()
});

router.put('/profile', auth, wrap(async (req, res) => {
  const data = profileUpdateSchema.parse(req.body);
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (data.name) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.healthGoals) user.healthGoals = data.healthGoals;
  if (data.dietaryPreference) user.dietaryPreference = data.dietaryPreference;
  if (data.notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...data.notificationPreferences
    };
  }

  await user.save();
  res.json(pub(user));
}));

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long')
});

router.put('/password', auth, wrap(async (req, res) => {
  const { currentPassword, newPassword } = passwordUpdateSchema.parse(req.body);
  const user = await User.findById(req.user.id);

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ error: 'Current password does not match records' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
}));

/* ------------------------------------------------------------
   3. CUSTOMER REVIEWS
   ------------------------------------------------------------ */
router.get('/reviews', auth, wrap(async (req, res) => {
  const list = await Review.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(list);
}));

const reviewCreateSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().min(1).max(5),
  title: z.string().min(2),
  comment: z.string().min(6)
});

router.post('/reviews', auth, wrap(async (req, res) => {
  const data = reviewCreateSchema.parse(req.body);
  const [product, user] = await Promise.all([
    Product.findById(data.productId),
    User.findById(req.user.id)
  ]);

  const review = await Review.create({
    user: req.user.id,
    userName: user?.name || 'Verified Customer',
    product: data.productId,
    productName: product?.name || 'Ananta Formulation',
    productSlug: product?.slug || '',
    rating: data.rating,
    title: data.title,
    comment: data.comment,
    verifiedPurchase: true
  });

  res.status(201).json(review);
}));

router.delete('/reviews/:id', auth, wrap(async (req, res) => {
  await Review.deleteOne({ _id: req.params.id, user: req.user.id });
  res.json({ success: true, message: 'Review deleted' });
}));

/* ------------------------------------------------------------
   4. ACCOUNT DASHBOARD STATS
   ------------------------------------------------------------ */
router.get('/stats', auth, wrap(async (req, res) => {
  const [ordersCount, reviewsCount, user] = await Promise.all([
    Order.countDocuments({ user: req.user.id }),
    Review.countDocuments({ user: req.user.id }),
    User.findById(req.user.id)
  ]);

  res.json({
    ordersCount,
    reviewsCount,
    addressesCount: user?.addresses?.length || 0,
    memberSince: user?.createdAt || new Date()
  });
}));

/* ------------------------------------------------------------
   5. PERSISTENT WISHLIST SYNCHRONIZATION
   ------------------------------------------------------------ */
router.get('/wishlist', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id).populate('wishlist');
  res.json(user?.wishlist || []);
}));

router.post('/wishlist/sync', auth, wrap(async (req, res) => {
  const { ids = [] } = req.body || {};
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = (user.wishlist || []).map(String);
  const merged = [...new Set([...existing, ...ids.map(String)])];
  user.wishlist = merged;
  await user.save();

  const populated = await User.findById(req.user.id).populate('wishlist');
  res.json(populated?.wishlist || []);
}));

router.post('/wishlist/:id', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const targetId = String(req.params.id);
  const currentWishlist = (user.wishlist || []).map(String);

  if (currentWishlist.includes(targetId)) {
    user.wishlist = currentWishlist.filter(id => id !== targetId);
  } else {
    user.wishlist.push(targetId);
  }

  await user.save();
  const populated = await User.findById(req.user.id).populate('wishlist');
  res.json(populated?.wishlist || []);
}));

/* ------------------------------------------------------------
   6. RECENTLY VIEWED & PRIVACY CONSENT
   ------------------------------------------------------------ */
router.post('/recently-viewed/:id', wrap(async (req, res) => {
  const productId = req.params.id;
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    if (user && user.recommendationConsent !== false) {
      user.recentlyViewed = (user.recentlyViewed || []).filter(
        v => String(v.product) !== productId
      );
      user.recentlyViewed.unshift({ product: productId, viewedAt: new Date() });
      if (user.recentlyViewed.length > 12) user.recentlyViewed.pop();
      await user.save();
    }
  }
  res.json({ ok: true });
}));

router.get('/recently-viewed', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id).populate('recentlyViewed.product');
  const items = (user?.recentlyViewed || [])
    .map(v => v.product)
    .filter(Boolean);
  res.json(items);
}));

router.put('/consent', auth, wrap(async (req, res) => {
  const { recommendationConsent } = req.body || {};
  await User.findByIdAndUpdate(req.user.id, {
    recommendationConsent: Boolean(recommendationConsent)
  });
  res.json({ ok: true, recommendationConsent: Boolean(recommendationConsent) });
}));

/* ------------------------------------------------------------
   7. CUSTOMER HELPDESK TICKETS
   ------------------------------------------------------------ */
router.get('/tickets', auth, wrap(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(tickets);
}));

export default router;

