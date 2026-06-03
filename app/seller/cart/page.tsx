'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/utils/currency';
import { UNIT_DEFINITIONS, type UnitCode } from '@/lib/units/conversions';
import Link from 'next/link';

interface Product {
  id: string; name: string; sku: string | null;
  base_unit: UnitCode; allowed_units: UnitCode[];
  price_per_base_unit: string;
}

interface CartItem { product: Product; qty: string; unit: UnitCode; }

function lineTotal(p: Product, qty: string, unit: UnitCode): number {
  const u = UNIT_DEFINITIONS.find(u => u.code === unit);
  if (!u || isNaN(parseFloat(qty))) return 0;
  return parseFloat(qty) * parseFloat(u.to_base) * parseFloat(p.price_per_base_unit);
}

export default function SellerCartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  useEffect(() => {
    try { const s = localStorage.getItem('amc_cart'); if (s) setCart(JSON.parse(s)); } catch {}
  }, []);

  function saveCart(items: CartItem[]) {
    setCart(items);
    try { localStorage.setItem('amc_cart', JSON.stringify(items)); } catch {}
  }

  function removeItem(id: string) { saveCart(cart.filter(c => c.product.id !== id)); }

  function updateQty(id: string, qty: string) {
    saveCart(cart.map(c => c.product.id === id ? { ...c, qty } : c));
  }

  function updateUnit(id: string, unit: UnitCode) {
    saveCart(cart.map(c => c.product.id === id ? { ...c, unit } : c));
  }

  const grandTotal = cart.reduce((sum, c) => sum + lineTotal(c.product, c.qty, c.unit), 0);

  async function handlePlaceQuotation() {
    setPlacing(true); setError(''); setStockWarnings([]);
    const res = await fetch('/api/quotations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: notes.trim() || undefined,
        items: cart.map(c => ({ product_id: c.product.id, ordered_qty: c.qty, ordered_unit: c.unit })),
      }),
    });
    const json = await res.json();
    setPlacing(false);
    if (!res.ok) { setError(json.error || 'Failed to place quotation'); return; }
    if (json.data?.stock_warnings?.length) setStockWarnings(json.data.stock_warnings);
    // Clear cart and navigate
    saveCart([]);
    router.push(`/seller/quotations/${json.data.id}`);
  }

  if (cart.length === 0) {
    return (
      <>
        <div className="dashboard-header">
          <h2 className="page-title">My Cart</h2>
        </div>
        <div className="dashboard-content">
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <div className="empty-title">Your cart is empty</div>
            <div className="empty-subtitle">Browse products and add them to your cart</div>
            <Link href="/seller/products" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Products →</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">My Cart</h2>
          <p className="page-subtitle">{cart.length} item{cart.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/seller/products" className="btn btn-secondary">← Continue Shopping</Link>
      </div>

      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}
        {stockWarnings.length > 0 && (
          <div className="alert alert-warning">
            <span>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Stock Warning (quotation still accepted):</div>
              {stockWarnings.map(w => <div key={w} className="text-sm">{w}</div>)}
            </div>
          </div>
        )}

        {/* Cart items */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h4>Order Items</h4>
          </div>
          {cart.map(c => {
            const total = lineTotal(c.product, c.qty, c.unit);
            return (
              <div key={c.product.id} className="cart-item" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                {/* Product info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600 }}>{c.product.name}</div>
                  {c.product.sku && <div className="text-xs text-muted font-mono">{c.product.sku}</div>}
                  <div className="text-xs text-muted">{formatINR(c.product.price_per_base_unit)} / {c.product.base_unit}</div>
                </div>

                {/* Qty + unit controls */}
                <div className="flex gap-2 items-center" style={{ flexShrink: 0 }}>
                  <input
                    type="number" step="0.001" min="0.001"
                    className="form-input"
                    style={{ width: 80, textAlign: 'center', padding: '8px 10px' }}
                    value={c.qty}
                    onChange={e => updateQty(c.product.id, e.target.value)}
                  />
                  <select
                    className="form-input"
                    style={{ width: 70, padding: '8px 10px' }}
                    value={c.unit}
                    onChange={e => updateUnit(c.product.id, e.target.value as UnitCode)}
                  >
                    {c.product.allowed_units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Line total */}
                <div style={{ minWidth: 100, textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatINR(String(total))}</div>
                </div>

                {/* Remove */}
                <button onClick={() => removeItem(c.product.id)} className="btn btn-icon btn-danger btn-sm" style={{ flexShrink: 0 }}>✕</button>
              </div>
            );
          })}

          {/* Grand total */}
          <div className="cart-total" style={{ borderRadius: 0 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Grand Total</span>
            <span style={{ fontSize: '1.5rem', color: 'var(--accent)', fontWeight: 800 }}>{formatINR(String(grandTotal))}</span>
          </div>
        </div>

        {/* Notes & submit */}
        <div className="card">
          <h4 style={{ marginBottom: 16 }}>Additional Notes (optional)</h4>
          <textarea
            id="quotation-notes"
            className="form-input"
            placeholder="Urgent delivery required by Friday, special handling instructions…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ minHeight: 100 }}
          />
          <div className="flex justify-end gap-3" style={{ marginTop: 16 }}>
            <button onClick={() => saveCart([])} className="btn btn-danger btn-sm">🗑 Clear Cart</button>
            <button
              id="place-quotation-btn"
              onClick={handlePlaceQuotation}
              className="btn btn-primary"
              disabled={placing || cart.length === 0}
              style={{ minWidth: 180, justifyContent: 'center' }}
            >
              {placing
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Placing…</>
                : `📋 Place Quotation (${formatINR(String(grandTotal))})`
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
