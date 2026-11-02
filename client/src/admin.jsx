import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmt } from './api';
import { useApp } from './store';
import { Art } from './ui';
import './admin.css';

const ORDER_STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
const REFUND_STATUSES = ['none', 'requested', 'refunded', 'rejected'];

const DEFAULT_CATEGORIES = ['Protein', 'Performance', 'Vitamins', 'Ayurvedic', 'Beauty', 'General'];
const DEFAULT_BRANDS = ['Ananta Elements', 'Ananta Ergo', 'Ananta Pure', 'Ananta Botanicals'];
const DEFAULT_GOALS = ['Sleep', 'Focus', 'Recovery', 'Glow', 'Daily', 'Energy', 'Immunity'];
const DEFAULT_DIETS = ['Vegan', 'Vegetarian', 'Non-vegetarian', 'Gluten-Free', 'Keto'];
const DEFAULT_TYPES = ['tub', 'bottle', 'pouch', 'capsule', 'box'];

const BLANK_PRODUCT = {
  name: '',
  category: 'Protein',
  subcategory: 'Whey Isolate',
  brand: 'Ananta Elements',
  goal: 'Recovery',
  diet: 'Vegetarian',
  type: 'tub',
  color: '#1a3325',
  price: 2499,
  originalPrice: 2999,
  discount: 16,
  stock: 50,
  rating: 4.8,
  description: '',
  batch: 'ANT-2026-X1',
  bestBefore: 'Oct 2028',
  image: '',
  images: [],
  isFeatured: false,
  variants: [
    { name: 'Size', options: ['1 kg (2.2 lbs)', '2 kg (4.4 lbs)'], priceDelta: 0 },
    { name: 'Flavor', options: ['Belgian Chocolate', 'Cold Brew Coffee', 'Unflavored Raw'], priceDelta: 0 }
  ]
};

function useAdminData(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return api(path)
      .then(res => {
        setData(res);
        setError('');
      })
      .catch(err => setError(err.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return [data, reload, error, loading];
}

/* ============================================================
   TAB 1: DASHBOARD OVERVIEW & ANALYTICS
   ============================================================ */
function DashboardOverview({ onNavigateTab }) {
  const [stats, reloadStats, err, loading] = useAdminData('/admin/stats');
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState(50);
  const [restockBusy, setRestockBusy] = useState(false);

  const handleQuickRestock = async (e) => {
    e.preventDefault();
    if (!restockItem) return;
    setRestockBusy(true);
    try {
      await api(`/admin/products/${restockItem._id}/stock`, {
        method: 'PATCH',
        body: { delta: Number(restockQty) }
      });
      setRestockItem(null);
      reloadStats();
    } catch (e) {
      alert(e.message || 'Restock failed');
    } finally {
      setRestockBusy(false);
    }
  };

  if (loading && !stats) return <div style={{ padding: '60px 0', textAlign: 'center' }}>Loading live analytics…</div>;
  if (err) return <div className="alert alert-error">{err}</div>;
  if (!stats) return null;

  // Calculate SVG polyline points for the 14-day sales trend
  const dailySales = stats.dailySales || [];
  const maxRev = Math.max(...dailySales.map(d => d.revenue), 1000);
  const svgWidth = 600;
  const svgHeight = 180;
  const points = dailySales.map((d, i) => {
    const x = dailySales.length > 1 ? (i / (dailySales.length - 1)) * (svgWidth - 40) + 20 : 20;
    const y = svgHeight - (d.revenue / maxRev) * (svgHeight - 40) - 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      {/* 4 Primary Metric Cards */}
      <div className="admin-metric-grid">
        <div className="admin-metric-card gold">
          <div className="admin-metric-icon">💰</div>
          <div className="admin-metric-value">{fmt(stats.revenue)}</div>
          <div className="admin-metric-label">Total Revenue</div>
          <div className="admin-metric-hint">AOV: {fmt(stats.aov)} per order</div>
        </div>

        <div className="admin-metric-card forest">
          <div className="admin-metric-icon">📦</div>
          <div className="admin-metric-value">{stats.orders}</div>
          <div className="admin-metric-label">Total Orders</div>
          <div className="admin-metric-hint">{stats.orderStatusCounts?.shipped || 0} currently dispatched</div>
        </div>

        <div className="admin-metric-card sage">
          <div className="admin-metric-icon">👥</div>
          <div className="admin-metric-value">{stats.customers}</div>
          <div className="admin-metric-label">Registered Customers</div>
          <div className="admin-metric-hint">Verified customer accounts</div>
        </div>

        <div className="admin-metric-card terracotta">
          <div className="admin-metric-icon">🌿</div>
          <div className="admin-metric-value">{stats.products}</div>
          <div className="admin-metric-label">Active Formulations</div>
          <div className="admin-metric-hint">
            {stats.low?.length > 0 ? (
              <span style={{ color: 'var(--terracotta)', fontWeight: 600 }}>⚠️ {stats.low.length} low stock</span>
            ) : (
              'All well-stocked'
            )}
          </div>
        </div>
      </div>

      {/* Analytics: 14-Day Sales Line Chart + Category Distribution */}
      <div className="admin-analytics-grid">
        <div className="admin-chart-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>14-Day Sales Revenue Trajectory</h3>
              <p>Daily gross formulation order volume across India.</p>
            </div>
            <span style={{ font: '600 13px var(--sans)', color: 'var(--gold)' }}>
              Avg {dailySales.length ? fmt(Math.round(stats.revenue / Math.max(dailySales.length, 1))) : '₹0'}/day
            </span>
          </div>

          <div className="admin-svg-chart-wrap">
            {dailySales.length > 0 ? (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C4933F" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#C4933F" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Grid lines */}
                <line x1="20" y1="20" x2={svgWidth - 20} y2="20" stroke="rgba(216,208,192,0.5)" strokeDasharray="4 4" />
                <line x1="20" y1={svgHeight / 2} x2={svgWidth - 20} y2={svgHeight / 2} stroke="rgba(216,208,192,0.5)" strokeDasharray="4 4" />
                <line x1="20" y1={svgHeight - 20} x2={svgWidth - 20} y2={svgHeight - 20} stroke="rgba(216,208,192,0.5)" />

                {/* Shaded Area */}
                <polygon
                  points={`20,${svgHeight - 20} ${points} ${svgWidth - 20},${svgHeight - 20}`}
                  fill="url(#salesGrad)"
                />

                {/* Line */}
                <polyline
                  points={points}
                  fill="none"
                  stroke="#C4933F"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {dailySales.map((d, i) => {
                  const x = dailySales.length > 1 ? (i / (dailySales.length - 1)) * (svgWidth - 40) + 20 : 20;
                  const y = svgHeight - (d.revenue / maxRev) * (svgHeight - 40) - 20;
                  return (
                    <circle
                      key={d._id}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#0F2218"
                      stroke="#C4933F"
                      strokeWidth="2"
                    >
                      <title>{`${d._id}: ${fmt(d.revenue)} (${d.orders} orders)`}</title>
                    </circle>
                  );
                })}
              </svg>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--mute)' }}>
                No orders in the past 14 days to plot.
              </div>
            )}
          </div>
        </div>

        {/* Category Revenue Distribution */}
        <div className="admin-chart-box">
          <h3>Category Sales Distribution</h3>
          <p>Revenue split across botanical categories.</p>

          <div className="admin-cat-bars">
            {stats.categorySales?.length > 0 ? (
              stats.categorySales.map(c => {
                const totalCatRev = stats.categorySales.reduce((a, b) => a + b.revenue, 0) || 1;
                const pct = Math.round((c.revenue / totalCatRev) * 100);
                return (
                  <div key={c._id} className="admin-cat-bar-item">
                    <div className="admin-cat-bar-header">
                      <span>{c._id}</span>
                      <strong>{pct}% ({fmt(c.revenue)})</strong>
                    </div>
                    <div className="admin-cat-bar-track">
                      <div className="admin-cat-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--mute)', fontSize: 13 }}>No category sales data yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div style={{ marginBottom: 36 }}>
        <div className="admin-section-head">
          <h3>⚠️ Low-Stock & Depletion Alerts ({stats.low?.length || 0})</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('products')}>
            Manage All Inventory →
          </button>
        </div>

        {stats.low?.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Available Stock</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.low.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="thumb"><Art p={p} /></span>
                        <strong style={{ font: '500 14px var(--sans)' }}>{p.name}</strong>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td>{fmt(p.price)}</td>
                    <td>
                      <strong style={{ color: p.stock === 0 ? '#c0392b' : '#d35400' }}>
                        {p.stock} units left
                      </strong>
                    </td>
                    <td>
                      <span className={`admin-status-badge ${p.stock === 0 ? 'cancelled' : 'packed'}`}>
                        {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                    <td>
                      <button className="mini" onClick={() => setRestockItem(p)}>
                        + Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-alert-banner" style={{ background: '#eef7f0', borderColor: '#b8e6c7' }}>
            <span style={{ color: '#1a6b3a' }}>✓ All formulations have adequate stock levels (&gt;10 units).</span>
          </div>
        )}
      </div>

      {/* Recent Orders Overview */}
      <div>
        <div className="admin-section-head">
          <h3>Recent Customer Orders</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('orders')}>
            View All Orders ({stats.orders}) →
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent?.map(o => (
                <tr key={o._id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      #{String(o._id).slice(-8).toUpperCase()}
                    </span>
                  </td>
                  <td>{o.user?.name || o.address?.name || 'Customer'}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                  <td>
                    <span className={`admin-status-badge ${o.status || 'placed'}`}>
                      ● {o.status || 'placed'}
                    </span>
                  </td>
                  <td>
                    <button className="mini" onClick={() => onNavigateTab('orders')}>
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockItem && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <button className="admin-modal-close" onClick={() => setRestockItem(null)}>✕</button>
            <h3 style={{ font: '400 24px var(--serif)', marginBottom: 6 }}>Restock Formulation</h3>
            <p style={{ color: 'var(--mute)', fontSize: 13.5, marginBottom: 20 }}>
              Add new manufacturing batch inventory for <strong>{restockItem.name}</strong>.
            </p>

            <form onSubmit={handleQuickRestock}>
              <div className="admin-field" style={{ marginBottom: 16 }}>
                <label>Units to Add to Current Stock ({restockItem.stock})</label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[25, 50, 100, 200].map(q => (
                  <button
                    key={q}
                    type="button"
                    className="mini"
                    onClick={() => setRestockQty(q)}
                    style={{ flex: 1 }}
                  >
                    +{q}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={restockBusy}>
                  {restockBusy ? 'Restocking…' : 'Confirm Restock'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setRestockItem(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 2: PRODUCT MANAGEMENT & VARIANTS
   ============================================================ */
function ProductManagement() {
  const [products, reload, err, loading] = useAdminData('/admin/products');
  const [meta] = useAdminData('/admin/meta');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('all');
  const [modalProduct, setModalProduct] = useState(null); // null, {} (for new), or existing product
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const filtered = (products || []).filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand?.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== 'All' && p.category !== catFilter) return false;
    if (stockFilter === 'low' && p.stock > 10) return false;
    if (stockFilter === 'out' && p.stock > 0) return false;
    return true;
  });

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"? This formulation will be permanently removed.`)) return;
    try {
      await api(`/admin/products/${p._id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  const handleToggleFeatured = async (p) => {
    try {
      await api(`/admin/products/${p._id}/featured`, { method: 'PATCH' });
      reload();
    } catch (e) {
      alert(e.message || 'Failed to toggle featured status');
    }
  };

  // Upload to Cloudinary (if configured)
  const handleCloudinaryUpload = async (file) => {
    if (!file) return;
    setUploadBusy(true);
    setFormErr('');
    try {
      const s = await api('/admin/upload-sign');
      const fd = new FormData();
      Object.entries({ file, api_key: s.apiKey, timestamp: s.timestamp, signature: s.signature, folder: s.folder })
        .forEach(([k, v]) => fd.append(k, v));
      const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
      setModalProduct(prev => ({
        ...prev,
        image: prev.image || data.secure_url,
        images: [...(prev.images || []), data.secure_url]
      }));
    } catch (e) {
      setFormErr(e.message || 'Upload failed. You can paste an image URL directly.');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaveBusy(true);
    setFormErr('');

    try {
      const isEdit = Boolean(modalProduct._id);
      const endpoint = isEdit ? `/admin/products/${modalProduct._id}` : '/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      // Auto-calculate discount if originalPrice provided
      const price = Number(modalProduct.price);
      const originalPrice = Number(modalProduct.originalPrice || 0);
      let discount = Number(modalProduct.discount || 0);
      if (originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      const payload = {
        ...modalProduct,
        price,
        originalPrice,
        discount,
        stock: Number(modalProduct.stock)
      };

      await api(endpoint, { method, body: payload });
      setModalProduct(null);
      reload();
    } catch (e) {
      setFormErr(e.message || 'Failed to save product');
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3>Product Catalog & Formulations ({filtered.length})</h3>
          <span style={{ fontSize: 13, color: 'var(--mute)' }}>
            Manage pricing, variants, laboratory batches, multiple images, and inventory.
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModalProduct({ ...BLANK_PRODUCT })}>
          + Create Product
        </button>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <input
          className="admin-search-input"
          placeholder="Search by formulation name or brand..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          className="admin-select-filter"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {(meta?.categories?.length ? meta.categories : DEFAULT_CATEGORIES).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="admin-select-filter"
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value)}
        >
          <option value="all">All Inventory Levels</option>
          <option value="low">Low Stock (≤10)</option>
          <option value="out">Out of Stock (0)</option>
        </select>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {/* Product Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Formulation</th>
              <th>Category / Brand</th>
              <th>Price & Discount</th>
              <th>Stock</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="thumb"><Art p={p} /></span>
                    <div>
                      <strong style={{ display: 'block', fontSize: 14 }}>{p.name}</strong>
                      <small style={{ color: 'var(--mute)' }}>Batch: {p.batch || 'ANT-2026'}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{p.category}</div>
                  <small style={{ color: 'var(--gold)' }}>{p.brand || 'Ananta Elements'}</small>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{fmt(p.price)}</div>
                  {p.originalPrice > p.price && (
                    <small style={{ color: 'var(--terracotta)' }}>
                      <s>{fmt(p.originalPrice)}</s> ({p.discount}% OFF)
                    </small>
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: p.stock <= 10 ? 700 : 400, color: p.stock <= 10 ? '#c0392b' : 'inherit' }}>
                    {p.stock} units
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(p)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 18,
                      cursor: 'pointer',
                      color: p.isFeatured ? '#f39c12' : '#bdc3c7'
                    }}
                    title={p.isFeatured ? 'Featured on Homepage (Click to disable)' : 'Not Featured (Click to enable)'}
                  >
                    ★
                  </button>
                </td>
                <td>
                  <button className="mini" onClick={() => setModalProduct({ ...p })}>
                    Edit
                  </button>
                  <button className="mini del" onClick={() => handleDelete(p)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Create / Edit Modal */}
      {modalProduct && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <button className="admin-modal-close" onClick={() => setModalProduct(null)}>✕</button>
            <h3 style={{ font: '400 26px var(--serif)', marginBottom: 6 }}>
              {modalProduct._id ? 'Edit Formulation' : 'Create New Formulation'}
            </h3>
            <p style={{ color: 'var(--mute)', fontSize: 13, marginBottom: 20 }}>
              Configure product specifications, botanical variant pricing, and inventory.
            </p>

            {formErr && <div className="alert alert-error" style={{ marginBottom: 16 }}>{formErr}</div>}

            <form onSubmit={handleSaveProduct}>
              <div className="admin-form-grid">
                <div className="admin-field admin-form-full">
                  <label>Product Name *</label>
                  <input
                    value={modalProduct.name}
                    onChange={e => setModalProduct({ ...modalProduct, name: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label>Brand *</label>
                  <input
                    value={modalProduct.brand || 'Ananta Elements'}
                    onChange={e => setModalProduct({ ...modalProduct, brand: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label>Category *</label>
                  <select
                    value={modalProduct.category}
                    onChange={e => setModalProduct({ ...modalProduct, category: e.target.value })}
                  >
                    {DEFAULT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="admin-field">
                  <label>Subcategory</label>
                  <input
                    value={modalProduct.subcategory || ''}
                    onChange={e => setModalProduct({ ...modalProduct, subcategory: e.target.value })}
                  />
                </div>

                <div className="admin-field">
                  <label>Primary Fitness/Wellness Goal</label>
                  <select
                    value={modalProduct.goal}
                    onChange={e => setModalProduct({ ...modalProduct, goal: e.target.value })}
                  >
                    {DEFAULT_GOALS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                <div className="admin-field">
                  <label>Dietary Compatibility</label>
                  <select
                    value={modalProduct.diet}
                    onChange={e => setModalProduct({ ...modalProduct, diet: e.target.value })}
                  >
                    {DEFAULT_DIETS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>

                <div className="admin-field">
                  <label>Packaging Form Factor</label>
                  <select
                    value={modalProduct.type}
                    onChange={e => setModalProduct({ ...modalProduct, type: e.target.value })}
                  >
                    {DEFAULT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Pricing & Discounts */}
                <div className="admin-field">
                  <label>Selling Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={modalProduct.price}
                    onChange={e => setModalProduct({ ...modalProduct, price: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label>Original MRP (₹) (For discount calculation)</label>
                  <input
                    type="number"
                    min="0"
                    value={modalProduct.originalPrice || ''}
                    onChange={e => setModalProduct({ ...modalProduct, originalPrice: e.target.value })}
                  />
                </div>

                <div className="admin-field">
                  <label>Inventory Stock *</label>
                  <input
                    type="number"
                    min="0"
                    value={modalProduct.stock}
                    onChange={e => setModalProduct({ ...modalProduct, stock: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label>Laboratory Batch Number</label>
                  <input
                    value={modalProduct.batch || ''}
                    onChange={e => setModalProduct({ ...modalProduct, batch: e.target.value })}
                  />
                </div>

                <div className="admin-field admin-form-full">
                  <label>Description & Physiological Benefits</label>
                  <textarea
                    rows="3"
                    value={modalProduct.description || ''}
                    onChange={e => setModalProduct({ ...modalProduct, description: e.target.value })}
                  />
                </div>

                {/* Multiple Images Upload & Gallery */}
                <div className="admin-field admin-form-full">
                  <label>Product Images (Primary & Gallery)</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder="Paste image URL (https://…)"
                      value={newImageUrl}
                      onChange={e => setNewImageUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (!newImageUrl.trim()) return;
                        setModalProduct(p => ({
                          ...p,
                          image: p.image || newImageUrl.trim(),
                          images: [...(p.images || []), newImageUrl.trim()]
                        }));
                        setNewImageUrl('');
                      }}
                    >
                      + Add URL
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleCloudinaryUpload(e.target.files[0])}
                      disabled={uploadBusy}
                    />
                    {uploadBusy && <span style={{ fontSize: 12, color: 'var(--gold)' }}>Uploading image…</span>}
                  </div>

                  {/* Thumbnail Previews */}
                  <div className="admin-images-strip">
                    {(modalProduct.images || []).map((img, idx) => (
                      <div key={idx} className="admin-image-thumb">
                        <img src={img} alt="Product preview" />
                        <button
                          type="button"
                          className="admin-image-thumb-remove"
                          onClick={() => {
                            const filtered = modalProduct.images.filter((_, i) => i !== idx);
                            setModalProduct({
                              ...modalProduct,
                              images: filtered,
                              image: modalProduct.image === img ? (filtered[0] || '') : modalProduct.image
                            });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variants Management */}
                <div className="admin-field admin-form-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Product Variants (Sizes & Flavors)</label>
                    <button
                      type="button"
                      className="mini"
                      onClick={() => {
                        setModalProduct(p => ({
                          ...p,
                          variants: [
                            ...(p.variants || []),
                            { name: 'Option', options: ['Default'], priceDelta: 0 }
                          ]
                        }));
                      }}
                    >
                      + Add Variant Group
                    </button>
                  </div>

                  <div className="admin-variants-box">
                    {(modalProduct.variants || []).map((v, vIdx) => (
                      <div key={vIdx} className="admin-variant-row">
                        <input
                          placeholder="Group (e.g. Size)"
                          value={v.name}
                          onChange={e => {
                            const updated = [...modalProduct.variants];
                            updated[vIdx].name = e.target.value;
                            setModalProduct({ ...modalProduct, variants: updated });
                          }}
                        />
                        <input
                          placeholder="Options separated by commas (e.g. 1kg, 2kg)"
                          value={Array.isArray(v.options) ? v.options.join(', ') : v.options}
                          onChange={e => {
                            const updated = [...modalProduct.variants];
                            updated[vIdx].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            setModalProduct({ ...modalProduct, variants: updated });
                          }}
                        />
                        <input
                          type="number"
                          placeholder="Price +/-"
                          value={v.priceDelta || 0}
                          onChange={e => {
                            const updated = [...modalProduct.variants];
                            updated[vIdx].priceDelta = Number(e.target.value);
                            setModalProduct({ ...modalProduct, variants: updated });
                          }}
                        />
                        <button
                          type="button"
                          className="mini del"
                          style={{ padding: '4px 8px' }}
                          onClick={() => {
                            setModalProduct({
                              ...modalProduct,
                              variants: modalProduct.variants.filter((_, i) => i !== vIdx)
                            });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Featured Checkbox */}
                <div className="admin-form-full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(modalProduct.isFeatured)}
                      onChange={e => setModalProduct({ ...modalProduct, isFeatured: e.target.checked })}
                    />
                    <span>Highlight as <strong>Featured Spotlight Product</strong> on the homepage</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saveBusy}>
                  {saveBusy ? 'Saving Formulation…' : (modalProduct._id ? 'Save Changes' : 'Create Product')}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalProduct(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 3: ORDER MANAGEMENT, FULFILLMENT & REFUNDS
   ============================================================ */
function OrderManagement() {
  const [orders, reload, err, loading] = useAdminData('/admin/orders');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refundFilter, setRefundFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [carrierInput, setCarrierInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const filtered = (orders || []).filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (refundFilter !== 'all' && (o.refundStatus || 'none') !== refundFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = o.address?.name?.toLowerCase().includes(q) || o.user?.name?.toLowerCase().includes(q);
      const matchPhone = o.address?.phone?.includes(q);
      const matchId = String(o._id).toLowerCase().includes(q);
      const matchAwb = o.trackingNumber?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchId && !matchAwb) return false;
    }
    return true;
  });

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionBusy(true);
    try {
      await api(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      reload();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (e) {
      alert(e.message || 'Status update failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpdateShipping = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionBusy(true);
    try {
      const updated = await api(`/admin/orders/${selectedOrder._id}/shipping`, {
        method: 'PATCH',
        body: { carrier: carrierInput, trackingNumber: trackingInput }
      });
      setSelectedOrder(updated);
      reload();
    } catch (e) {
      alert(e.message || 'Shipping update failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleProcessRefund = async (orderId, refundStatus, refundReason) => {
    if (!confirm(`Are you sure you want to mark this order refund as "${refundStatus}"?`)) return;
    setActionBusy(true);
    try {
      const updated = await api(`/admin/orders/${orderId}/refund`, {
        method: 'PATCH',
        body: { refundStatus, refundReason: refundReason || 'Processed by Admin' }
      });
      setSelectedOrder(updated);
      reload();
    } catch (e) {
      alert(e.message || 'Refund processing failed');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3>Order Fulfillment & Logistics ({filtered.length})</h3>
          <span style={{ fontSize: 13, color: 'var(--mute)' }}>
            Real-time status updates, BlueDart AWB generation, and cancellation/refund processing.
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <input
          className="admin-search-input"
          placeholder="Search by customer, phone, order #, or AWB tracking..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          className="admin-select-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Fulfillment Stages</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="admin-select-filter"
          value={refundFilter}
          onChange={e => setRefundFilter(e.target.value)}
        >
          <option value="all">All Refund Statuses</option>
          <option value="requested">Refund Requested ⚠️</option>
          <option value="refunded">Refunded</option>
          <option value="rejected">Refund Rejected</option>
        </select>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {/* Orders Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total & Payment</th>
              <th>Fulfillment Status</th>
              <th>Refund</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o._id}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    #{String(o._id).slice(-8).toUpperCase()}
                  </span>
                  <br />
                  <small style={{ color: 'var(--mute)' }}>
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </small>
                </td>
                <td>
                  <strong>{o.address?.name || o.user?.name || 'Customer'}</strong>
                  <br />
                  <small style={{ color: 'var(--mute)' }}>{o.address?.phone || o.user?.email}</small>
                </td>
                <td style={{ maxWidth: 200, fontSize: 12.5, color: 'var(--mute)' }}>
                  {o.items?.map(i => `${i.name} (×${i.qty})`).join(', ')}
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{fmt(o.total)}</div>
                  <small style={{ color: 'var(--gold)', textTransform: 'uppercase' }}>
                    {o.payment || 'COD'}
                  </small>
                </td>
                <td>
                  <select
                    className="admin-select-filter"
                    style={{ padding: '4px 8px', fontSize: 12 }}
                    value={o.status}
                    onChange={e => handleUpdateStatus(o._id, e.target.value)}
                    disabled={actionBusy || o.status === 'cancelled'}
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  {o.refundStatus && o.refundStatus !== 'none' ? (
                    <span className={`admin-refund-badge ${o.refundStatus}`}>
                      {o.refundStatus}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--mute)', fontSize: 12 }}>—</span>
                  )}
                </td>
                <td>
                  <button
                    className="mini"
                    onClick={() => {
                      setSelectedOrder(o);
                      setCarrierInput(o.carrier || 'BlueDart Express');
                      setTrackingInput(o.trackingNumber || '');
                    }}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <button className="admin-modal-close" onClick={() => setSelectedOrder(null)}>✕</button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ font: '400 24px var(--serif)' }}>
                  Order #{String(selectedOrder._id).slice(-8).toUpperCase()}
                </h3>
                <small style={{ color: 'var(--mute)' }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </small>
              </div>
              <span className={`admin-status-badge ${selectedOrder.status}`}>
                ● {selectedOrder.status}
              </span>
            </div>

            {/* Shipping Destination */}
            <div style={{ background: 'var(--panel)', padding: 16, borderRadius: 'var(--r-sm)', marginBottom: 16 }}>
              <strong style={{ display: 'block', fontSize: 13, textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 6 }}>
                Delivery Destination
              </strong>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                <strong>{selectedOrder.address?.name}</strong> (📞 {selectedOrder.address?.phone})<br />
                {selectedOrder.address?.line1}<br />
                {selectedOrder.address?.city}, {selectedOrder.address?.state} — {selectedOrder.address?.pincode}
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="admin-order-items-list">
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} className="admin-order-item-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, display: 'grid', placeItems: 'center' }}><Art p={item} /></div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      <small style={{ color: 'var(--mute)' }}>
                        {item.size ? `Size: ${item.size} · ` : ''}{item.flavor ? `Flavor: ${item.flavor}` : ''}
                      </small>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>Qty: {item.qty} × {fmt(item.price)}</div>
                    <strong style={{ color: 'var(--forest)' }}>{fmt(item.price * item.qty)}</strong>
                  </div>
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Subtotal: {fmt(selectedOrder.subtotal)}</span>
                {selectedOrder.discount > 0 && <span style={{ color: 'var(--terracotta)' }}>Discount: -{fmt(selectedOrder.discount)}</span>}
                <span>Shipping: {fmt(selectedOrder.shipping)}</span>
                <strong style={{ fontSize: 15 }}>Total: {fmt(selectedOrder.total)}</strong>
              </div>
            </div>

            {/* Live BlueDart Shipping / Dispatch Controls */}
            <form onSubmit={handleUpdateShipping} style={{ background: 'var(--panel)', padding: 16, borderRadius: 'var(--r-sm)', marginBottom: 16 }}>
              <strong style={{ display: 'block', fontSize: 13, textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 10 }}>
                Courier & Cold-Chain Dispatch
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10 }}>
                <input
                  placeholder="Carrier (e.g. BlueDart Express)"
                  value={carrierInput}
                  onChange={e => setCarrierInput(e.target.value)}
                  required
                />
                <input
                  placeholder="AWB Tracking Number"
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={actionBusy}>
                  Update AWB
                </button>
              </div>
            </form>

            {/* Refund & Cancellation Section */}
            {selectedOrder.refundStatus && selectedOrder.refundStatus !== 'none' && (
              <div style={{ background: '#fdf7f6', border: '1px solid #f0d0cb', padding: 16, borderRadius: 'var(--r-sm)', marginBottom: 16 }}>
                <strong style={{ display: 'block', color: '#c0392b', fontSize: 13, marginBottom: 4 }}>
                  Refund Status: {selectedOrder.refundStatus.toUpperCase()}
                </strong>
                {selectedOrder.refundReason && (
                  <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 10 }}>
                    Reason: <em>"{selectedOrder.refundReason}"</em>
                  </p>
                )}

                {selectedOrder.refundStatus === 'requested' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ background: '#c0392b', borderColor: '#c0392b' }}
                      onClick={() => handleProcessRefund(selectedOrder._id, 'refunded', 'Approved by admin')}
                      disabled={actionBusy}
                    >
                      ✓ Approve Refund & Restock Inventory
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleProcessRefund(selectedOrder._id, 'rejected', 'Refund request did not meet policy')}
                      disabled={actionBusy}
                    >
                      Reject Request
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 4: CUSTOMER MANAGEMENT
   ============================================================ */
function CustomerManagement() {
  const [customers, reload, err, loading] = useAdminData('/admin/customers');
  const [search, setSearch] = useState('');

  const filtered = (customers || []).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const handleRoleChange = async (c, newRole) => {
    if (!confirm(`Change role for ${c.name} (${c.email}) to "${newRole}"?`)) return;
    try {
      await api(`/admin/customers/${c._id}/role`, {
        method: 'PATCH',
        body: { role: newRole }
      });
      reload();
    } catch (e) {
      alert(e.message || 'Role change failed');
    }
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3>Registered Customers ({filtered.length})</h3>
          <span style={{ fontSize: 13, color: 'var(--mute)' }}>
            Customer lifetime value, order frequency, and role management.
          </span>
        </div>
      </div>

      <div className="admin-filter-bar">
        <input
          className="admin-search-input"
          placeholder="Search by customer name, email, or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact Details</th>
              <th>Dietary & Health Profile</th>
              <th>Total Orders</th>
              <th>Lifetime Spend</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const initials = (c.name || 'User').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
              return (
                <tr key={c._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="account-avatar-circle" style={{ width: 36, height: 36, fontSize: 13 }}>
                        {initials}
                      </div>
                      <div>
                        <strong>{c.name}</strong>
                        <br />
                        <small style={{ color: 'var(--mute)' }}>
                          Joined {new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{c.email}</div>
                    <small style={{ color: 'var(--mute)' }}>{c.phone || 'No phone recorded'}</small>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--mute)', maxWidth: 180 }}>
                    <div>{c.dietaryPreference || 'Not specified'}</div>
                    {c.healthGoals?.length > 0 && <small>{c.healthGoals.slice(0, 2).join(', ')}</small>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.totalOrders || 0}</td>
                  <td style={{ fontWeight: 600, color: 'var(--forest)' }}>{fmt(c.totalSpent || 0)}</td>
                  <td>
                    <span className={`admin-status-badge ${c.role === 'admin' ? 'shipped' : 'placed'}`}>
                      {c.role || 'customer'}
                    </span>
                  </td>
                  <td>
                    {c.role === 'admin' ? (
                      <button className="mini del" onClick={() => handleRoleChange(c, 'customer')}>
                        Demote
                      </button>
                    ) : (
                      <button className="mini" onClick={() => handleRoleChange(c, 'admin')}>
                        Promote to Admin
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 5: COUPON MANAGEMENT
   ============================================================ */
function CouponManagement() {
  const [coupons, reload, err] = useAdminData('/admin/coupons');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'percent',
    value: 15,
    minOrder: 1999,
    maxDiscount: 750,
    description: '',
    isActive: true
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api('/admin/coupons', { method: 'POST', body: form });
      setShowModal(false);
      setForm({ code: '', type: 'percent', value: 15, minOrder: 1999, maxDiscount: 750, description: '', isActive: true });
      reload();
    } catch (e) {
      setMsg(e.message || 'Failed to create coupon');
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (c) => {
    try {
      await api(`/admin/coupons/${c._id}/toggle`, { method: 'PATCH' });
      reload();
    } catch (e) {
      alert(e.message || 'Toggle failed');
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await api(`/admin/coupons/${c._id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3>Promotional Coupons & Vouchers ({coupons?.length || 0})</h3>
          <span style={{ fontSize: 13, color: 'var(--mute)' }}>
            Configure percentage, flat rupee, or free-shipping vouchers.
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + Create Coupon
        </button>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Coupon Code</th>
              <th>Benefit Type</th>
              <th>Value</th>
              <th>Min Cart Value</th>
              <th>Max Discount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(coupons || []).map(c => (
              <tr key={c._id}>
                <td>
                  <strong style={{ fontFamily: 'monospace', letterSpacing: '.05em', color: 'var(--forest)' }}>
                    {c.code}
                  </strong>
                  <br />
                  <small style={{ color: 'var(--mute)' }}>{c.description || 'General promotion'}</small>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{c.type}</td>
                <td style={{ fontWeight: 600 }}>
                  {c.type === 'percent' ? `${c.value}%` : fmt(c.value)}
                </td>
                <td>{fmt(c.minOrder)}</td>
                <td>{c.type === 'percent' ? fmt(c.maxDiscount) : '—'}</td>
                <td>
                  <span className={`admin-status-badge ${c.isActive ? 'delivered' : 'cancelled'}`}>
                    {c.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <button className="mini" onClick={() => handleToggle(c)}>
                    {c.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button className="mini del" onClick={() => handleDelete(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Coupon Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: 480 }}>
            <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h3 style={{ font: '400 24px var(--serif)', marginBottom: 6 }}>Create Discount Coupon</h3>
            <p style={{ color: 'var(--mute)', fontSize: 13, marginBottom: 18 }}>
              Set validation thresholds and maximum discount amounts.
            </p>

            {msg && <div className="alert alert-error" style={{ marginBottom: 14 }}>{msg}</div>}

            <form onSubmit={handleCreateCoupon}>
              <div className="admin-field" style={{ marginBottom: 12 }}>
                <label>Coupon Code * (e.g. WELLNESS30)</label>
                <input
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="admin-form-grid" style={{ marginBottom: 12 }}>
                <div className="admin-field">
                  <label>Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Rupee (₹)</option>
                    <option value="shipping">Free Shipping</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label>Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.value}
                    onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="admin-form-grid" style={{ marginBottom: 12 }}>
                <div className="admin-field">
                  <label>Minimum Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrder}
                    onChange={e => setForm({ ...form, minOrder: Number(e.target.value) })}
                  />
                </div>
                <div className="admin-field">
                  <label>Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxDiscount}
                    onChange={e => setForm({ ...form, maxDiscount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="admin-field" style={{ marginBottom: 20 }}>
                <label>Description Note</label>
                <input
                  placeholder="e.g. 15% off on circadian recovery stacks"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
                  {busy ? 'Creating…' : 'Create Coupon'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 6: HOMEPAGE BANNER MANAGEMENT
   ============================================================ */
function BannerManagement() {
  const [banners, reload, err] = useAdminData('/admin/banners');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    badge: 'ERGOGENIC SCIENCE',
    title: 'Peak Recovery & Lean Performance.',
    subtitle: 'Ultra-filtered cold-microfiltered Whey Isolate and Creapure® micronized creatine.',
    ctaText: 'Explore Performance',
    ctaLink: '/shop?category=Performance',
    secondaryCtaText: 'Save 25% on Stacks',
    secondaryCtaLink: '/shop',
    statsBadge: '27g Protein / Scoop',
    isActive: true,
    order: 0
  });
  const [busy, setBusy] = useState(false);

  const handleCreateBanner = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/admin/banners', { method: 'POST', body: form });
      setShowModal(false);
      reload();
    } catch (e) {
      alert(e.message || 'Failed to create banner');
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (b) => {
    try {
      await api(`/admin/banners/${b._id}/toggle`, { method: 'PATCH' });
      reload();
    } catch (e) {
      alert(e.message || 'Toggle failed');
    }
  };

  const handleDelete = async (b) => {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    try {
      await api(`/admin/banners/${b._id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3>Homepage Hero Banners ({banners?.length || 0})</h3>
          <span style={{ fontSize: 13, color: 'var(--mute)' }}>
            Curate promotional slides, seasonal spotlights, and primary hero CTAs.
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + Add Hero Banner
        </button>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {(banners || []).map(b => (
          <div key={b._id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 20, background: 'var(--white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span className="label" style={{ color: 'var(--gold)' }}>{b.badge}</span>
              <span className={`admin-status-badge ${b.isActive ? 'delivered' : 'cancelled'}`}>
                {b.isActive ? 'Active' : 'Hidden'}
              </span>
            </div>

            <h4 style={{ font: '400 20px/1.2 var(--serif)', marginBottom: 6 }}>{b.title}</h4>
            <p style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.5, marginBottom: 16 }}>{b.subtitle}</p>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--mute)', marginBottom: 16 }}>
              <span>CTA: <strong>{b.ctaText}</strong> → {b.ctaLink}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <button className="mini" style={{ flex: 1 }} onClick={() => handleToggle(b)}>
                {b.isActive ? 'Unpublish' : 'Publish'}
              </button>
              <button className="mini del" onClick={() => handleDelete(b)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Banner Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: 540 }}>
            <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h3 style={{ font: '400 24px var(--serif)', marginBottom: 6 }}>Create Hero Banner Slide</h3>
            <p style={{ color: 'var(--mute)', fontSize: 13, marginBottom: 18 }}>
              Headline and promotional targets for homepage carousel.
            </p>

            <form onSubmit={handleCreateBanner}>
              <div className="admin-field" style={{ marginBottom: 12 }}>
                <label>Badge Eyebrow</label>
                <input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} />
              </div>

              <div className="admin-field" style={{ marginBottom: 12 }}>
                <label>Headline Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>

              <div className="admin-field" style={{ marginBottom: 12 }}>
                <label>Subtitle Description</label>
                <textarea rows="2" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
              </div>

              <div className="admin-form-grid" style={{ marginBottom: 12 }}>
                <div className="admin-field">
                  <label>Primary CTA Text</label>
                  <input value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Primary CTA Link</label>
                  <input value={form.ctaLink} onChange={e => setForm({ ...form, ctaLink: e.target.value })} />
                </div>
              </div>

              <div className="admin-form-grid" style={{ marginBottom: 20 }}>
                <div className="admin-field">
                  <label>Secondary CTA Text</label>
                  <input value={form.secondaryCtaText} onChange={e => setForm({ ...form, secondaryCtaText: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Secondary CTA Link</label>
                  <input value={form.secondaryCtaLink} onChange={e => setForm({ ...form, secondaryCtaLink: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
                  {busy ? 'Saving…' : 'Publish Banner'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 7: REVIEW MODERATION
   ============================================================ */
function ReviewModeration() {
  const [reviews, reload, err] = useAdminData('/admin/reviews');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = (reviews || []).filter(r => {
    if (statusFilter !== 'all' && (r.status || 'approved') !== statusFilter) return false;
    return true;
  });

  const handleUpdateStatus = async (r, status) => {
    try {
      await api(`/admin/reviews/${r._id}/status`, { method: 'PATCH', body: { status } });
      reload();
    } catch (e) {
      alert(e.message || 'Status update failed');
    }
  };

  const handleDelete = async (r) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      await api(`/admin/reviews/${r._id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3>Product Reviews & Feedback Moderation ({filtered.length})</h3>
          <span style={{ fontSize: 13, color: 'var(--mute)' }}>
            Approve verified buyer testimonials, flag spam, and maintain transparency.
          </span>
        </div>
      </div>

      <div className="admin-filter-bar">
        <select
          className="admin-select-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Review Statuses</option>
          <option value="pending">Pending Moderation</option>
          <option value="approved">Approved & Published</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating & Headline</th>
              <th>Review Comment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r._id}>
                <td>
                  <strong style={{ color: 'var(--forest)' }}>{r.productName || 'Formulation'}</strong>
                  <br />
                  <small style={{ color: 'var(--gold)' }}>{r.productSlug}</small>
                </td>
                <td>
                  <strong>{r.userName || 'Verified Buyer'}</strong>
                  <br />
                  <small style={{ color: '#1a6b3a' }}>✓ Verified Buyer</small>
                </td>
                <td>
                  <div>{'⭐'.repeat(r.rating || 5)}</div>
                  <strong style={{ fontSize: 13 }}>{r.title}</strong>
                </td>
                <td style={{ maxWidth: 300, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                  {r.comment}
                </td>
                <td>
                  <span className={`admin-status-badge ${r.status === 'rejected' ? 'cancelled' : r.status === 'pending' ? 'packed' : 'delivered'}`}>
                    {r.status || 'approved'}
                  </span>
                </td>
                <td>
                  {r.status !== 'approved' && (
                    <button className="mini" onClick={() => handleUpdateStatus(r, 'approved')}>
                      Approve
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button className="mini" style={{ color: '#d35400' }} onClick={() => handleUpdateStatus(r, 'rejected')}>
                      Reject
                    </button>
                  )}
                  <button className="mini del" onClick={() => handleDelete(r)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN ADMIN CONTROLLER & ROUTE PROTECTION
   ============================================================ */
export default function Admin() {
  const { user } = useApp();
  const [tab, setTab] = useState('dash');

  // Role Protection & Protected Route Guard
  if (!user) {
    return (
      <div className="wrap" style={{ padding: '90px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', background: 'var(--white)', padding: 36, borderRadius: 'var(--r)', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔒</div>
          <h1 style={{ font: '400 36px/1.1 var(--serif)', marginBottom: 12 }}>Admin Portal</h1>
          <p style={{ color: 'var(--mute)', fontSize: 14.5, marginBottom: 28 }}>
            Restricted corporate portal. Please authenticate with administrator credentials to manage formulations, inventory, and logistics.
          </p>
          <Link className="btn btn-primary btn-full" to="/login" state={{ from: '/admin' }}>
            Sign In as Admin
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="wrap" style={{ padding: '90px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', background: 'var(--white)', padding: 36, borderRadius: 'var(--r)', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>⛔</div>
          <h1 style={{ font: '400 36px/1.1 var(--serif)', marginBottom: 12 }}>Access Denied</h1>
          <p style={{ color: 'var(--mute)', fontSize: 14.5, marginBottom: 28 }}>
            Account <strong>{user.email}</strong> does not possess administrator authorizations.
          </p>
          <Link className="btn btn-secondary btn-full" to="/account">
            Return to Customer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'dash', label: 'Dashboard & Analytics', icon: '📊' },
    { key: 'products', label: 'Products & Inventory', icon: '🌿' },
    { key: 'orders', label: 'Orders & Fulfillment', icon: '📦' },
    { key: 'customers', label: 'Customers', icon: '👥' },
    { key: 'coupons', label: 'Coupons', icon: '🏷️' },
    { key: 'banners', label: 'Hero Banners', icon: '🖼️' },
    { key: 'reviews', label: 'Review Moderation', icon: '⭐' }
  ];

  return (
    <div className="wrap admin-wrap">
      {/* Admin Header */}
      <div className="admin-header">
        <div>
          <h1>Administration Suite</h1>
          <p style={{ color: 'var(--mute)', fontSize: 14 }}>
            Ananta Corporate Operations & Formulation Management Console
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="admin-header-badge">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ecc71', display: 'inline-block' }} />
            Signed in: {user.email}
          </span>
          <Link to="/shop" className="btn btn-secondary btn-sm">
            View Storefront ↗
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="admin-nav-tabs" aria-label="Admin Navigation">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`admin-tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Active Tab Body */}
      {tab === 'dash' && <DashboardOverview onNavigateTab={setTab} />}
      {tab === 'products' && <ProductManagement />}
      {tab === 'orders' && <OrderManagement />}
      {tab === 'customers' && <CustomerManagement />}
      {tab === 'coupons' && <CouponManagement />}
      {tab === 'banners' && <BannerManagement />}
      {tab === 'reviews' && <ReviewModeration />}
    </div>
  );
}
