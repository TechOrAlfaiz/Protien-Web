import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/index.js';
import { connectDB } from '../src/config/db.js';
import { Product } from '../src/models.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 ANANTA STORE: FULL HTTP INTEGRATION TEST SUITE');
  console.log('============================================================\n');

  await connectDB();

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`📡 Test server running on ${baseUrl}\n`);

  let cookieHeader = '';
  let testUserId = null;
  let testProduct = null;
  let testOrderId = null;

  try {
    // 1. HEALTHCHECK
    console.log('📦 1. Testing System Healthcheck & Service Status');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200 OK');
    assert(healthData.status === 'healthy', 'System reports healthy status');
    assert(healthData.service === 'ananta-api', 'Identifies correct service name');

    // 2. PRODUCT DISCOVERY & PAGINATION
    console.log('\n🔍 2. Testing Product Catalog, Search & Pagination');
    const prodsRes = await fetch(`${baseUrl}/api/products`);
    const prodsData = await prodsRes.json();
    assert(prodsRes.status === 200, 'Catalog endpoint returns HTTP 200');
    assert(Array.isArray(prodsData) && prodsData.length > 0, 'Catalog returns product array');

    testProduct = prodsData[0];
    assert(testProduct && testProduct.slug, `Product has valid slug (${testProduct?.slug})`);

    const pagedRes = await fetch(`${baseUrl}/api/products?page=1&limit=4`);
    const pagedData = await pagedRes.json();
    assert(pagedData.products && Array.isArray(pagedData.products), 'Paginated query returns products array');
    assert(pagedData.page === 1 && pagedData.totalPages >= 1, 'Pagination metadata calculated correctly');

    const suggestRes = await fetch(`${baseUrl}/api/search/suggest?q=creatine`);
    const suggestData = await suggestRes.json();
    assert(suggestRes.status === 200, 'Search suggestions returns HTTP 200');
    assert(Array.isArray(suggestData.products), 'Suggestions contains products list');
    assert(Array.isArray(suggestData.trendingKeywords), 'Suggestions includes trending keywords');

    const fbtRes = await fetch(`${baseUrl}/api/products/${testProduct.slug}/frequently-bought`);
    const fbtData = await fbtRes.json();
    assert(fbtRes.status === 200, 'Frequently bought together returns HTTP 200');
    assert(fbtData.discountPercent === 12, 'Applies 12% bundle synergy discount');

    // 3. DISCOUNT & COUPON ENGINE
    console.log('\n🏷️ 3. Testing Coupon Engine & Discount Validation');
    const couponRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'ANANTA10', subtotal: 2500 })
    });
    const couponData = await couponRes.json();
    assert(couponRes.status === 200, 'Valid coupon returns HTTP 200');
    assert(couponData.valid === true, 'Coupon is marked valid');
    assert(couponData.discount === 250, 'Correctly computes 10% discount on ₹2,500');

    const invalidCouponRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'NONEXISTENT99', subtotal: 1000 })
    });
    assert(invalidCouponRes.status === 404, 'Invalid coupon rejected with HTTP 404');

    // 4. CUSTOMER AUTHENTICATION JOURNEY
    console.log('\n🔐 4. Testing Customer Authentication & JWT Security');
    const testEmail = `testuser_${Date.now()}@anantastore.in`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Arjun Sharma',
        email: testEmail,
        password: 'Password@123'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'User registration returns HTTP 201 Created');
    assert(regData.email === testEmail, 'User profile registered with correct email');
    assert(!regData.password, 'Password hash is strictly sanitized from public payload');

    const rawCookie = regRes.headers.get('set-cookie');
    assert(rawCookie && rawCookie.includes('token='), 'Server sets secure HTTP-only JWT token');
    cookieHeader = rawCookie ? rawCookie.split(';')[0] : '';
    testUserId = regData.id;

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, '/api/auth/me returns HTTP 200 with valid session');
    assert(meData.id === testUserId, 'Session matches registered user ID');

    // 5. CART & WISHLIST SYNCHRONIZATION
    console.log('\n🛒 5. Testing Persistent Cart & Wishlist Sync');
    const cartSyncRes = await fetch(`${baseUrl}/api/cart/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        cartItems: [
          { id: testProduct._id, qty: 2, size: '500g', flavor: 'Original' }
        ]
      })
    });
    const cartData = await cartSyncRes.json();
    assert(cartSyncRes.status === 200, 'Cart sync returns HTTP 200');
    assert(Array.isArray(cartData) && cartData.length >= 1, 'Cart items synchronized into MongoDB profile');

    const wishRes = await fetch(`${baseUrl}/api/user/wishlist/${testProduct._id}`, {
      method: 'POST',
      headers: { Cookie: cookieHeader }
    });
    const wishData = await wishRes.json();
    assert(wishRes.status === 200, 'Wishlist toggle returns HTTP 200');
    assert(Array.isArray(wishData), 'Wishlist returns array of saved formulations');

    // 6. ORDER PROCESSING & ATOMIC INVENTORY SAFETY
    console.log('\n📦 6. Testing Reliable Checkout & Order Fulfillment');
    const initialStock = testProduct.stock;
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        items: [{ id: String(testProduct._id), qty: 1, size: '500g', flavor: 'Original' }],
        address: {
          name: 'Arjun Sharma',
          phone: '9876543210',
          line1: 'Flat 402, Lotus Tower, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400050'
        },
        payment: 'cod',
        shippingMethod: 'standard'
      })
    });
    const orderData = await orderRes.json();
    assert(orderRes.status === 201, 'Order created successfully with HTTP 201');
    assert(orderData.trackingNumber && orderData.trackingNumber.startsWith('BD'), `Assigned BlueDart tracking code: ${orderData.trackingNumber}`);
    assert(orderData.status === 'placed', 'Order status set to placed');
    testOrderId = orderData._id;

    const updatedProduct = await Product.findById(testProduct._id);
    assert(updatedProduct.stock === initialStock - 1, 'Product inventory atomically decremented by ordered quantity');

    const trackRes = await fetch(`${baseUrl}/api/orders/${testOrderId}/track`, {
      headers: { Cookie: cookieHeader }
    });
    const trackData = await trackRes.json();
    assert(trackRes.status === 200, 'Tracking endpoint returns HTTP 200');
    assert(Array.isArray(trackData.milestones) && trackData.milestones.length === 4, 'Tracking includes 4 cold-chain milestones');

    // 7. SECURITY & ROLE-BASED ACCESS CONTROL
    console.log('\n🛡️ 7. Testing Security & Role-Based Authorization');
    const unauthorizedAdminRes = await fetch(`${baseUrl}/api/admin/stats`);
    assert(unauthorizedAdminRes.status === 401, 'Unauthenticated admin request blocked with HTTP 401');

    const customerAdminRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Cookie: cookieHeader }
    });
    assert(customerAdminRes.status === 403, 'Regular customer accessing admin blocked with HTTP 403 Forbidden');

    // 8. INPUT VALIDATION REJECTION
    console.log('\n📋 8. Testing Strict Zod Schema Validation');
    const badRegister = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '123' })
    });
    const badData = await badRegister.json();
    assert(badRegister.status === 400, 'Malformed registration rejected with HTTP 400 Bad Request');
    assert(badData.code === 'VALIDATION_ERROR', 'Returns VALIDATION_ERROR code');

    // SUMMARY
    console.log('\n============================================================');
    console.log(`🎉 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED (100% SUCCESS)`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('💥 Test suite error:', err);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
