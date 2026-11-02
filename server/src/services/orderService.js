import { Product, Order, User, Coupon } from '../models.js';
import { STATIC_COUPONS } from './couponService.js';

export async function processOrder({ userId, items: requestedItems, address, coupon, shippingMethod, payment, paymentDetails, saveAddress }) {
  const productIds = requestedItems.map(i => i.id);
  const foundProducts = await Product.find({ _id: { $in: productIds } });

  const decremented = [];
  const processedItems = [];

  // Rollback helper in case of out-of-stock failure mid-cart
  const rollbackStock = async () => {
    await Promise.all(
      decremented.map(item =>
        Product.updateOne({ _id: item.id }, { $inc: { stock: item.qty } })
      )
    );
  };

  for (const item of requestedItems) {
    const prod = foundProducts.find(p => String(p._id) === item.id);
    if (!prod) {
      await rollbackStock();
      throw { status: 400, message: 'A selected formulation is no longer available in the catalogue' };
    }

    // Atomic conditional decrement to eliminate race conditions
    const updateResult = await Product.updateOne(
      { _id: prod._id, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty } }
    );

    if (!updateResult.modifiedCount) {
      await rollbackStock();
      throw {
        status: 409,
        message: `${prod.name} has insufficient stock for the requested quantity (${item.qty} units)`
      };
    }

    decremented.push({ id: prod._id, qty: item.qty });

    // Calculate unit price considering packaging size
    let unitPrice = prod.price;
    if (item.size) {
      if (item.size.includes('250g') || item.size.includes('30')) unitPrice = Math.round(prod.price * 0.55);
      else if (item.size.includes('1kg') || item.size.includes('120')) unitPrice = Math.round(prod.price * 1.85);
      else if (item.size.includes('2kg') || item.size.includes('180')) unitPrice = Math.round(prod.price * 2.5);
    }

    processedItems.push({
      product: prod._id,
      name: prod.name,
      price: unitPrice,
      qty: item.qty,
      size: item.size || 'Standard',
      flavor: item.flavor || 'Original',
      image: prod.image
    });
  }

  const subtotal = processedItems.reduce((acc, i) => acc + i.price * i.qty, 0);

  // Validate coupon discount
  let discount = 0;
  if (coupon) {
    const cleanCoupon = String(coupon).toUpperCase().trim();
    let couponInfo = await Coupon.findOne({ code: cleanCoupon, isActive: true });
    if (!couponInfo) couponInfo = STATIC_COUPONS[cleanCoupon];
    if (couponInfo && subtotal >= couponInfo.minOrder) {
      if (couponInfo.type === 'percent') {
        discount = Math.min(couponInfo.maxDiscount || 1000, Math.round(subtotal * (couponInfo.value / 100)));
      } else if (couponInfo.type === 'flat') {
        discount = Math.min(couponInfo.value, subtotal);
      }
    }
  }

  // Calculate shipping cost (Free threshold ₹3,000)
  let shipping = 0;
  if (shippingMethod === 'express') {
    shipping = subtotal >= 3000 ? 50 : 149;
  } else {
    shipping = (subtotal >= 3000 || coupon === 'FREESHIP') ? 0 : 99;
  }

  const total = Math.max(0, subtotal - discount + shipping);

  // Generate BlueDart Express tracking number
  const trackingNumber = 'BD' + Math.floor(10000000 + Math.random() * 90000000);

  const order = await Order.create({
    user: userId,
    items: processedItems,
    address,
    subtotal,
    discount,
    coupon: coupon || null,
    shipping,
    shippingMethod: shippingMethod || 'standard',
    total,
    payment: payment || 'cod',
    paymentDetails: {
      razorpayOrderId: paymentDetails?.razorpayOrderId || null,
      razorpayPaymentId: paymentDetails?.razorpayPaymentId || null,
      status: payment === 'cod' ? 'pending_cod' : 'paid'
    },
    status: 'placed',
    trackingNumber,
    carrier: 'BlueDart Express Cold-Chain'
  });

  // Optionally persist shipping address to customer profile
  if (saveAddress && userId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        const hasAddress = user.addresses?.some(
          a => a.line1 === address.line1 && a.pincode === address.pincode
        );
        if (!hasAddress) {
          user.addresses.push({ ...address, isDefault: user.addresses.length === 0 });
          await user.save();
        }
      }
    } catch (saveErr) {
      console.warn('⚠️ Non-fatal: Failed to save address on checkout', saveErr);
    }
  }

  return order;
}

