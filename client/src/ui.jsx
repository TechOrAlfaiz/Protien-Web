import React, { Component, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmt } from './api';
import { useApp } from './store';

/* ------------------------------------------------------------------ */
/* Production Error Boundary Component (Phase 12)                      */
/* ------------------------------------------------------------------ */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 Ananta UI Caught Exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrap" role="alert">
          <div className="error-boundary-card">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
            <h2 style={{ font: '400 32px var(--serif)', marginBottom: 12, color: 'var(--ink)' }}>
              Something unexpected occurred
            </h2>
            <p style={{ color: 'var(--mute)', fontSize: 14.5, marginBottom: 24, maxWidth: 440, margin: '0 auto 24px' }}>
              We encountered an issue while rendering this formulation view. Our automated diagnostic logging has captured this event.
            </p>
            {this.state.error && (
              <pre className="error-boundary-debug">
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try Again
              </button>
              <button
                className="btn btn-secondary"
                onClick={this.handleReset}
              >
                Return to Storefront
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Dynamic SEO & Open Graph Hook (Phase 12)                           */
/* ------------------------------------------------------------------ */
export function useSeo({ title, description, image, url, jsonLd }) {
  useEffect(() => {
    const defaultTitle = 'Ananta — Pure Botanical & Clinical Nutrition';
    document.title = title ? `${title} | Ananta` : defaultTitle;

    const setMeta = (name, content, attr = 'name') => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, 'property');
      setMeta('twitter:description', description);
    }
    if (title) {
      setMeta('og:title', `${title} | Ananta`, 'property');
      setMeta('twitter:title', `${title} | Ananta`);
    }
    if (image) {
      setMeta('og:image', image, 'property');
      setMeta('twitter:image', image);
    }
    if (url) {
      setMeta('og:url', url, 'property');
    }

    let scriptEl = null;
    if (jsonLd) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(scriptEl);
    }

    return () => {
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
  }, [title, description, image, url, jsonLd]);
}

/* ------------------------------------------------------------------ */
/* Product Artwork – SVG placeholder or real image                     */
/* ------------------------------------------------------------------ */
export function Art({ p }) {
  if (!p) return null;
  if (p.image) return <img src={p.image} alt={p.name} loading="lazy" />;
  const dark = c => (c && c[0] === '#' ? '#1b1b1b' : c || '#222');
  const shape = f => p.type === 'tub'
    ? <><rect x="14" y="52" width="92" height="98" rx="8" fill={f} /><rect x="10" y="30" width="100" height="26" rx="5" fill={dark(f)} /></>
    : p.type === 'bottle'
      ? <><rect x="40" y="12" width="40" height="22" rx="3" fill={dark(f)} /><rect x="30" y="32" width="60" height="118" rx="14" fill={f} /></>
      : <><path d="M24 24h72l8 126H16z" fill={f} /><rect x="22" y="16" width="76" height="12" fill={dark(f)} /></>;
  const ly = p.type === 'tub' ? 78 : 66, w = p.type === 'bottle' ? 44 : 56, [a, ...b] = (p.name || 'Product').split(' ');
  return (
    <svg viewBox="0 0 120 160" aria-hidden="true">
      {shape(p.color || '#3e5a48')}{shape('url(#sh)')}
      <rect x={60 - w / 2} y={ly} width={w} height="50" rx="2" fill="#f3efe5" opacity=".94" />
      <text x="60" y={ly + 13} textAnchor="middle" fontSize="5" letterSpacing="1.4" fill="#10221D" fontFamily="sans-serif">ANANTA</text>
      <text x="60" y={ly + 28} textAnchor="middle" fontSize="8.5" fill="#10221D" fontFamily="Georgia,serif">{a}</text>
      <text x="60" y={ly + 39} textAnchor="middle" fontSize="7" fill="#10221D" fontFamily="Georgia,serif" fontStyle="italic">{b[0] || ''}</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll-reveal wrapper (Enhanced for Phase 10)                        */
/* ------------------------------------------------------------------ */
export function Reveal({ children, className = '', delay = 0, direction = 'up', threshold = 0.1 }) {
  const ref = useRef();
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (delay) el.style.transitionDelay = delay + 'ms';
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        el.classList.add('in');
        io.disconnect();
      }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [delay, threshold]);

  const dirClass = direction === 'left' ? 'rv-left' : direction === 'right' ? 'rv-right' : direction === 'zoom' ? 'rv-zoom' : 'rv-up';
  return (
    <div ref={ref} className={`rv ${dirClass} ${inView ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phase 10 Skeleton Loaders                                            */
/* ------------------------------------------------------------------ */
export function Skeleton({ width = '100%', height = 20, radius = 6, className = '', style = {} }) {
  return (
    <div
      className={'skeleton ' + className}
      style={{
        width,
        height,
        borderRadius: radius,
        ...style
      }}
      aria-hidden="true"
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card skeleton-card">
      <div className="product-card-inner">
        <div className="product-img" style={{ display: 'grid', placeItems: 'center', background: 'var(--panel)', minHeight: 220 }}>
          <Skeleton width="55%" height="65%" radius={8} />
        </div>
        <div className="product-info">
          <Skeleton width="80%" height={18} style={{ marginBottom: 10 }} />
          <Skeleton width="50%" height={12} style={{ marginBottom: 14 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="30%" height={14} />
            <Skeleton width="25%" height={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="product-grid three">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductListSkeleton({ count = 4 }) {
  return (
    <div className="product-list">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="product-list-card skeleton-card" style={{ pointerEvents: 'none' }}>
          <div className="list-card-img" style={{ background: 'var(--panel)', display: 'grid', placeItems: 'center' }}>
            <Skeleton width="70%" height="70%" radius={6} />
          </div>
          <div className="list-card-body" style={{ flex: 1 }}>
            <Skeleton width="25%" height={12} style={{ marginBottom: 8 }} />
            <Skeleton width="75%" height={22} style={{ marginBottom: 12 }} />
            <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="60%" height={14} style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Skeleton width={70} height={24} radius={99} />
              <Skeleton width={80} height={24} radius={99} />
              <Skeleton width={90} height={24} radius={99} />
            </div>
          </div>
          <div className="list-card-action-col" style={{ width: 180 }}>
            <Skeleton width="50%" height={24} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={40} radius={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="wrap pdp-container">
      <div className="pdp-breadcrumbs" style={{ marginBottom: 24 }}>
        <Skeleton width={220} height={14} />
      </div>
      <div className="pdp-grid">
        <div className="pdp-gallery-col">
          <div className="pdp-gallery-main" style={{ display: 'grid', placeItems: 'center', background: 'var(--panel)', height: 420, borderRadius: 16 }}>
            <Skeleton width="60%" height="75%" radius={12} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Skeleton width={70} height={70} radius={8} />
            <Skeleton width={70} height={70} radius={8} />
            <Skeleton width={70} height={70} radius={8} />
          </div>
        </div>
        <div className="pdp-info-col">
          <Skeleton width="25%" height={14} style={{ marginBottom: 12 }} />
          <Skeleton width="85%" height={38} style={{ marginBottom: 14 }} />
          <Skeleton width="40%" height={18} style={{ marginBottom: 20 }} />
          <Skeleton width="25%" height={28} style={{ marginBottom: 24 }} />
          <Skeleton width="100%" height={56} radius={10} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={48} radius={10} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={48} radius={10} style={{ marginBottom: 24 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Skeleton width={120} height={44} radius={8} />
            <Skeleton width="100%" height={44} radius={8} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Image With Smooth Transition (Phase 10)                             */
/* ------------------------------------------------------------------ */
export function ImageWithTransition({ src, alt, className = '', style = {}, onLoad, fallbackText }) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErr(false);
  }, [src]);

  return (
    <div className={`img-transition-wrap ${className}`} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {!loaded && !err && (
        <div className="skeleton img-skeleton-placeholder" style={{ position: 'absolute', inset: 0 }} />
      )}
      {!err ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
          onError={() => setErr(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'none' : 'scale(0.97)',
            transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--mute)', fontSize: 13 }}>
          {fallbackText || 'Image Unavailable'}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal Transition Wrapper (Phase 10)                                 */
/* ------------------------------------------------------------------ */
export function ModalTransition({ open, onClose, title, children, maxWidth = 800 }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop-animated" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="modal-dialog-animated"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-dialog-header">
          {title && <h3 style={{ font: '400 24px/1 var(--serif)', margin: 0 }}>{title}</h3>}
          <button className="quickview-close" onClick={onClose} aria-label="Close dialog" style={{ position: 'static' }}>
            {icons.x}
          </button>
        </div>
        <div className="modal-dialog-body">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Star rating display                                                  */
/* ------------------------------------------------------------------ */
export function Stars({ rating = 5 }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) =>
        i < full ? '★' : (i === full && half ? '½' : '☆')
      ).join('')}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Product Card (Grid View)                                             */
/* ------------------------------------------------------------------ */
export function Card({ p, onQuickView, onCompare, isCompared }) {
  const { add, toggleWishlist, inWishlist } = useApp();
  const [added, setAdded] = useState(false);
  const wished = inWishlist(p._id);

  const move = e => {
    const b = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5;
    const y = (e.clientY - b.top) / b.height - 0.5;
    const inner = e.currentTarget.querySelector('.product-card-inner');
    if (inner) inner.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  };
  const reset = e => {
    const inner = e.currentTarget.querySelector('.product-card-inner');
    if (inner) inner.style.transform = '';
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    add(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="product-card" onPointerMove={move} onPointerLeave={reset}>
      <div className="product-card-inner">
        <div className="product-img">
          <Link to={'/product/' + p.slug} aria-label={p.name} style={{ display: 'contents' }}>
            <Art p={p} />
          </Link>

          {/* Badges */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 3 }}>
            {p.stock <= 10 && p.stock > 0 && (
              <span className="product-badge" style={{ position: 'static', background: 'var(--terracotta)' }}>Only {p.stock} left</span>
            )}
            {p.stock === 0 && (
              <span className="product-badge" style={{ position: 'static', background: 'var(--mute)' }}>Out of stock</span>
            )}
            {p.brand && (
              <span className="product-badge" style={{ position: 'static', background: 'rgba(15,34,24,.85)', fontSize: 9 }}>{p.brand}</span>
            )}
          </div>

          {/* Action icon buttons */}
          <div className="card-top-actions">
            <button
              className={'product-action-btn' + (wished ? ' active' : '')}
              onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              title="Save to Wishlist"
            >
              <svg viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {onQuickView && (
              <button
                className="product-action-btn"
                onClick={(e) => { e.stopPropagation(); onQuickView(p); }}
                aria-label="Quick preview"
                title="Quick View"
              >
                {icons.eye}
              </button>
            )}

            {onCompare && (
              <button
                className={'product-action-btn' + (isCompared ? ' compare-active' : '')}
                onClick={(e) => { e.stopPropagation(); onCompare(p); }}
                aria-label="Compare product"
                title={isCompared ? 'Remove from compare' : 'Add to compare'}
              >
                {icons.compare}
              </button>
            )}
          </div>

          {/* Quick add bar */}
          <button
            className={'product-quick' + (added ? ' added' : '')}
            onClick={handleAdd}
            disabled={p.stock < 1}
            aria-label={`Add ${p.name} to bag`}
          >
            {p.stock < 1 ? 'Out of stock' : added ? '✓ Added to Bag' : '+ Add to bag'}
          </button>
        </div>

        <div className="product-info">
          <Link className="product-name" to={'/product/' + p.slug}>{p.name}</Link>
          <div className="product-meta">
            <span>{p.subcategory || p.category}</span>
            <span>·</span>
            <span>{p.goal}</span>
            <span>·</span>
            <span>{p.diet}</span>
          </div>
          <div className="product-footer">
            <div className="product-rating">
              <Stars rating={p.rating} />
              <span>({p.rating})</span>
            </div>
            <div className="product-price">{fmt(p.price)}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Product Card (List View)                                             */
/* ------------------------------------------------------------------ */
export function ListCard({ p, onQuickView, onCompare, isCompared }) {
  const { add, toggleWishlist, inWishlist } = useApp();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const wished = inWishlist(p._id);

  const handleAdd = () => {
    add(p, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="product-list-card">
      <div className="list-card-img">
        <Link to={'/product/' + p.slug} aria-label={p.name} style={{ display: 'contents' }}>
          <Art p={p} />
        </Link>
        {p.stock <= 10 && p.stock > 0 && (
          <span className="product-badge" style={{ background: 'var(--terracotta)' }}>Only {p.stock} left</span>
        )}
        {p.stock === 0 && (
          <span className="product-badge" style={{ background: 'var(--mute)' }}>Out of stock</span>
        )}
      </div>

      <div className="list-card-body">
        <div className="list-card-header">
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <span className="list-card-brand">{p.brand || 'Ananta Formulation'}</span>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>·</span>
              <span className="list-card-cat">{p.category} {p.subcategory ? `· ${p.subcategory}` : ''}</span>
            </div>
            <Link className="list-card-title" to={'/product/' + p.slug}>
              {p.name}
            </Link>
          </div>
          <div className="list-card-rating">
            <Stars rating={p.rating} />
            <strong>{p.rating}</strong>
            <span style={{ color: 'var(--mute)', fontSize: 12 }}>/ 5.0</span>
          </div>
        </div>

        <p className="list-card-desc">
          {p.description || '100% pure, third-party laboratory tested with verified batch certificates. Formulated for clinical bioavailability and peak physiological absorption.'}
        </p>

        <div className="list-card-tags">
          <span className="list-card-tag">{p.goal} Focus</span>
          <span className="list-card-tag">{p.diet}</span>
          <span className="list-card-tag">Packaging: {p.type}</span>
          {p.batch && <span className="list-card-tag">Batch {p.batch}</span>}
          <span className="list-card-tag" style={{ background: '#eef7f0', color: '#1a6b3a' }}>✓ Third-Party Tested</span>
        </div>
      </div>

      <div className="list-card-action-col">
        <div className="list-card-price">{fmt(p.price)}</div>
        <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 12 }}>
          {p.stock > 0 ? (
            <span style={{ color: '#1a6b3a' }}>● In Stock</span>
          ) : (
            <span style={{ color: '#c0392b' }}>● Out of Stock</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10, width: '100%' }}>
          <div className="pdp-qty" style={{ marginBottom: 0, flex: 1 }}>
            <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span className="qty-num">{qty}</span>
            <button className="qty-btn" onClick={() => setQty(q => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
          </div>
          <button
            className={'product-action-btn' + (wished ? ' active' : '')}
            onClick={() => toggleWishlist(p)}
            aria-label="Wishlist"
            title="Save to Wishlist"
            style={{ width: 38, height: 38, position: 'static', opacity: 1, transform: 'none' }}
          >
            <svg viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <button
          className={'btn btn-primary btn-full' + (added ? ' btn-gold' : '')}
          onClick={handleAdd}
          disabled={p.stock < 1}
        >
          {p.stock < 1 ? 'Out of stock' : added ? '✓ Added to Bag' : `Add to Bag · ${fmt(p.price * qty)}`}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 10, fontSize: 13 }}>
          {onQuickView && (
            <button
              onClick={() => onQuickView(p)}
              style={{ color: 'var(--mute)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {icons.eye} Quick View
            </button>
          )}
          {onCompare && (
            <button
              onClick={() => onCompare(p)}
              style={{ color: isCompared ? 'var(--gold)' : 'var(--mute)', fontWeight: isCompared ? 600 : 400, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {icons.compare} {isCompared ? 'Compared ✓' : 'Compare'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Quick-View Product Modal                                             */
/* ------------------------------------------------------------------ */
export function QuickViewModal({ product, onClose }) {
  const { add, toggleWishlist, inWishlist, toggleCompare, inCompare } = useApp();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!product) return null;
  const wished = inWishlist(product._id);
  const compared = inCompare(product._id, product.slug);

  const handleAdd = () => {
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="quickview-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="quickview-modal" onClick={e => e.stopPropagation()}>
        <button className="quickview-close" onClick={onClose} aria-label="Close Preview">
          {icons.x}
        </button>

        <div className="quickview-grid">
          <div className="quickview-stage">
            <Art p={product} />
          </div>

          <div className="quickview-details">
            <div className="quickview-badge-row">
              <span className="pdp-badge">{product.brand || 'Ananta Line'}</span>
              <span className="pdp-badge">{product.category}</span>
              <span className="pdp-badge">{product.goal}</span>
              <span className="pdp-badge">{product.diet}</span>
            </div>

            <h2 className="quickview-title">{product.name}</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Stars rating={product.rating || 5} />
              <span style={{ fontWeight: 600 }}>{product.rating || 5.0}</span>
              <span style={{ color: 'var(--mute)', fontSize: 13 }}>(Verified Lab Batch)</span>
            </div>

            <div className="quickview-price">{fmt(product.price)}</div>

            <p className="quickview-desc">
              {product.description || '100% pure, third-party laboratory tested with verified batch certificates. Formulated for clinical bioavailability and peak physiological absorption.'}
            </p>

            <table className="quickview-facts-table">
              <tbody>
                <tr>
                  <td>Batch Certificate:</td>
                  <td><strong>{product.batch || 'AN-2614'}</strong> (NABL Heavy Metals Passed)</td>
                </tr>
                <tr>
                  <td>Expiry Date:</td>
                  <td>{product.bestBefore || 'Oct 2028'}</td>
                </tr>
                <tr>
                  <td>Packaging:</td>
                  <td style={{ textTransform: 'capitalize' }}>{product.type || 'Bottle'}</td>
                </tr>
                <tr>
                  <td>Stock Status:</td>
                  <td>
                    {product.stock > 0 ? (
                      <span style={{ color: '#1a6b3a' }}>In Stock ({product.stock} units available)</span>
                    ) : (
                      <span style={{ color: '#c0392b' }}>Out of Stock</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <div className="pdp-qty" style={{ marginBottom: 0 }}>
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span className="qty-num">{qty}</span>
                <button className="qty-btn" onClick={() => setQty(q => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
              </div>

              <button
                className={'btn btn-primary' + (added ? ' btn-gold' : '')}
                style={{ flex: 1 }}
                onClick={handleAdd}
                disabled={product.stock < 1}
              >
                {product.stock < 1 ? 'Out of stock' : added ? '✓ Added to Bag' : `Add to Bag · ${fmt(product.price * qty)}`}
              </button>

              <button
                className={'btn btn-secondary' + (wished ? ' active' : '')}
                onClick={() => toggleWishlist(product)}
                aria-label="Wishlist"
                title={wished ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                {wished ? '♥ Saved' : '♡ Wishlist'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <button
                onClick={() => toggleCompare(product)}
                style={{ fontSize: 14, color: compared ? 'var(--gold)' : 'var(--mute)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {icons.compare} {compared ? 'In Comparison List ✓' : '+ Add to Compare'}
              </button>
              <Link
                to={'/product/' + product.slug}
                onClick={onClose}
                style={{ font: '500 14px var(--sans)', color: 'var(--forest)', textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                View Full Product Page →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product Comparison Dock & Modal                                      */
/* ------------------------------------------------------------------ */
export function CompareDock({ onOpenModal }) {
  const { compareList, clearCompare, toggleCompare } = useApp();
  if (!compareList || compareList.length === 0) return null;

  return (
    <div className="compare-dock" role="region" aria-label="Product Comparison Dock">
      <div className="compare-dock-inner">
        <div className="compare-dock-info">
          <strong>Compare Products ({compareList.length}/4)</strong>
          <span>Select up to 4 formulations for side-by-side analysis</span>
        </div>

        <div className="compare-dock-thumbs">
          {compareList.map(p => (
            <div key={p._id || p.slug} className="compare-dock-thumb">
              <Art p={p} />
              <button
                className="compare-thumb-remove"
                onClick={() => toggleCompare(p)}
                aria-label={`Remove ${p.name}`}
              >×</button>
            </div>
          ))}
          {Array.from({ length: 4 - compareList.length }).map((_, i) => (
            <div key={i} className="compare-dock-thumb empty">
              <span>+ Slot</span>
            </div>
          ))}
        </div>

        <div className="compare-dock-actions">
          <button className="btn btn-gold btn-sm" onClick={onOpenModal}>
            Compare Now
          </button>
          <button className="btn btn-secondary btn-sm" onClick={clearCompare}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompareModal({ onClose }) {
  const { compareList, toggleCompare, clearCompare, add } = useApp();

  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!compareList || compareList.length === 0) return null;

  return (
    <div className="quickview-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="compare-modal" onClick={e => e.stopPropagation()}>
        <div className="compare-modal-header">
          <div>
            <h2 style={{ font: '400 32px var(--serif)', marginBottom: 4 }}>Product Comparison Analysis</h2>
            <p style={{ color: 'var(--mute)', fontSize: 14 }}>Comparing {compareList.length} formulations side-by-side</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={clearCompare}>Clear All</button>
            <button className="quickview-close" onClick={onClose} style={{ position: 'static' }}>{icons.x}</button>
          </div>
        </div>

        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>Attributes</th>
                {compareList.map(p => (
                  <th key={p._id || p.slug} style={{ width: 220, textAlign: 'center' }}>
                    <div style={{ width: 100, height: 110, margin: '0 auto 10px', background: 'var(--panel)', borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                      <Art p={p} />
                    </div>
                    <Link to={'/product/' + p.slug} style={{ font: '500 15px var(--serif)', color: 'var(--ink)' }}>
                      {p.name}
                    </Link>
                    <button
                      onClick={() => toggleCompare(p)}
                      style={{ display: 'block', margin: '4px auto 0', color: '#c0392b', fontSize: 12 }}
                    >
                      Remove
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Price</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center', fontWeight: 600, fontSize: 17, color: 'var(--forest)' }}>
                    {fmt(p.price)}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Customer Rating</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center' }}>
                    <Stars rating={p.rating || 5} />
                    <div style={{ fontSize: 13, marginTop: 2 }}>{p.rating || 5.0} / 5.0</div>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Brand Division</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center' }}>
                    <span className="pdp-badge">{p.brand || 'Ananta Elements'}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Category & Subcategory</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center' }}>
                    {p.category} {p.subcategory ? `· ${p.subcategory}` : ''}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Physiological Goal</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center' }}>
                    {p.goal}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Diet Compatibility</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center' }}>
                    {p.diet}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Packaging Type</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center', textTransform: 'capitalize' }}>
                    {p.type}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Stock Availability</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center' }}>
                    {p.stock > 0 ? (
                      <span style={{ color: '#1a6b3a', fontWeight: 500 }}>In Stock ({p.stock})</span>
                    ) : (
                      <span style={{ color: '#c0392b', fontWeight: 500 }}>Out of Stock</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Batch Quality Code</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                    {p.batch || 'AN-2614'}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Best Before</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center' }}>
                    {p.bestBefore || 'Oct 2028'}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Action</td>
                {compareList.map(p => (
                  <td key={p._id || p.slug} style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-primary btn-sm btn-full"
                      onClick={() => add(p)}
                      disabled={p.stock < 1}
                    >
                      {p.stock < 1 ? 'Out of stock' : 'Add to Bag'}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SVG icons                                                            */
/* ------------------------------------------------------------------ */
export const icons = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-chevron">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22c1.25-1.25 2.208-2.822 2.708-4.208C5.513 15.7 5.5 13 5.5 13s.5-5 6-8c5.5-3 10.5-1 10.5-1s2 5-1 10.5c-3 5.5-8 6-8 6s-2.7-.013-4.792.792C6.422 21.792 4.25 22.75 2 22z"/>
    </svg>
  ),
  beaker: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H15M6.5 3H17.5"/><path d="M8 3l-3 18h14L16 3"/>
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  arrow_right: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  package: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  compare: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  sliders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  ),
};
