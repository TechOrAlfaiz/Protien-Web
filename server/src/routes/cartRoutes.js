import { Router } from 'express';
import { User } from '../models.js';
import { auth } from '../middleware/auth.js';
import { wrap } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id).populate('cart.product');
  const items = (user?.cart || []).map(ci => ({
    id: ci.product?._id,
    uniqueId: `${ci.product?._id}_${ci.size || 'std'}_${ci.flavor || 'std'}`,
    name: ci.product?.name,
    price: ci.product?.price,
    qty: ci.qty,
    size: ci.size,
    flavor: ci.flavor,
    image: ci.product?.image,
    stock: ci.product?.stock,
    type: ci.product?.type,
    color: ci.product?.color,
    slug: ci.product?.slug
  })).filter(i => i.id);

  res.json(items);
}));

router.post('/sync', auth, wrap(async (req, res) => {
  const { cartItems = [] } = req.body || {};
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = user.cart || [];
  const mergedMap = new Map();

  existing.forEach(i => {
    const key = `${i.product}_${i.size || 'std'}_${i.flavor || 'std'}`;
    mergedMap.set(key, { product: i.product, qty: i.qty, size: i.size, flavor: i.flavor });
  });

  cartItems.forEach(i => {
    const pId = i.id || i._id;
    if (!pId) return;
    const key = `${pId}_${i.size || 'std'}_${i.flavor || 'std'}`;
    if (mergedMap.has(key)) {
      mergedMap.get(key).qty = Math.max(mergedMap.get(key).qty, i.qty || 1);
    } else {
      mergedMap.set(key, { product: pId, qty: i.qty || 1, size: i.size, flavor: i.flavor });
    }
  });

  user.cart = Array.from(mergedMap.values());
  await user.save();

  const populated = await User.findById(req.user.id).populate('cart.product');
  const items = (populated?.cart || []).map(ci => ({
    id: ci.product?._id,
    uniqueId: `${ci.product?._id}_${ci.size || 'std'}_${ci.flavor || 'std'}`,
    name: ci.product?.name,
    price: ci.product?.price,
    qty: ci.qty,
    size: ci.size,
    flavor: ci.flavor,
    image: ci.product?.image,
    stock: ci.product?.stock,
    type: ci.product?.type,
    color: ci.product?.color,
    slug: ci.product?.slug
  })).filter(i => i.id);

  res.json(items);
}));

router.put('/', auth, wrap(async (req, res) => {
  const { cartItems = [] } = req.body || {};
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.cart = cartItems.map(i => ({
    product: i.id || i._id,
    qty: i.qty || 1,
    size: i.size,
    flavor: i.flavor
  })).filter(i => i.product);

  await user.save();
  res.json({ ok: true });
}));

export default router;

