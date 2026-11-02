import mongoose from 'mongoose';
const { Schema, model } = mongoose;

/* ============================================================
   USER MODEL & SCHEMAS
   ============================================================ */
const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  avatar: { type: String, default: '' },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  healthGoals: { type: [String], default: ['Muscle Recovery', 'Deep Sleep'] },
  dietaryPreference: { type: String, default: '100% Vegetarian' },
  notificationPreferences: {
    emailOrders: { type: Boolean, default: true },
    emailNewsletter: { type: Boolean, default: true },
    smsTracking: { type: Boolean, default: true }
  },
  addresses: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: 'Maharashtra' },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
  }],
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  cart: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    qty: { type: Number, default: 1, min: 1 },
    size: String,
    flavor: String
  }],
  recentlyViewed: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    viewedAt: { type: Date, default: Date.now }
  }],
  recommendationConsent: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

export const User = model('User', userSchema);

/* ============================================================
   PRODUCT MODEL & SCHEMAS
   ============================================================ */
const productSchema = new Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  subcategory: { type: String, default: 'General' },
  goal: { type: String, default: 'Recovery' },
  diet: { type: String, default: '100% Vegetarian' },
  type: { type: String, default: 'tub' },
  color: { type: String, default: '#3e5a48' },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  rating: { type: Number, default: 4.8, min: 0, max: 5 },
  stock: { type: Number, default: 100, min: 0 },
  description: { type: String, default: '' },
  batch: { type: String, default: '' },
  bestBefore: { type: String, default: '' },
  image: { type: String, default: '' },
  images: [{ type: String }],
  brand: { type: String, default: 'Ananta Elements' },
  isFeatured: { type: Boolean, default: false },
  variants: [{
    name: String,
    options: [String],
    priceDelta: { type: Number, default: 0 }
  }]
}, { timestamps: true });

// Optimized compound & text indexes for catalog filtering
productSchema.index({ category: 1, stock: 1, price: 1 });
productSchema.index({ goal: 1, rating: -1 });
productSchema.index({ brand: 1, createdAt: -1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index(
  { name: 'text', description: 'text', category: 'text', brand: 'text', goal: 'text' },
  { weights: { name: 10, category: 5, brand: 4, goal: 3, description: 1 }, name: 'ProductTextIndex' }
);

export const Product = model('Product', productSchema);

/* ============================================================
   ORDER MODEL & SCHEMAS
   ============================================================ */
const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    qty: Number,
    size: String,
    flavor: String,
    image: String
  }],
  address: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: 'Maharashtra' },
    pincode: { type: String, required: true }
  },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  coupon: { type: String, default: null },
  shipping: { type: Number, default: 0 },
  shippingMethod: { type: String, default: 'standard' },
  total: { type: Number, required: true },
  payment: { type: String, default: 'cod' },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    status: { type: String, default: 'pending' }
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'placed'
  },
  trackingNumber: { type: String, default: '' },
  carrier: { type: String, default: 'BlueDart Express' },
  refundStatus: {
    type: String,
    enum: ['none', 'requested', 'refunded', 'rejected'],
    default: 'none'
  },
  refundReason: String,
  cancellationReason: String
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = model('Order', orderSchema);

/* ============================================================
   REVIEW MODEL & SCHEMAS
   ============================================================ */
const reviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: 'Verified Customer' },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  productSlug: String,
  rating: { type: Number, min: 1, max: 5, default: 5 },
  title: { type: String, required: true, trim: true },
  comment: { type: String, required: true },
  verifiedPurchase: { type: Boolean, default: true },
  helpfulCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  isFlagged: { type: Boolean, default: false }
}, { timestamps: true });

reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ productSlug: 1, status: 1 });
reviewSchema.index({ user: 1, product: 1 });
reviewSchema.index({ helpfulCount: -1 });

export const Review = model('Review', reviewSchema);

/* ============================================================
   COUPON MODEL & SCHEMAS
   ============================================================ */
const couponSchema = new Schema({
  code: { type: String, unique: true, uppercase: true, trim: true, required: true },
  type: { type: String, enum: ['percent', 'flat', 'shipping'], default: 'percent' },
  value: { type: Number, required: true, min: 0 },
  minOrder: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: 1000 },
  description: String,
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
  usedCount: { type: Number, default: 0 }
}, { timestamps: true });

couponSchema.index({ isActive: 1, expiresAt: 1 });

export const Coupon = model('Coupon', couponSchema);

/* ============================================================
   BANNER MODEL & SCHEMAS
   ============================================================ */
const bannerSchema = new Schema({
  badge: { type: String, default: 'EXCLUSIVE' },
  title: { type: String, required: true },
  subtitle: String,
  ctaText: { type: String, default: 'Explore Now' },
  ctaLink: { type: String, default: '/shop' },
  secondaryCtaText: String,
  secondaryCtaLink: String,
  image: String,
  bgGradient: String,
  statsBadge: String,
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

bannerSchema.index({ isActive: 1, order: 1 });

export const Banner = model('Banner', bannerSchema);

/* ============================================================
   STOCK NOTIFICATION MODEL & SCHEMAS
   ============================================================ */
const stockNotificationSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  notified: { type: Boolean, default: false }
}, { timestamps: true });

stockNotificationSchema.index({ product: 1, notified: 1 });
stockNotificationSchema.index({ email: 1, product: 1 });

export const StockNotification = model('StockNotification', stockNotificationSchema);

/* ============================================================
   SUPPORT TICKET MODEL & SCHEMAS
   ============================================================ */
const supportTicketSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: 'Customer' },
  email: { type: String, required: true, lowercase: true, trim: true },
  orderId: { type: String, default: '' },
  category: { type: String, default: 'Order Inquiry' },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' }
}, { timestamps: true });

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

export const SupportTicket = model('SupportTicket', supportTicketSchema);
