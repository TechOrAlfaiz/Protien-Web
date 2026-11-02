import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { User, Product, Order, Review, Coupon, Banner } from './models.js';

const r = Router();
const wrap = f => (q, s, n) => Promise.resolve(f(q, s, n)).catch(n);

// Secure server-side role-based authorization: check fresh from MongoDB on every request
r.use(wrap(async (q, s, n) => {
  const u = await User.findById(q.user.id);
  return u?.role === 'admin' ? n() : s.status(403).json({ error: 'Access denied: Admins only' });
}));

const slugify = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  subcategory: z.string().optional().default('General'),
  brand: z.string().optional().default('Ananta Elements'),
  goal: z.string().min(2),
  diet: z.string().min(2),
  type: z.enum(['tub', 'bottle', 'pouch', 'capsule', 'box']).or(z.string()),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a pack colour').optional().default('#3e5a48'),
  price: z.coerce.number().min(1),
  originalPrice: z.coerce.number().optional().default(0),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
  stock: z.coerce.number().int().min(0),
  rating: z.coerce.number().min(0).max(5).default(4.8),
  description: z.string().default(''),
  batch: z.string().default(''),
  bestBefore: z.string().default(''),
  image: z.string().default(''),
  images: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  variants: z.array(z.object({
    name: z.string(),
    options: z.array(z.string()),
    priceDelta: z.coerce.number().default(0)
  })).optional().default([])
});

/* ============================================================
   1. DASHBOARD OVERVIEW & ANALYTICS
   ============================================================ */
r.get('/stats', wrap(async (q, s) => {
  const live = { status: { $ne: 'cancelled' } };

  const [
    ordersCount,
    productsCount,
    customersCount,
    revResult,
    lowStockList,
    recentOrders,
    orderStatusCounts,
    refundRequestsCount,
    categorySales
  ] = await Promise.all([
    Order.countDocuments(live),
    Product.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Order.aggregate([{ $match: live }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Product.find({ stock: { $lte: 10 } }).sort({ stock: 1 }).select('name stock slug price category image').limit(15),
    Order.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email'),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.countDocuments({ refundStatus: 'requested' }),
    Order.aggregate([
      { $match: live },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
      { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$p.category', 'Other'] }, revenue: { $sum: '$items.price' }, count: { $sum: '$items.qty' } } },
      { $sort: { revenue: -1 } },
      { $limit: 6 }
    ])
  ]);

  // Daily revenue for the last 14 days for the sales chart
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const dailySales = await Order.aggregate([
    { $match: { createdAt: { $gte: fourteenDaysAgo }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const totalRevenue = revResult[0]?.total || 0;
  const aov = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

  s.json({
    revenue: totalRevenue,
    orders: ordersCount,
    products: productsCount,
    customers: customersCount,
    aov,
    low: lowStockList,
    recent: recentOrders,
    orderStatusCounts: orderStatusCounts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
    refundRequestsCount,
    categorySales,
    dailySales
  });
}));

/* ============================================================
   2. PRODUCT MANAGEMENT
   ============================================================ */
r.get('/products', wrap(async (q, s) => {
  const { category, brand, stock, search } = q.query;
  const filter = {};
  if (category && category !== 'All') filter.category = category;
  if (brand && brand !== 'All') filter.brand = brand;
  if (stock === 'low') filter.stock = { $lte: 10 };
  if (stock === 'out') filter.stock = { $lte: 0 };
  if (search) filter.name = { $regex: search, $options: 'i' };

  const products = await Product.find(filter).sort({ createdAt: -1 });
  s.json(products);
}));

r.post('/products', wrap(async (q, s) => {
  const d = productSchema.parse(q.body);
  let slug = slugify(d.name);
  if (await Product.exists({ slug })) {
    slug += '-' + crypto.randomBytes(2).toString('hex');
  }
  const created = await Product.create({ ...d, slug });
  s.status(201).json(created);
}));

r.put('/products/:id', wrap(async (q, s) => {
  const d = productSchema.parse(q.body);
  const p = await Product.findByIdAndUpdate(q.params.id, d, { new: true });
  p ? s.json(p) : s.status(404).json({ error: 'Product not found' });
}));

r.patch('/products/:id/stock', wrap(async (q, s) => {
  const { stock, delta } = q.body;
  const update = typeof stock === 'number' ? { stock: Math.max(0, stock) } : { $inc: { stock: Number(delta || 0) } };
  const p = await Product.findByIdAndUpdate(q.params.id, update, { new: true });
  p ? s.json(p) : s.status(404).json({ error: 'Product not found' });
}));

r.patch('/products/:id/featured', wrap(async (q, s) => {
  const p = await Product.findById(q.params.id);
  if (!p) return s.status(404).json({ error: 'Product not found' });
  p.isFeatured = !p.isFeatured;
  await p.save();
  s.json({ id: p._id, isFeatured: p.isFeatured });
}));

r.delete('/products/:id', wrap(async (q, s) => {
  await Product.findByIdAndDelete(q.params.id);
  s.json({ ok: true, id: q.params.id });
}));

/* ============================================================
   3. ORDER MANAGEMENT & FULFILLMENT
   ============================================================ */
r.get('/orders', wrap(async (q, s) => {
  const { status, refund, search } = q.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (refund && refund !== 'all') filter.refundStatus = refund;
  if (search) {
    filter.$or = [
      { 'address.name': { $regex: search, $options: 'i' } },
      { 'address.phone': { $regex: search, $options: 'i' } },
      { 'trackingNumber': { $regex: search, $options: 'i' } }
    ];
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(250).populate('user', 'name email phone');
  s.json(orders);
}));

r.patch('/orders/:id/status', wrap(async (q, s) => {
  const { status } = z.object({
    status: z.enum(['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'])
  }).parse(q.body);

  const o = await Order.findById(q.params.id);
  if (!o) return s.status(404).json({ error: 'Order not found' });

  // Re-stock inventory if cancelled
  if (status === 'cancelled' && o.status !== 'cancelled') {
    await Promise.all(o.items.map(i => i.product ? Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } }) : null));
  }
  if (o.status === 'cancelled' && status !== 'cancelled') {
    return s.status(409).json({ error: 'Cancelled orders cannot be reopened.' });
  }

  o.status = status;
  await o.save();
  s.json(o);
}));

r.patch('/orders/:id/shipping', wrap(async (q, s) => {
  const { carrier, trackingNumber } = z.object({
    carrier: z.string().optional().default('BlueDart Express'),
    trackingNumber: z.string().min(3)
  }).parse(q.body);

  const o = await Order.findById(q.params.id);
  if (!o) return s.status(404).json({ error: 'Order not found' });

  o.carrier = carrier;
  o.trackingNumber = trackingNumber;
  if (o.status === 'placed' || o.status === 'packed') {
    o.status = 'shipped';
  }
  await o.save();
  s.json(o);
}));

r.patch('/orders/:id/refund', wrap(async (q, s) => {
  const { refundStatus, refundReason } = z.object({
    refundStatus: z.enum(['none', 'requested', 'refunded', 'rejected']),
    refundReason: z.string().optional().default('')
  }).parse(q.body);

  const o = await Order.findById(q.params.id);
  if (!o) return s.status(404).json({ error: 'Order not found' });

  o.refundStatus = refundStatus;
  if (refundReason) o.refundReason = refundReason;
  if (refundStatus === 'refunded' && o.status !== 'cancelled') {
    o.status = 'cancelled';
    await Promise.all(o.items.map(i => i.product ? Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } }) : null));
  }
  await o.save();
  s.json(o);
}));

/* ============================================================
   4. CUSTOMER MANAGEMENT
   ============================================================ */
r.get('/customers', wrap(async (q, s) => {
  const { search } = q.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).select('-password').limit(150);

  // Aggregate user order stats
  const customerStats = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: '$user',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$total' },
        lastOrderDate: { $max: '$createdAt' }
      }
    }
  ]);
  const statsMap = customerStats.reduce((acc, c) => ({ ...acc, [String(c._id)]: c }), {});

  const result = users.map(u => ({
    ...u.toObject(),
    totalOrders: statsMap[String(u._id)]?.totalOrders || 0,
    totalSpent: statsMap[String(u._id)]?.totalSpent || 0,
    lastOrderDate: statsMap[String(u._id)]?.lastOrderDate || null
  }));

  s.json(result);
}));

r.patch('/customers/:id/role', wrap(async (q, s) => {
  const { role } = z.object({ role: z.enum(['customer', 'admin']) }).parse(q.body);
  if (String(q.user.id) === String(q.params.id)) {
    return s.status(400).json({ error: 'You cannot change your own admin role.' });
  }
  const u = await User.findByIdAndUpdate(q.params.id, { role }, { new: true }).select('-password');
  u ? s.json(u) : s.status(404).json({ error: 'User not found' });
}));

/* ============================================================
   5. COUPON MANAGEMENT
   ============================================================ */
r.get('/coupons', wrap(async (q, s) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  s.json(coupons);
}));

r.post('/coupons', wrap(async (q, s) => {
  const schema = z.object({
    code: z.string().min(3).transform(c => c.toUpperCase().trim()),
    type: z.enum(['percent', 'flat', 'shipping']),
    value: z.coerce.number().min(1),
    minOrder: z.coerce.number().min(0).default(0),
    maxDiscount: z.coerce.number().min(1).default(1000),
    description: z.string().optional().default(''),
    isActive: z.boolean().optional().default(true),
    expiresAt: z.string().optional().nullable()
  });
  const d = schema.parse(q.body);
  const exists = await Coupon.findOne({ code: d.code });
  if (exists) return s.status(409).json({ error: 'Coupon code already exists' });

  const c = await Coupon.create(d);
  s.status(201).json(c);
}));

r.patch('/coupons/:id/toggle', wrap(async (q, s) => {
  const c = await Coupon.findById(q.params.id);
  if (!c) return s.status(404).json({ error: 'Coupon not found' });
  c.isActive = !c.isActive;
  await c.save();
  s.json(c);
}));

r.delete('/coupons/:id', wrap(async (q, s) => {
  await Coupon.findByIdAndDelete(q.params.id);
  s.json({ ok: true });
}));

/* ============================================================
   6. HOMEPAGE BANNER MANAGEMENT
   ============================================================ */
r.get('/banners', wrap(async (q, s) => {
  const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
  s.json(banners);
}));

r.post('/banners', wrap(async (q, s) => {
  const schema = z.object({
    badge: z.string().default('EXCLUSIVE'),
    title: z.string().min(3),
    subtitle: z.string().default(''),
    ctaText: z.string().default('Explore Now'),
    ctaLink: z.string().default('/shop'),
    secondaryCtaText: z.string().optional().default(''),
    secondaryCtaLink: z.string().optional().default(''),
    image: z.string().optional().default(''),
    bgGradient: z.string().optional().default(''),
    statsBadge: z.string().optional().default(''),
    isActive: z.boolean().default(true),
    order: z.coerce.number().default(0)
  });
  const d = schema.parse(q.body);
  const b = await Banner.create(d);
  s.status(201).json(b);
}));

r.put('/banners/:id', wrap(async (q, s) => {
  const b = await Banner.findByIdAndUpdate(q.params.id, q.body, { new: true });
  b ? s.json(b) : s.status(404).json({ error: 'Banner not found' });
}));

r.patch('/banners/:id/toggle', wrap(async (q, s) => {
  const b = await Banner.findById(q.params.id);
  if (!b) return s.status(404).json({ error: 'Banner not found' });
  b.isActive = !b.isActive;
  await b.save();
  s.json(b);
}));

r.delete('/banners/:id', wrap(async (q, s) => {
  await Banner.findByIdAndDelete(q.params.id);
  s.json({ ok: true });
}));

/* ============================================================
   7. REVIEW MODERATION
   ============================================================ */
r.get('/reviews', wrap(async (q, s) => {
  const { status } = q.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(100);
  s.json(reviews);
}));

r.patch('/reviews/:id/status', wrap(async (q, s) => {
  const { status } = z.object({ status: z.enum(['pending', 'approved', 'rejected']) }).parse(q.body);
  const r = await Review.findByIdAndUpdate(q.params.id, { status }, { new: true });
  r ? s.json(r) : s.status(404).json({ error: 'Review not found' });
}));

r.delete('/reviews/:id', wrap(async (q, s) => {
  await Review.findByIdAndDelete(q.params.id);
  s.json({ ok: true });
}));

/* ============================================================
   8. CATEGORIES & BRANDS METADATA
   ============================================================ */
r.get('/meta', wrap(async (q, s) => {
  const [categories, subcategories, brands, goals] = await Promise.all([
    Product.distinct('category'),
    Product.distinct('subcategory'),
    Product.distinct('brand'),
    Product.distinct('goal')
  ]);
  s.json({
    categories: categories.filter(Boolean),
    subcategories: subcategories.filter(Boolean),
    brands: brands.filter(Boolean),
    goals: goals.filter(Boolean)
  });
}));

/* ============================================================
   9. CLOUDINARY UPLOAD SIGNATURE
   ============================================================ */
r.get('/upload-sign', (q, s) => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloudName || !apiKey || !secret) {
    return s.status(501).json({ error: 'Image upload is not set up yet. Paste an image link instead.' });
  }
  const folder = 'ananta', timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex');
  s.json({ cloudName, apiKey, timestamp, folder, signature });
});

export default r;
