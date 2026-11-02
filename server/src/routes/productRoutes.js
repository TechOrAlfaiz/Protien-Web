import { Router } from 'express';
import { z } from 'zod';
import { Product, Review, StockNotification, User } from '../models.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/errorHandler.js';
import {
  queryProducts,
  getFrequentlyBoughtTogether
} from '../services/productService.js';

const router = Router();

/* ------------------------------------------------------------
   1. PRODUCTS CATALOG & FILTERING
   ------------------------------------------------------------ */
router.get('/', wrap(async (req, res) => {
  const result = await queryProducts(req.query);
  res.json(result);
}));

router.get('/:slug', wrap(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) {
    return res.status(404).json({ error: 'Formulation not found', code: 'PRODUCT_NOT_FOUND' });
  }
  res.json(product);
}));

/* ------------------------------------------------------------
   2. REVIEWS & COMMUNITY FEEDBACK
   ------------------------------------------------------------ */
router.get('/:slug/reviews', wrap(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const reviews = await Review.find({
    product: product._id,
    status: { $ne: 'rejected' }
  }).sort({ createdAt: -1 });

  const total = reviews.length;
  const avg = total > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / total).toFixed(1)
    : product.rating || '5.0';

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (breakdown[r.rating] !== undefined) breakdown[r.rating]++;
  });

  res.json({
    reviews,
    summary: {
      average: Number(avg),
      total,
      breakdown,
      recommendPercent: total > 0 ? Math.round(((breakdown[5] + breakdown[4]) / total) * 100) : 96
    }
  });
}));

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  title: z.string().min(2, 'Review headline is required'),
  comment: z.string().min(8, 'Please provide detailed clinical experience')
});

router.post('/:id/reviews', auth, wrap(async (req, res) => {
  const data = reviewSchema.parse(req.body);
  const [product, user] = await Promise.all([
    Product.findById(req.params.id),
    User.findById(req.user.id)
  ]);

  if (!product) return res.status(404).json({ error: 'Product not found' });

  const review = await Review.create({
    user: req.user.id,
    userName: user?.name || 'Verified Customer',
    product: product._id,
    productName: product.name,
    productSlug: product.slug,
    rating: data.rating,
    title: data.title,
    comment: data.comment,
    verifiedPurchase: true
  });

  // Re-aggregate product rating
  const allReviews = await Review.find({ product: product._id, status: { $ne: 'rejected' } });
  const avgRating = Number((allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length).toFixed(1));
  product.rating = avgRating;
  await product.save();

  res.status(201).json(review);
}));

/* ------------------------------------------------------------
   3. BACK-IN-STOCK NOTIFICATIONS
   ------------------------------------------------------------ */
const notifySchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  phone: z.string().optional()
});

router.post('/:id/notify', wrap(async (req, res) => {
  const { email, phone } = notifySchema.parse(req.body);
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const existing = await StockNotification.findOne({
    product: product._id,
    email: email.toLowerCase()
  });

  if (existing) {
    return res.json({ message: 'You are already registered for notifications on this batch!' });
  }

  await StockNotification.create({
    product: product._id,
    email: email.toLowerCase(),
    phone: phone || ''
  });

  res.status(201).json({
    message: `We will notify ${email} as soon as NABL verified inventory of ${product.name} is bottled!`
  });
}));

/* ------------------------------------------------------------
   4. FREQUENTLY BOUGHT TOGETHER BUNDLES
   ------------------------------------------------------------ */
router.get('/:slug/frequently-bought', wrap(async (req, res) => {
  const bundle = await getFrequentlyBoughtTogether(req.params.slug);
  res.json(bundle);
}));

export default router;

