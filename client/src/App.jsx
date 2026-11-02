import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from './store';
import { api, fmt } from './api';
import { Art, icons, ErrorBoundary, Skeleton } from './ui';

// Code-split dynamic page chunks for high Core Web Vitals performance
const Home = lazy(() => import('./pages').then(m => ({ default: m.Home })));
const Shop = lazy(() => import('./pages').then(m => ({ default: m.Shop })));
const Product = lazy(() => import('./pages').then(m => ({ default: m.Product })));
const Checkout = lazy(() => import('./pages').then(m => ({ default: m.Checkout })));
const Login = lazy(() => import('./pages').then(m => ({ default: m.Login })));
const CartPage = lazy(() => import('./pages').then(m => ({ default: m.CartPage })));
const OrdersPage = lazy(() => import('./pages').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('./pages').then(m => ({ default: m.OrderDetailPage })));
const CustomerAccount = lazy(() => import('./pages').then(m => ({ default: m.CustomerAccount })));
const GuidesPage = lazy(() => import('./pages').then(m => ({ default: m.GuidesPage })));
const GuideDetailPage = lazy(() => import('./pages').then(m => ({ default: m.GuideDetailPage })));
const ComparePage = lazy(() => import('./pages').then(m => ({ default: m.ComparePage })));
const SupportContactPage = lazy(() => import('./pages').then(m => ({ default: m.SupportContactPage })));
const Admin = lazy(() => import('./admin'));

function PageFallbackLoader() {
  return (
    <div className="wrap page-fallback-loader" style={{ padding: '80px 0', minHeight: '60vh' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🌿</div>
        <Skeleton width="60%" height={28} style={{ margin: '0 auto 12px' }} />
        <Skeleton width="40%" height={16} style={{ margin: '0 auto 24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <Skeleton height={140} radius={12} />
          <Skeleton height={140} radius={12} />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ANNOUNCEMENT BAR
   ================================================================ */
function AnnouncementBar({ onClose, visible }) {
  return (
    <div className={'announce' + (visible ? '' : ' hidden')} role="banner">
      <span>
        🌿 Free shipping on orders above ₹3,000 &nbsp;·&nbsp;{' '}
        <Link to="/shop">Shop now</Link>
      </span>
      <button className="announce-close" onClick={onClose} aria-label="Close announcement">×</button>
    </div>
  );
}

/* ================================================================
   MEGA MENU
   ================================================================ */
const MEGA_CATEGORIES = [
  { label: 'Protein', sub: 'Whey, plant & blends', icon: '💪', color: '#6b3f2a', slug: 'Protein' },
  { label: 'Performance', sub: 'Creatine, pre-workout', icon: '⚡', color: '#1b2d4a', slug: 'Performance' },
  { label: 'Vitamins', sub: 'D3, B-complex, zinc', icon: '✨', color: '#2f4a36', slug: 'Vitamins' },
  { label: 'Ayurvedic', sub: 'Ashwagandha, triphala', icon: '🌿', color: '#2f4a36', slug: 'Ayurvedic' },
  { label: 'Beauty', sub: 'Collagen, biotin, skin', icon: '🌸', color: '#7a5a62', slug: 'Beauty' },
  { label: 'All Products', sub: 'Browse everything', icon: '🛍️', color: '#5a6b60', slug: '' },
];

const MEGA_GOALS = [
  { label: 'Sleep', icon: '🌙', slug: 'Sleep' },
  { label: 'Focus', icon: '🎯', slug: 'Focus' },
  { label: 'Recovery', icon: '🔄', slug: 'Recovery' },
  { label: 'Glow', icon: '✨', slug: 'Glow' },
  { label: 'Daily Wellness', icon: '🌅', slug: 'Daily' },
];

function MegaMenu({ open, onClose, featured }) {
  return (
    <div className={'mega-wrap' + (open ? ' open' : '')} onMouseLeave={onClose}>
      <div className="mega">
        <div className="mega-inner">
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <p className="mega-col-title">Shop by category</p>
                <div className="mega-links" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                  {MEGA_CATEGORIES.map(cat => (
                    <Link
                      key={cat.label}
                      className="mega-link"
                      to={cat.slug ? `/shop?category=${cat.slug}` : '/shop'}
                      onClick={onClose}
                    >
                      <span className="mega-link-icon" style={{ background: cat.color + '22' }}>{cat.icon}</span>
                      <span className="mega-link-text">
                        <strong>{cat.label}</strong>
                        <span>{cat.sub}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="mega-col-title">Shop by goal</p>
                <div className="mega-links" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                  {MEGA_GOALS.map(g => (
                    <Link key={g.label} className="mega-link" to={`/shop?goal=${g.slug}`} onClick={onClose}>
                      <span className="mega-link-icon" style={{ background: '#f0e8d822' }}>{g.icon}</span>
                      <span className="mega-link-text">
                        <strong>{g.label}</strong>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {featured && (
            <Link className="mega-featured" to={'/product/' + featured.slug} onClick={onClose}>
              <p className="mega-featured-label">Featured</p>
              <div className="mega-featured-img">
                <Art p={featured} />
              </div>
              <p className="mega-featured-name">{featured.name}</p>
              <p className="mega-featured-price">{fmt(featured.price)}</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SEARCH
   ================================================================ */
function SearchBar({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ products: [], categories: [], goals: [], trendingKeywords: [] });
  const inputRef = useRef();
  const wrapRef = useRef();

  useEffect(() => {
    const t = setTimeout(() => {
      api('/search/suggest?q=' + encodeURIComponent(query))
        .then(d => setSuggestions(d || { products: [], categories: [], goals: [], trendingKeywords: [] }))
        .catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else { setQuery(''); }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = slug => {
    setOpen(false);
    onNavigate('/product/' + slug);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && query.trim()) {
      setOpen(false);
      onNavigate('/shop?search=' + encodeURIComponent(query.trim()));
    }
  };

  const hasSuggestions = (suggestions.products?.length > 0) || (suggestions.categories?.length > 0) || (suggestions.trendingKeywords?.length > 0);

  return (
    <div className={'nav-search' + (open ? ' open' : '')} ref={wrapRef}>
      <input
        ref={inputRef}
        className="nav-search-input"
        type="search"
        placeholder="Search clinical formulations…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Search products"
      />
      <button className="nav-icon-btn" onClick={() => setOpen(o => !o)} aria-label="Toggle search">
        {icons.search}
      </button>

      {open && hasSuggestions && (
        <div className="search-suggestions enhanced">
          {/* Trending Searches when query is empty */}
          {!query.trim() && suggestions.trendingKeywords?.length > 0 && (
            <div>
              <div className="search-suggest-section-title">Trending Clinical Searches</div>
              <div className="search-trending-chips">
                {suggestions.trendingKeywords.map(kw => (
                  <button
                    key={kw}
                    type="button"
                    className="search-trending-chip"
                    onClick={() => {
                      setQuery(kw);
                      onNavigate('/shop?search=' + encodeURIComponent(kw));
                      setOpen(false);
                    }}
                  >
                    🔍 {kw}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Suggestions */}
          {query.trim() && suggestions.categories?.length > 0 && (
            <div>
              <div className="search-suggest-section-title">Categories</div>
              {suggestions.categories.map(cat => (
                <div
                  key={cat}
                  className="search-cat-row"
                  onClick={() => {
                    setOpen(false);
                    onNavigate('/shop?category=' + encodeURIComponent(cat));
                  }}
                >
                  <span>📁 In <strong>{cat}</strong></span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--mute)' }}>View Category →</span>
                </div>
              ))}
            </div>
          )}

          {/* Product Results */}
          {suggestions.products?.length > 0 && (
            <div>
              <div className="search-suggest-section-title">
                {query.trim() ? 'Matching Formulations' : 'Featured Formulations'}
              </div>
              {suggestions.products.map(p => (
                <div key={p._id || p.slug} className="search-suggestion" onClick={() => go(p.slug)}>
                  <div className="search-suggestion-img"><Art p={p} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="search-suggestion-name">{p.name}</div>
                    <div className="search-suggestion-cat">{p.category} {p.brand ? `· ${p.brand}` : ''}</div>
                  </div>
                  <div className="search-suggestion-price">{fmt(p.price)}</div>
                </div>
              ))}
            </div>
          )}

          {query.trim() && (
            <div
              style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', textAlign: 'center', background: 'var(--panel)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--forest)' }}
              onClick={() => {
                setOpen(false);
                onNavigate('/shop?search=' + encodeURIComponent(query.trim()));
              }}
            >
              See all results for "{query}" →
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   ACCOUNT DROPDOWN
   ================================================================ */
function AccountDropdown({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const nav = useNavigate();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = path => { setOpen(false); nav(path); };

  return (
    <div className="account-dropdown" ref={ref}>
      <button className="nav-icon-btn" onClick={() => setOpen(o => !o)} aria-label="Account menu" aria-expanded={open}>
        {icons.user}
      </button>
      <div className={'account-menu' + (open ? ' open' : '')}>
        {user ? (
          <>
            <div className="account-menu-header">
              <div className="account-menu-name">{user.name || 'My Account'}</div>
              <div className="account-menu-email">{user.email}</div>
            </div>
            <button className="account-menu-item" onClick={() => go('/account')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>Account Dashboard</span>
            </button>
            <button className="account-menu-item" onClick={() => go('/account?tab=orders')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span>My Orders & Tracking</span>
            </button>
            <button className="account-menu-item" onClick={() => go('/account?tab=addresses')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Address Book</span>
            </button>
            <button className="account-menu-item" onClick={() => go('/account?tab=wishlist')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>Saved Wishlist</span>
            </button>
            <button className="account-menu-item" onClick={() => go('/account?tab=settings')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Settings & Profile</span>
            </button>
            {user.role === 'admin' && (
              <button className="account-menu-item" onClick={() => go('/admin')}>
                {icons.settings}<span>Admin dashboard</span>
              </button>
            )}
            <button className="account-menu-item" onClick={onSignOut} style={{ color: '#c0392b' }}>
              {icons.logout}<span>Sign out</span>
            </button>
          </>
        ) : (
          <>
            <button className="account-menu-item" onClick={() => go('/login')}>
              {icons.user}<span>Sign in</span>
            </button>
            <button className="account-menu-item" onClick={() => go('/login')}>
              {icons.user}<span>Create account</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   CART DRAWER (PHASE 6 ENHANCED)
   ================================================================ */
function CartDrawer() {
  const {
    cart, setQty, removeItem, saveForLater, savedForLater, moveToBag,
    subtotal, appliedCoupon, applyCoupon, removeCoupon, couponDiscount,
    shippingCost, finalTotal, cartOpen, setCartOpen
  } = useApp();
  const nav = useNavigate();
  const FREE_THRESHOLD = 3000;
  const left = FREE_THRESHOLD - subtotal;
  const [couponInput, setCouponInput] = useState('');
  const [couponErr, setCouponErr] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const k = e => e.key === 'Escape' && setCartOpen(false);
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [setCartOpen]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponErr('');
    setCouponBusy(true);
    try {
      await applyCoupon(couponInput);
      setCouponInput('');
    } catch (err) {
      setCouponErr(err.message || 'Invalid coupon');
    } finally {
      setCouponBusy(false);
    }
  };

  return (
    <>
      <div className={'cart-scrim' + (cartOpen ? ' open' : '')} onClick={() => setCartOpen(false)} />
      <aside className={'cart-drawer' + (cartOpen ? ' open' : '')} role="dialog" aria-label="Shopping bag" aria-modal="true">
        <div className="cart-header">
          <h3>Your Bag <span style={{ fontSize: 14, fontFamily: 'var(--sans)', color: 'var(--mute)', fontWeight: 500 }}>
            ({cart.reduce((a, i) => a + i.qty, 0)} {cart.reduce((a, i) => a + i.qty, 0) === 1 ? 'item' : 'items'})
          </span></h3>
          <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close bag">
            {icons.x}
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛍️</div>
            <p style={{ fontWeight: 500, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>Your bag is currently empty</p>
            <p style={{ color: 'var(--mute)', fontSize: 13, marginBottom: 20 }}>Explore our lab-verified botanical and clinical formulations.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setCartOpen(false); nav('/shop'); }}>
              Explore Collection
            </button>
            {savedForLater?.length > 0 && (
              <div style={{ marginTop: 32, textAlign: 'left', width: '100%', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <div style={{ font: '600 13px var(--sans)', marginBottom: 12, color: 'var(--ink)' }}>Saved for Later ({savedForLater.length})</div>
                {savedForLater.map(s => (
                  <div key={s.uniqueId || s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, background: 'var(--panel)', borderRadius: 6, display: 'grid', placeItems: 'center' }}>
                      <Art p={s} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{fmt(s.price)}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => moveToBag(s.uniqueId || s.id)}>
                      Move to Bag
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="cart-drawer-scroll-body">
            {/* Free Shipping Tier Banner */}
            <div className="cart-shipping">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                {left > 0 ? (
                  <span>Add <strong>{fmt(left)}</strong> more for <strong style={{ color: 'var(--gold)' }}>Free Shipping</strong></span>
                ) : (
                  <span style={{ color: '#1a6b3a', fontWeight: 600 }}>✓ Free Express Shipping Unlocked!</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--mute)' }}>₹3,000 Threshold</span>
              </div>
              <div className="cart-ship-bar">
                <div className="cart-ship-bar-fill" style={{ width: Math.min(100, (subtotal / FREE_THRESHOLD) * 100) + '%' }} />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="cart-items">
              {cart.map(i => {
                const itemKey = i.uniqueId || i.id;
                return (
                  <div className="cart-item" key={itemKey}>
                    <div className="cart-item-img">
                      <Art p={i} />
                    </div>
                    <div className="cart-item-body">
                      <div className="cart-item-name">{i.name}</div>
                      {(i.size || i.flavor) && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '3px 0 6px' }}>
                          {i.size && <span style={{ font: '500 11px var(--sans)', background: 'var(--panel)', padding: '2px 7px', borderRadius: 4, color: 'var(--mute)' }}>{i.size}</span>}
                          {i.flavor && <span style={{ font: '500 11px var(--sans)', background: 'var(--panel)', padding: '2px 7px', borderRadius: 4, color: 'var(--mute)' }}>{i.flavor}</span>}
                        </div>
                      )}
                      <div className="cart-item-price">{fmt(i.price * i.qty)}</div>
                      <div className="cart-item-qty">
                        <button className="cart-qty-btn" onClick={() => setQty(itemKey, i.qty - 1)} aria-label="Decrease quantity">−</button>
                        <span className="cart-qty-num">{i.qty}</span>
                        <button className="cart-qty-btn" onClick={() => setQty(itemKey, i.qty + 1)} aria-label="Increase quantity">+</button>

                        <button
                          onClick={() => saveForLater(itemKey)}
                          style={{ marginLeft: 'auto', color: 'var(--mute)', fontSize: 12, textDecoration: 'underline' }}
                          title="Save this item for later"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => removeItem(itemKey)}
                          style={{ marginLeft: 8, color: '#c0392b', fontSize: 12 }}
                          aria-label="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Saved For Later Accordion inside Drawer if any */}
            {savedForLater?.length > 0 && (
              <div style={{ margin: '12px 16px', padding: '12px', background: 'var(--panel)', borderRadius: 'var(--r-sm)' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  onClick={() => setShowSaved(!showSaved)}
                >
                  <span>Saved for Later ({savedForLater.length})</span>
                  <span>{showSaved ? '▲' : '▼'}</span>
                </div>
                {showSaved && (
                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                    {savedForLater.map(s => (
                      <div key={s.uniqueId || s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--white)', padding: 8, borderRadius: 6 }}>
                        <div style={{ width: 36, height: 36, display: 'grid', placeItems: 'center' }}><Art p={s} /></div>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(s.price)}</div>
                        </div>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => moveToBag(s.uniqueId || s.id)}>
                          Move to Bag
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* In-Drawer Quick Coupon Field */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', background: '#faf8f5' }}>
              {appliedCoupon ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eef7f0', border: '1px solid #cce8d2', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🏷️</span>
                    <div>
                      <span style={{ font: '700 12px var(--mono)', color: '#1a6b3a' }}>{appliedCoupon.code}</span>
                      <span style={{ fontSize: 12, color: '#1a6b3a', marginLeft: 6 }}>— Save {fmt(couponDiscount)}</span>
                    </div>
                  </div>
                  <button onClick={removeCoupon} style={{ color: '#1a6b3a', fontWeight: 'bold', fontSize: 13 }} title="Remove coupon">✕</button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Promo code (e.g. ANANTA10)"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    style={{ flex: 1, padding: '7px 12px', fontSize: 12, border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--white)', textTransform: 'uppercase' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={couponBusy || !couponInput.trim()} style={{ fontSize: 12, padding: '7px 12px' }}>
                    {couponBusy ? '…' : 'Apply'}
                  </button>
                </form>
              )}
              {couponErr && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>{couponErr}</div>}
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <div className="cart-footer">
            <div style={{ display: 'grid', gap: 6, marginBottom: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)' }}>
                <span>Subtotal</span>
                <span style={{ color: 'var(--ink)' }}>{fmt(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1a6b3a' }}>
                  <span>Coupon Savings</span>
                  <span>−{fmt(couponDiscount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)' }}>
                <span>Standard Delivery</span>
                <span>{shippingCost === 0 ? <strong style={{ color: '#1a6b3a' }}>FREE</strong> : fmt(shippingCost)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--line)', marginTop: 4 }}>
                <span style={{ font: '600 15px var(--sans)', color: 'var(--ink)' }}>Total</span>
                <strong style={{ font: '600 22px var(--serif)', color: 'var(--ink)' }}>{fmt(finalTotal)}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setCartOpen(false); nav('/cart'); }}
                style={{ padding: '12px 14px', fontSize: 13 }}
              >
                View Full Bag
              </button>
              <Link
                className="btn btn-primary"
                to="/checkout"
                onClick={() => setCartOpen(false)}
                style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', display: 'grid', placeItems: 'center' }}
              >
                Checkout →
              </Link>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11.5, color: 'var(--mute)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span>🔒 256-Bit SSL Encrypted</span>
              <span>·</span>
              <span>Fast Dispatch</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

/* ================================================================
   MOBILE NAV DRAWER
   ================================================================ */
function MobileNav({ open, onClose, user, onSignOut }) {
  const nav = useNavigate();
  const go = path => { onClose(); nav(path); };

  return (
    <>
      <div className={'scrim' + (open ? ' open' : '')} onClick={onClose} />
      <nav className={'mobile-nav' + (open ? ' open' : '')} aria-label="Mobile navigation">
        <Link className="mobile-nav-logo" to="/" onClick={onClose}>Ananta</Link>

        <div className="mobile-nav-section">
          <h4>Shop</h4>
          {[
            { label: 'All Products', path: '/shop' },
            { label: 'Protein', path: '/shop?category=Protein' },
            { label: 'Performance', path: '/shop?category=Performance' },
            { label: 'Vitamins', path: '/shop?category=Vitamins' },
            { label: 'Ayurvedic', path: '/shop?category=Ayurvedic' },
            { label: 'Beauty', path: '/shop?category=Beauty' },
          ].map(item => (
            <button key={item.label} className="mobile-nav-link" onClick={() => go(item.path)}>
              {item.label} {icons.chevronRight}
            </button>
          ))}
        </div>

        <div className="mobile-nav-section">
          <h4>Goals</h4>
          {[
            { label: 'Better Sleep', path: '/shop?goal=Sleep' },
            { label: 'Focus & Clarity', path: '/shop?goal=Focus' },
            { label: 'Recovery', path: '/shop?goal=Recovery' },
            { label: 'Skin & Glow', path: '/shop?goal=Glow' },
          ].map(item => (
            <button key={item.label} className="mobile-nav-link" onClick={() => go(item.path)}>
              {item.label} {icons.chevronRight}
            </button>
          ))}
        </div>

        {user && (
          <div className="mobile-nav-section">
            <h4>Account</h4>
            <button className="mobile-nav-link" onClick={() => go('/orders')}>
              My Orders & Tracking {icons.chevronRight}
            </button>
            <button className="mobile-nav-link" onClick={() => go('/cart')}>
              Full Shopping Bag {icons.chevronRight}
            </button>
          </div>
        )}

        {user?.role === 'admin' && (
          <div className="mobile-nav-section">
            <button className="mobile-nav-link" onClick={() => go('/admin')}>
              Admin Dashboard {icons.chevronRight}
            </button>
          </div>
        )}

        <div className="mobile-nav-section">
          <h4>Resources & Support</h4>
          <button className="mobile-nav-link" onClick={() => go('/guides')}>
            Clinical Shopping Guides {icons.chevronRight}
          </button>
          <button className="mobile-nav-link" onClick={() => go('/compare')}>
            Compare Formulations {icons.chevronRight}
          </button>
          <button className="mobile-nav-link" onClick={() => go('/support')}>
            Customer Support & WhatsApp {icons.chevronRight}
          </button>
        </div>

        <div className="mobile-nav-actions">
          {user ? (
            <button className="btn btn-secondary" onClick={() => { onSignOut(); onClose(); }} style={{ flex: 1 }}>
              Sign out
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => go('/login')} style={{ flex: 1 }}>
                Sign in
              </button>
              <button className="btn btn-primary" onClick={() => go('/login')} style={{ flex: 1 }}>
                Register
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

/* ================================================================
   NAVBAR
   ================================================================ */
function Navbar({ announceVisible }) {
  const { count, wishCount, setCartOpen, user, setUser } = useApp();
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featured, setFeatured] = useState(null);
  const megaTimer = useRef();

  useEffect(() => {
    api('/products?sort=r').then(d => setFeatured(d[0])).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navTop = announceVisible ? 'var(--announce-h)' : '0px';

  const openMega = () => {
    clearTimeout(megaTimer.current);
    setMegaOpen(true);
  };
  const closeMega = () => {
    megaTimer.current = setTimeout(() => setMegaOpen(false), 120);
  };

  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    nav('/');
  };

  return (
    <>
      <header
        className={'navbar' + (scrolled ? ' scrolled' : '')}
        style={{ top: navTop }}
      >
        <div className="wrap navbar-inner">
          {/* Logo */}
          <Link className="nav-logo" to="/">Ananta</Link>

          {/* Desktop links */}
          <div className="nav-links">
            <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/shop">
              Shop
            </NavLink>
            <button
              className={'nav-link' + (megaOpen ? ' active' : '')}
              onMouseEnter={openMega}
              onMouseLeave={closeMega}
              onClick={() => setMegaOpen(o => !o)}
            >
              Categories {icons.chevronDown}
            </button>
            <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/guides">
              Guides
            </NavLink>
            <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/compare">
              Compare
            </NavLink>
            <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/support">
              Support
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/admin">
                Admin
              </NavLink>
            )}
          </div>

          {/* Right actions */}
          <div className="nav-actions">
            <SearchBar onNavigate={nav} />

            <button
              className="nav-icon-btn"
              onClick={() => nav('/shop?wishlist=1')}
              aria-label={`Wishlist (${wishCount} items)`}
              title="Wishlist"
            >
              {icons.heart}
              {wishCount > 0 && <span className="nav-badge">{wishCount}</span>}
            </button>

            <button
              className="nav-icon-btn"
              onClick={() => setCartOpen(true)}
              aria-label={`Shopping bag (${count} items)`}
            >
              {icons.bag}
              {count > 0 && <span className="nav-badge">{count}</span>}
            </button>

            <AccountDropdown user={user} onSignOut={signOut} />

            {/* Hamburger */}
            <button
              className={'hamburger' + (mobileOpen ? ' open' : '')}
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* Mega menu */}
      <div
        onMouseEnter={openMega}
        onMouseLeave={closeMega}
        style={{ position: 'fixed', top: `calc(${navTop} + var(--nav-h))`, left: 0, right: 0, zIndex: 98 }}
      >
        <MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} featured={featured} />
      </div>

      {/* Mobile nav */}
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        user={user}
        onSignOut={signOut}
      />
    </>
  );
}

/* ================================================================
   FOOTER (PREMIUM MULTI-COLUMN)
   ================================================================ */
function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="wrap">
        <div className="footer-grid" style={{ gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 36 }}>
          {/* Brand & Certifications */}
          <div className="footer-brand">
            <Link className="footer-logo" to="/">Ananta</Link>
            <p className="footer-tagline">
              Considered human nutrition. Formulated strictly with evidence-based dosages, zero proprietary mystery blends, and third-party laboratory verification published openly for every production batch.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(245,240,232,.08)', border: '1px solid rgba(245,240,232,.12)', borderRadius: 4, padding: '4px 10px', fontSize: 11, letterSpacing: '.06em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600 }}>
                ✓ FSSAI Lic. 11521018000412
              </span>
              <span style={{ background: 'rgba(245,240,232,.08)', border: '1px solid rgba(245,240,232,.12)', borderRadius: 4, padding: '4px 10px', fontSize: 11, letterSpacing: '.06em', color: 'var(--cream)', textTransform: 'uppercase', opacity: .8 }}>
                NABL Accredited Tested
              </span>
              <span style={{ background: 'rgba(245,240,232,.08)', border: '1px solid rgba(245,240,232,.12)', borderRadius: 4, padding: '4px 10px', fontSize: 11, letterSpacing: '.06em', color: 'var(--cream)', textTransform: 'uppercase', opacity: .8 }}>
                cGMP Certified
              </span>
            </div>
            <p className="footer-fssai" style={{ marginTop: 16 }}>
              CIN: U24239MH2024PTC392811 · 100% Recyclable Packaging
            </p>
          </div>

          {/* Col 1: Formulations */}
          <div className="footer-col">
            <h4>Formulations</h4>
            <Link to="/shop?category=Protein">Protein Isolates</Link>
            <Link to="/shop?category=Performance">Performance & Creatine</Link>
            <Link to="/shop?category=Vitamins">Chelated Minerals</Link>
            <Link to="/shop?category=Ayurvedic">Ayurvedic Botanicals</Link>
            <Link to="/shop?category=Beauty">Marine Collagen</Link>
            <Link to="/shop">View All Products</Link>
          </div>

          {/* Col 2: Protocols */}
          <div className="footer-col">
            <h4>Protocols</h4>
            <Link to="/shop?goal=Sleep">Circadian & Sleep</Link>
            <Link to="/shop?goal=Focus">Neuro & Cognitive</Link>
            <Link to="/shop?goal=Recovery">Muscle Recovery</Link>
            <Link to="/shop?goal=Glow">Dermal Radiance</Link>
            <Link to="/shop?goal=Daily">Daily Foundations</Link>
            <a href="#bundles">Synergy Stacks</a>
          </div>

          {/* Col 3: Quality & Science */}
          <div className="footer-col">
            <h4>Transparency</h4>
            <a href="#transparency">Batch COA Lookup</a>
            <a href="#transparency">Heavy Metals Testing</a>
            <a href="#articles">Nutrition Science</a>
            <a href="#transparency">Cold-Chain Logistics</a>
            <a href="#spotlight">Purity Standards</a>
            <a href="#">Sourcing Registry</a>
          </div>

          {/* Col 4: Support & Service */}
          <div className="footer-col">
            <h4>Client Care</h4>
            <a href="#">Track Shipment</a>
            <a href="#">Shipping & Delivery</a>
            <a href="#">30-Day Return Policy</a>
            <a href="#">Contact Formulation Team</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Ananta Health Pvt. Ltd. All rights reserved. Formulated in India.</p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: 'rgba(245,240,232,.45)' }}>
            <span>Secure 256-Bit SSL Encryption</span>
            <span>·</span>
            <span>UPI / Cards / NetBanking / COD</span>
            <span>·</span>
            <span style={{ color: 'var(--gold)' }}>Made with care in India 🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   APP ROOT
   ================================================================ */
export default function App() {
  const { pathname } = useLocation();
  const [announceVisible, setAnnounceVisible] = useState(true);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const isAdminPage = pathname.startsWith('/admin');

  return (
    <>
      <AnnouncementBar visible={announceVisible} onClose={() => setAnnounceVisible(false)} />
      <Navbar announceVisible={announceVisible} />

      <div className={'page-push' + (announceVisible ? '' : ' no-announce')}>
        <main id="main-content" key={pathname} className="page-transition">
          <ErrorBoundary>
            <Suspense fallback={<PageFallbackLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:slug" element={<Product />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/order/:id" element={<OrderDetailPage />} />
                <Route path="/account" element={<CustomerAccount />} />
                <Route path="/guides" element={<GuidesPage />} />
                <Route path="/guide/:slug" element={<GuideDetailPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/support" element={<SupportContactPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={
                  <div style={{ padding: '120px 0', textAlign: 'center' }}>
                    <div className="wrap">
                      <h1 style={{ font: '400 64px/1 var(--serif)', marginBottom: 24 }}>404</h1>
                      <p style={{ color: 'var(--mute)', marginBottom: 32 }}>This page does not exist.</p>
                      <Link className="btn btn-primary" to="/shop">Go to the shop</Link>
                    </div>
                  </div>
                } />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <Footer />
      <CartDrawer />
    </>
  );
}
