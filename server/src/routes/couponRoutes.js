import { Router } from 'express';
import { validateCoupon } from '../services/couponService.js';
import { wrap } from '../middleware/errorHandler.js';

const router = Router();

router.post('/validate', wrap(async (req, res) => {
  const { code, subtotal = 0 } = req.body || {};
  const result = await validateCoupon(code, subtotal);
  res.json(result);
}));

export default router;

