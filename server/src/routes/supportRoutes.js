import { Router } from 'express';
import { z } from 'zod';
import { SupportTicket } from '../models.js';
import { optionalAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/errorHandler.js';

const router = Router();

const ticketSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  orderId: z.string().optional().default(''),
  category: z.string().default('Order Inquiry'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters long')
});

router.post('/ticket', optionalAuth, wrap(async (req, res) => {
  const data = ticketSchema.parse(req.body);

  const ticket = await SupportTicket.create({
    user: req.user?.id || null,
    name: data.name,
    email: data.email.toLowerCase(),
    orderId: data.orderId,
    category: data.category,
    subject: data.subject,
    message: data.message,
    status: 'open'
  });

  res.status(201).json({
    ticketId: ticket._id,
    message: 'Your inquiry has been registered. An Ananta clinical pharmacist will follow up within 4 business hours.'
  });
}));

export default router;

