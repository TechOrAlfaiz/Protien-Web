import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const Ctx = createContext();
export const useApp = () => useContext(Ctx);

export function Provider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; }
  });
  const [savedForLater, setSavedForLater] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedForLater')) || []; } catch { return []; }
  });
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wishlist')) || []; } catch { return []; }
  });
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try { return JSON.parse(localStorage.getItem('appliedCoupon')) || null; } catch { return null; }
  });
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [shippingAddress, setShippingAddress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shippingAddress')) || {
        name: '', phone: '', line1: '', city: 'Mumbai', state: 'Maharashtra', pincode: '400001'
      };
    } catch {
      return { name: '', phone: '', line1: '', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' };
    }
  });

  const [user, setUser] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentlyViewed')) || []; } catch { return []; }
  });
  const [recommendationConsent, setRecommendationConsent] = useState(() => {
    try {
      const v = localStorage.getItem('recommendationConsent');
      return v !== null ? JSON.parse(v) : true;
    } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed)); } catch {}
  }, [recentlyViewed]);

  useEffect(() => {
    try { localStorage.setItem('recommendationConsent', JSON.stringify(recommendationConsent)); } catch {}
  }, [recommendationConsent]);

  useEffect(() => {
    try { localStorage.setItem('cart', JSON.stringify(cart)); } catch {}
    if (user && cart.length > 0) {
      api('/cart', { method: 'PUT', body: { items: cart } }).catch(() => {});
    }
  }, [cart, user]);

  useEffect(() => {
    try { localStorage.setItem('savedForLater', JSON.stringify(savedForLater)); } catch {}
  }, [savedForLater]);

  useEffect(() => {
    try { localStorage.setItem('wishlist', JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);

  useEffect(() => {
    try { localStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon)); } catch {}
  }, [appliedCoupon]);

  useEffect(() => {
    try { localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress)); } catch {}
  }, [shippingAddress]);

  useEffect(() => {
    api('/auth/me').then(async (u) => {
      setUser(u);
      if (u) {
        if (typeof u.recommendationConsent === 'boolean') {
          setRecommendationConsent(u.recommendationConsent);
        }
        if (u.addresses?.length > 0) {
          const def = u.addresses.find(a => a.isDefault) || u.addresses[0];
          setShippingAddress(def);
        }
        // Sync cart with backend
        try {
          const guestItems = JSON.parse(localStorage.getItem('cart') || '[]');
          const mergedCart = await api('/cart/sync', { method: 'POST', body: { items: guestItems } });
          if (mergedCart?.length > 0) setCart(mergedCart);
        } catch {}
        // Sync wishlist with backend
        try {
          const guestWish = JSON.parse(localStorage.getItem('wishlist') || '[]');
          const pids = guestWish.map(w => w.id || w._id).filter(Boolean);
          const mergedWish = await api('/user/wishlist/sync', { method: 'POST', body: { productIds: pids } });
          if (mergedWish?.length > 0) {
            setWishlist(mergedWish.map(p => ({
              id: p._id || p.id,
              slug: p.slug,
              name: p.name,
              price: p.price,
              type: p.type,
              color: p.color,
              image: p.image
            })));
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // Backwards compatibility alias
  const setOpen = setCartOpen;
  const open = cartOpen;

  // Add product with optional variant config
  const add = (p, qty = 1, options = {}) => {
    const size = options.size || p.size || 'Standard';
    const flavor = options.flavor || p.flavor || 'Original';
    let unitPrice = options.price || p.price;

    if (!options.price && options.size) {
      if (options.size.includes('250g') || options.size.includes('30')) unitPrice = Math.round(p.price * 0.55);
      else if (options.size.includes('1kg') || options.size.includes('120')) unitPrice = Math.round(p.price * 1.85);
      else if (options.size.includes('2kg') || options.size.includes('180')) unitPrice = Math.round(p.price * 2.5);
    }

    const uniqueId = `${p._id || p.id}_${size}_${flavor}`;

    setCart(c => {
      const existing = c.find(x => x.uniqueId === uniqueId || (x.id === (p._id || p.id) && x.size === size && x.flavor === flavor));
      if (existing) {
        return c.map(x => x === existing ? { ...x, qty: Math.min(10, x.qty + qty) } : x);
      }
      return [
        ...c,
        {
          uniqueId,
          id: p._id || p.id,
          slug: p.slug,
          name: p.name,
          price: unitPrice,
          originalPrice: p.price,
          type: p.type,
          color: p.color,
          image: p.image,
          size,
          flavor,
          stock: p.stock ?? 50,
          qty
        }
      ];
    });

    setCartOpen(true);
  };

  const setQty = (uniqueIdOrId, q) => {
    setCart(c =>
      q < 1
        ? c.filter(x => x.uniqueId !== uniqueIdOrId && x.id !== uniqueIdOrId)
        : c.map(x => (x.uniqueId === uniqueIdOrId || x.id === uniqueIdOrId) ? { ...x, qty: Math.min(10, q) } : x)
    );
  };

  const removeItem = (uniqueIdOrId) => {
    setCart(c => c.filter(x => x.uniqueId !== uniqueIdOrId && x.id !== uniqueIdOrId));
  };

  // Save for later
  const saveForLater = (uniqueIdOrId) => {
    const item = cart.find(x => x.uniqueId === uniqueIdOrId || x.id === uniqueIdOrId);
    if (!item) return;
    setCart(c => c.filter(x => x.uniqueId !== uniqueIdOrId && x.id !== uniqueIdOrId));
    setSavedForLater(s => {
      const match = s.find(x => x.uniqueId === item.uniqueId);
      return match ? s : [...s, item];
    });
  };

  const moveToBag = (uniqueIdOrId) => {
    const item = savedForLater.find(x => x.uniqueId === uniqueIdOrId || x.id === uniqueIdOrId);
    if (!item) return;
    setSavedForLater(s => s.filter(x => x.uniqueId !== uniqueIdOrId && x.id !== uniqueIdOrId));
    setCart(c => {
      const match = c.find(x => x.uniqueId === item.uniqueId);
      return match ? c.map(x => x === match ? { ...x, qty: Math.min(10, x.qty + 1) } : x) : [...c, item];
    });
  };

  const removeSaved = (uniqueIdOrId) => {
    setSavedForLater(s => s.filter(x => x.uniqueId !== uniqueIdOrId && x.id !== uniqueIdOrId));
  };

  // Coupons
  const applyCoupon = async (codeStr) => {
    if (!codeStr || !codeStr.trim()) throw new Error('Please enter a coupon code.');
    const code = codeStr.toUpperCase().trim();

    try {
      const res = await api('/coupons/validate', {
        method: 'POST',
        body: { code, subtotal }
      });
      setAppliedCoupon(res);
      return res;
    } catch (err) {
      // Fallback offline validation
      const coupons = {
        'ANANTA10': { type: 'percent', value: 10, maxDiscount: 500, minOrder: 0, description: '10% off storewide up to ₹500' },
        'WELLNESS20': { type: 'percent', value: 20, maxDiscount: 1000, minOrder: 2499, description: '20% off on orders above ₹2,499' },
        'FIRST500': { type: 'flat', value: 500, minOrder: 2999, description: 'Flat ₹500 off on orders above ₹2,999' },
        'FREESHIP': { type: 'shipping', value: 99, minOrder: 0, description: 'Free express shipping on your order' }
      };
      const found = coupons[code];
      if (!found) throw new Error('Invalid coupon code. Try ANANTA10, WELLNESS20, or FIRST500.');
      if (subtotal < found.minOrder) {
        throw new Error(`Requires minimum order of ₹${found.minOrder.toLocaleString('en-IN')}`);
      }
      let discount = 0;
      if (found.type === 'percent') discount = Math.min(found.maxDiscount, Math.round(subtotal * (found.value / 100)));
      else if (found.type === 'flat') discount = Math.min(found.value, subtotal);
      else if (found.type === 'shipping') discount = 99;

      const obj = { valid: true, code, discount, type: found.type, description: found.description };
      setAppliedCoupon(obj);
      return obj;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Wishlist
  const toggleWishlist = (p) => {
    const pid = p._id || p.id;
    setWishlist(w =>
      w.find(x => (x._id || x.id) === pid)
        ? w.filter(x => (x._id || x.id) !== pid)
        : [...w, { id: pid, _id: pid, slug: p.slug, name: p.name, price: p.price, type: p.type, color: p.color, image: p.image }]
    );
    if (user && pid) {
      api(`/user/wishlist/${pid}`, { method: 'POST' }).catch(() => {});
    }
  };

  const inWishlist = (id) => wishlist.some(x => (x._id || x.id) === id);

  // Recently Viewed & Personalization Consent
  const addRecentlyViewed = (p) => {
    if (!p) return;
    const pid = p._id || p.id;
    setRecentlyViewed(prev => {
      const filtered = prev.filter(x => (x._id || x.id) !== pid);
      return [{ id: pid, _id: pid, slug: p.slug, name: p.name, price: p.price, category: p.category, image: p.image }, ...filtered].slice(0, 10);
    });
    if (user && pid) {
      api(`/user/recently-viewed/${pid}`, { method: 'POST' }).catch(() => {});
    }
  };

  const updateConsent = async (val) => {
    setRecommendationConsent(val);
    if (user) {
      try { await api('/user/consent', { method: 'PUT', body: { recommendationConsent: val } }); } catch {}
    }
  };

  // Compare
  const toggleCompare = (p) => {
    setCompareList(list => {
      const match = list.find(x => (p._id && x._id === p._id) || (p.slug && x.slug === p.slug));
      if (match) {
        return list.filter(x => (p._id ? x._id !== p._id : true) && (p.slug ? x.slug !== p.slug : true));
      }
      if (list.length >= 4) {
        alert('You can compare a maximum of 4 products at a time.');
        return list;
      }
      return [...list, p];
    });
  };

  const inCompare = (id, slug) => compareList.some(x => (id && x._id === id) || (slug && x.slug === slug));
  const clearCompare = () => setCompareList([]);

  // Subtotal & Counts
  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const count = cart.reduce((a, i) => a + i.qty, 0);
  const wishCount = wishlist.length;

  // Coupon discount calculation
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      couponDiscount = Math.min(appliedCoupon.discount || 500, Math.round(subtotal * 0.1));
    } else if (appliedCoupon.type === 'flat') {
      couponDiscount = Math.min(appliedCoupon.discount || 500, subtotal);
    }
  }

  // Shipping cost
  let shippingCost = 0;
  if (shippingMethod === 'express') {
    shippingCost = subtotal >= 3000 ? 50 : 149;
  } else {
    shippingCost = (subtotal >= 3000 || appliedCoupon?.code === 'FREESHIP') ? 0 : 99;
  }

  const finalTotal = Math.max(0, subtotal - couponDiscount + shippingCost);

  const signOut = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    setUser(null);
  };

  return (
    <Ctx.Provider value={{
      cart, add, setQty, removeItem,
      clear: () => { setCart([]); setAppliedCoupon(null); },
      subtotal, count,
      savedForLater, saveForLater, moveToBag, removeSaved,
      appliedCoupon, applyCoupon, removeCoupon, couponDiscount,
      shippingMethod, setShippingMethod, shippingCost,
      shippingAddress, setShippingAddress,
      finalTotal,
      wishlist, toggleWishlist, inWishlist, wishCount,
      compareList, toggleCompare, inCompare, clearCompare,
      recentlyViewed, addRecentlyViewed,
      recommendationConsent, updateConsent,
      user, setUser, signOut,
      open, setOpen,
      cartOpen, setCartOpen,
    }}>
      {children}
    </Ctx.Provider>
  );
}
