'use client';
import { useState, useEffect, useCallback } from 'react';
import { formatINR } from '@/lib/utils/currency';
import { UNIT_DEFINITIONS, formatBaseQty, type UnitCode } from '@/lib/units/conversions';
import { useRouter } from 'next/navigation';

interface Product {
  id: string; name: string; sku: string | null; description: string | null;
  base_unit: UnitCode; allowed_units: UnitCode[];
  price_per_base_unit: string; stock_quantity: string;
  is_active: boolean; category_name: string | null;
}

interface CartItem {
  product: Product; qty: string; unit: UnitCode;
}

function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  useEffect(() => {
    try { const s = localStorage.getItem('amc_cart'); if (s) setCart(JSON.parse(s)); } catch {}
  }, []);
  function saveCart(items: CartItem[]) {
    setCart(items);
    try { localStorage.setItem('amc_cart', JSON.stringify(items)); } catch {}
  }
  function addToCart(product: Product, qty: string, unit: UnitCode) {
    const updated = [...cart];
    const idx = updated.findIndex(c => c.product.id === product.id);
    if (idx >= 0) updated[idx] = { product, qty, unit };
    else updated.push({ product, qty, unit });
    saveCart(updated);
  }
  return { cart, addToCart };
}

function lineTotal(p: Product, qty: string, unit: UnitCode): number {
  const u = UNIT_DEFINITIONS.find(u => u.code === unit);
  if (!u) return 0;
  return parseFloat(qty) * parseFloat(u.to_base) * parseFloat(p.price_per_base_unit);
}

export default function SellerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { cart, addToCart } = useCart();
  const [adding, setAdding] = useState<Record<string, { qty: string; unit: UnitCode }>>({});
  const [added, setAdded] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (query) params.set('q', query);
    const res = await fetch(`/api/products?${params}`);
    const json = await res.json();
    setProducts(json.data || []);
    setTotalPages(json.pagination?.pages || 1);
    setTotal(json.pagination?.total || 0);
    setLoading(false);
    // Init adders for new products
    setAdding(prev => {
      const next = { ...prev };
      (json.data || []).forEach((p: Product) => {
        if (!next[p.id]) next[p.id] = { qty: '1', unit: p.allowed_units[0] };
      });
      return next;
    });
  }, [page, query]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault(); setPage(1); setQuery(search);
  }

  function handleAddToCart(product: Product) {
    const a = adding[product.id] || { qty: '1', unit: product.allowed_units[0] };
    addToCart(product, a.qty, a.unit as UnitCode);
    setAdded(prev => new Set([...prev, product.id]));
    setTimeout(() => setAdded(prev => { const s = new Set(prev); s.delete(product.id); return s; }), 2000);
  }

  const cartCount = cart.length;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">Browse Products</h2>
          <p className="page-subtitle">{total} products available</p>
        </div>
        {cartCount > 0 && (
          <button onClick={() => router.push('/seller/cart')} className="btn btn-primary">
            🛒 Cart ({cartCount}) →
          </button>
        )}
      </div>

      <div className="dashboard-content">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="search-box" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input id="seller-search" className="form-input" placeholder="Search chemicals…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
          {query && <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setQuery(''); setPage(1); }}>Clear</button>}
        </form>

        {loading ? (
          <div className="loading-center"><div className="spinner" /><span className="loading-text">Loading…</span></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧪</div>
            <div className="empty-title">No products found</div>
            <div className="empty-subtitle">Try a different search term</div>
          </div>
        ) : (
          <>
            <div className="products-grid">
              {products.map(p => {
                const a = adding[p.id] || { qty: '1', unit: p.allowed_units[0] };
                const previewTotal = !isNaN(parseFloat(a.qty)) ? lineTotal(p, a.qty, a.unit as UnitCode) : 0;
                const isInCart = cart.some(c => c.product.id === p.id);
                const justAdded = added.has(p.id);

                return (
                  <div key={p.id} className="product-card">
                    {/* Header */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>{p.name}</div>
                          {p.sku && <div className="text-xs text-muted font-mono" style={{ marginTop: 2 }}>{p.sku}</div>}
                        </div>
                        {isInCart && <span className="badge badge-active">In Cart</span>}
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted" style={{ marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.description}
                        </p>
                      )}
                    </div>

                    {/* Price & Stock */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <div className="product-price">{formatINR(p.price_per_base_unit)}</div>
                        <div className="product-price-label">per {p.base_unit}</div>
                        {p.base_unit === 'g' && <div className="text-xs text-muted">{formatINR(String(parseFloat(p.price_per_base_unit) * 1000))} / kg</div>}
                        {p.base_unit === 'mL' && <div className="text-xs text-muted">{formatINR(String(parseFloat(p.price_per_base_unit) * 1000))} / L</div>}
                      </div>
                      <div>
                        <div className="product-stock">Stock: {formatBaseQty(p.stock_quantity, p.base_unit)}</div>
                        <div className="flex gap-1" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                          {p.allowed_units.map(u => <span key={u} className="product-card-unit">{u}</span>)}
                        </div>
                      </div>
                    </div>

                    {/* Add to cart controls */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number" step="0.001" min="0.001"
                        className="form-input"
                        style={{ width: 80, textAlign: 'center', padding: '8px 10px', flexShrink: 0 }}
                        value={a.qty}
                        onChange={e => setAdding(prev => ({ ...prev, [p.id]: { ...a, qty: e.target.value } }))}
                      />
                      <select
                        className="form-input"
                        style={{ flex: 1, padding: '8px 10px' }}
                        value={a.unit}
                        onChange={e => setAdding(prev => ({ ...prev, [p.id]: { ...a, unit: e.target.value as UnitCode } }))}
                      >
                        {p.allowed_units.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>

                    {/* Price preview */}
                    {previewTotal > 0 && (
                      <div style={{ padding: '8px 12px', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatINR(String(previewTotal))}</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleAddToCart(p)}
                      className={`btn w-full ${justAdded ? 'btn-success' : 'btn-primary'}`}
                      style={{ justifyContent: 'center' }}
                    >
                      {justAdded ? '✓ Added to Cart!' : isInCart ? '🔄 Update Cart' : '🛒 Add to Cart'}
                    </button>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <span className="text-sm text-muted">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
