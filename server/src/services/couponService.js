import { Coupon } from '../models.js';

export const STATIC_COUPONS = {
  'ANANTA10': { type: 'percent', value: 10, maxDiscount: 500, minOrder: 0, description: '10% off storewide up to ₹500' },
  'WELLNESS20': { type: 'percent', value: 20, maxDiscount: 1000, minOrder: 2499, description: '20% off on orders above ₹2,499' },
  'FIRST500': { type: 'flat', value: 500, minOrder: 2999, description: 'Flat ₹500 off on orders above ₹2,999' },
  'FREESHIP': { type: 'shipping', value: 99, minOrder: 0, description: 'Free express shipping on your order' }
};

export async function validateCoupon(code, subtotal = 0) {
  if (!code) throw { status: 400, message: 'Please provide a coupon code' };
  const cleanCode = String(code).toUpperCase().trim();

  let coupon = await Coupon.findOne({ code: cleanCode, isActive: true });
  if (!coupon) {
    coupon = STATIC_COUPONS[cleanCode];
  }

  if (!coupon) {
    throw { status: 404, message: 'Invalid coupon code. Try ANANTA10, WELLNESS20, or FIRST500.' };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw { status: 400, message: 'This coupon code has expired' };
  }

  if (subtotal < coupon.minOrder) {
    throw {
      status: 400,
      message: `Coupon requires a minimum order of ₹${coupon.minOrder.toLocaleString('en-IN')}`
    };
  }

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.min(coupon.maxDiscount || 1000, Math.round(subtotal * (coupon.value / 100)));
  } else if (coupon.type === 'flat') {
    discount = Math.min(coupon.value, subtotal);
  } else if (coupon.type === 'shipping') {
    discount = subtotal >= 3000 ? 0 : 99;
  }

  return {
    valid: true,
    code: cleanCode,
    discount,
    type: coupon.type,
    description: coupon.description || ''
  };
}

