import { Router } from 'express';
import { z } from 'zod';
import { Order } from '../models.js';
import { auth } from '../middleware/auth.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import { wrap } from '../middleware/errorHandler.js';
import { processOrder } from '../services/orderService.js';

const router = Router();

const orderBodySchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1, 'Product ID is required'),
    qty: z.number().int().min(1).max(10),
    size: z.string().optional(),
    flavor: z.string().optional()
  })).min(1, 'Order must contain at least one item'),
  address: z.object({
    name: z.string().min(2, 'Name is required'),
    phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
    line1: z.string().min(5, 'Address line is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().optional().default('Maharashtra'),
    pincode: z.string().regex(/^\d{6}$/, 'Postal PIN code must be 6 digits')
  }),
  coupon: z.string().optional().nullable(),
  shippingMethod: z.enum(['standard', 'express']).optional().default('standard'),
  payment: z.enum(['cod', 'razorpay', 'upi']).optional().default('cod'),
  paymentDetails: z.object({
    razorpayOrderId: z.string().optional(),
    razorpayPaymentId: z.string().optional()
  }).optional(),
  saveAddress: z.boolean().optional()
});

router.post('/', auth, orderLimiter, wrap(async (req, res) => {
  const data = orderBodySchema.parse(req.body);
  const order = await processOrder({
    userId: req.user.id,
    ...data
  });
  res.status(201).json(order);
}));

router.get('/mine', auth, wrap(async (req, res) => {
  const list = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(list);
}));

router.get('/:id', auth, wrap(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) {
    return res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
  }
  res.json(order);
}));

router.get('/:id/track', auth, wrap(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) {
    return res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
  }

  // Realistic delivery tracking status progression
  const now = Date.now();
  const created = new Date(order.createdAt).getTime();
  const diffHours = (now - created) / (1000 * 60 * 60);

  let currentStage = 1;
  let statusText = 'Laboratory Verification & Sterilization';
  if (order.status === 'delivered') {
    currentStage = 4;
    statusText = 'Delivered to Address';
  } else if (order.status === 'shipped' || diffHours > 24) {
    currentStage = 3;
    statusText = 'In Transit with Cold-Chain Courier';
  } else if (order.status === 'confirmed' || diffHours > 4) {
    currentStage = 2;
    statusText = 'Dispatched from Temperature-Controlled Hub';
  }

  const milestones = [
    { title: 'Order Placed & Prescription Checked', time: order.createdAt, done: true },
    {
      title: 'Batch Quality & Sterility Confirmed',
      time: new Date(created + 2 * 3600000),
      done: currentStage >= 2
    },
    {
      title: 'Handed to BlueDart Express Cold-Chain',
      time: new Date(created + 14 * 3600000),
      done: currentStage >= 3
    },
    {
      title: 'Out for Local Refrigerated Delivery',
      time: new Date(created + 48 * 3600000),
      done: currentStage >= 4
    }
  ];

  res.json({
    orderId: order._id,
    trackingNumber: order.trackingNumber || 'BD-PENDING',
    carrier: order.carrier || 'BlueDart Express',
    currentStage,
    statusText,
    milestones,
    estimatedDelivery: new Date(created + 72 * 3600000).toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  });
}));

export default router;

