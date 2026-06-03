'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UNIT_DEFINITIONS, type UnitCode } from '@/lib/units/conversions';

const DIMENSION_GROUPS: Record<string, UnitCode[]> = {
  weight: ['g', 'kg'],
  volume: ['mL', 'L'],
  count:  ['item'],
};

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [form, setForm] = useState({
    name: '', sku: '', description: '',
    base_unit: 'g' as UnitCode,
    allowed_units: ['g', 'kg'] as UnitCode[],
    price_per_base_unit: '',
    stock_quantity: '0',
    low_stock_alert: '0',
  });

  function setField(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
    setFieldErrors(e => ({ ...e, [k]: [] }));
  }

  function handleBaseUnitChange(unit: UnitCode) {
    const dim = UNIT_DEFINITIONS.find(u => u.code === unit)?.dimension || 'weight';
    setForm(f => ({
      ...f,
      base_unit: unit,
      allowed_units: DIMENSION_GROUPS[dim] || [unit],
    }));
  }

  function toggleAllowedUnit(unit: UnitCode) {
    setForm(f => {
      const has = f.allowed_units.includes(unit);
      if (has && f.allowed_units.length === 1) return f; // keep at least one
      return {
        ...f,
        allowed_units: has
          ? f.allowed_units.filter(u => u !== unit)
          : [...f.allowed_units, unit],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const body = {
      ...form,
      sku: form.sku.trim() || undefined,
      description: form.description.trim() || undefined,
    };

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'Failed to create product');
      if (json.errors) setFieldErrors(json.errors);
      return;
    }

    router.push('/admin/products');
    router.refresh();
  }

  const baseDim = UNIT_DEFINITIONS.find(u => u.code === form.base_unit)?.dimension || 'weight';
  const compatibleUnits = UNIT_DEFINITIONS.filter(u => u.dimension === baseDim);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">New Product</h2>
          <p className="page-subtitle">Add a new chemical to your inventory</p>
        </div>
        <button onClick={() => router.back()} className="btn btn-secondary">← Back</button>
      </div>

      <div className="dashboard-content" style={{ maxWidth: 720 }}>
        {error && <div className="alert alert-error mb-4"><span>⚠️</span><span>{error}</span></div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h4 style={{ marginBottom: 16 }}>Basic Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="prod-name">Product Name *</label>
                <input id="prod-name" className="form-input" placeholder="e.g. Ethanol (99.9% HPLC Grade)" value={form.name} onChange={e => setField('name', e.target.value)} required />
                {fieldErrors.name?.map(e => <span key={e} className="form-error">{e}</span>)}
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="prod-sku">SKU (optional)</label>
                  <input id="prod-sku" className="form-input" placeholder="ETH-99-HPLC" value={form.sku} onChange={e => setField('sku', e.target.value.toUpperCase())} />
                  {fieldErrors.sku?.map(e => <span key={e} className="form-error">{e}</span>)}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="prod-price">Price per Base Unit (₹) *</label>
                  <input id="prod-price" type="number" step="0.000001" min="0" className="form-input" placeholder="0.850000" value={form.price_per_base_unit} onChange={e => setField('price_per_base_unit', e.target.value)} required />
                  {fieldErrors.price_per_base_unit?.map(e => <span key={e} className="form-error">{e}</span>)}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prod-desc">Description</label>
                <textarea id="prod-desc" className="form-input" placeholder="Product details, grade, specifications…" value={form.description} onChange={e => setField('description', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 16 }}>Unit Configuration</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Base Unit (storage unit) *</label>
                <div className="flex gap-2 flex-wrap">
                  {UNIT_DEFINITIONS.map(u => (
                    <button
                      key={u.code}
                      type="button"
                      onClick={() => handleBaseUnitChange(u.code)}
                      className={`btn btn-sm ${form.base_unit === u.code ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {u.label} ({u.code})
                    </button>
                  ))}
                </div>
                <span className="form-hint">The unit prices and stock are stored in. Dimension: <strong>{baseDim}</strong></span>
              </div>

              <div className="form-group">
                <label className="form-label">Allowed Display Units *</label>
                <div className="flex gap-2 flex-wrap">
                  {compatibleUnits.map(u => (
                    <button
                      key={u.code}
                      type="button"
                      onClick={() => toggleAllowedUnit(u.code)}
                      className={`btn btn-sm ${form.allowed_units.includes(u.code) ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {u.label} ({u.code}) {form.allowed_units.includes(u.code) ? '✓' : ''}
                    </button>
                  ))}
                </div>
                <span className="form-hint">Sellers can order in these units. All must share the same dimension as base unit.</span>
                {fieldErrors.allowed_units?.map(e => <span key={e} className="form-error">{e}</span>)}
              </div>

              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Price interpretation: </span>
                <strong style={{ color: 'var(--accent)' }}>
                  {form.price_per_base_unit ? `₹${form.price_per_base_unit}` : '₹0'} per {form.base_unit}
                </strong>
                {form.base_unit === 'g' && form.price_per_base_unit && (
                  <span style={{ color: 'var(--text-muted)' }}> = ₹{(parseFloat(form.price_per_base_unit) * 1000).toFixed(2)} per kg</span>
                )}
                {form.base_unit === 'mL' && form.price_per_base_unit && (
                  <span style={{ color: 'var(--text-muted)' }}> = ₹{(parseFloat(form.price_per_base_unit) * 1000).toFixed(2)} per L</span>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 16 }}>Inventory</h4>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="prod-stock">Initial Stock ({form.base_unit})</label>
                <input id="prod-stock" type="number" step="0.000001" min="0" className="form-input" placeholder="0" value={form.stock_quantity} onChange={e => setField('stock_quantity', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prod-alert">Low Stock Alert ({form.base_unit})</label>
                <input id="prod-alert" type="number" step="0.000001" min="0" className="form-input" placeholder="0" value={form.low_stock_alert} onChange={e => setField('low_stock_alert', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
            <button id="create-product-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating…</> : '✓ Create Product'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
