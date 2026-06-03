'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UNIT_DEFINITIONS, type UnitCode } from '@/lib/units/conversions';
import { formatINR } from '@/lib/utils/currency';

const DIMENSION_GROUPS: Record<string, UnitCode[]> = {
  weight: ['g', 'kg'], volume: ['mL', 'L'], count: ['item'],
};

interface Product {
  id: string; name: string; sku: string | null; description: string | null;
  base_unit: UnitCode; allowed_units: UnitCode[];
  price_per_base_unit: string; stock_quantity: string; low_stock_alert: string;
  is_active: boolean;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '', sku: '', description: '',
    base_unit: 'g' as UnitCode, allowed_units: ['g', 'kg'] as UnitCode[],
    price_per_base_unit: '', stock_quantity: '0', low_stock_alert: '0',
  });

  useEffect(() => {
    params.then(({ id: pid }) => {
      setId(pid);
      fetch(`/api/products/${pid}`).then(r => r.json()).then(json => {
        const p: Product = json.data;
        setForm({
          name: p.name, sku: p.sku || '', description: p.description || '',
          base_unit: p.base_unit, allowed_units: p.allowed_units,
          price_per_base_unit: p.price_per_base_unit,
          stock_quantity: p.stock_quantity, low_stock_alert: p.low_stock_alert,
        });
        setLoading(false);
      });
    });
  }, [params]);

  function setField(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function handleBaseUnitChange(unit: UnitCode) {
    const dim = UNIT_DEFINITIONS.find(u => u.code === unit)?.dimension || 'weight';
    setForm(f => ({ ...f, base_unit: unit, allowed_units: DIMENSION_GROUPS[dim] || [unit] }));
  }

  function toggleAllowedUnit(unit: UnitCode) {
    setForm(f => {
      const has = f.allowed_units.includes(unit);
      if (has && f.allowed_units.length === 1) return f;
      return { ...f, allowed_units: has ? f.allowed_units.filter(u => u !== unit) : [...f.allowed_units, unit] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sku: form.sku || undefined, description: form.description || undefined }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error || 'Update failed'); return; }
    setSuccess('Product updated successfully!');
  }

  const baseDim = UNIT_DEFINITIONS.find(u => u.code === form.base_unit)?.dimension || 'weight';
  const compatibleUnits = UNIT_DEFINITIONS.filter(u => u.dimension === baseDim);

  if (loading) return <div className="loading-center"><div className="spinner" /><span className="loading-text">Loading…</span></div>;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">Edit Product</h2>
          <p className="page-subtitle">{form.name}</p>
        </div>
        <button onClick={() => router.back()} className="btn btn-secondary">← Back</button>
      </div>
      <div className="dashboard-content" style={{ maxWidth: 720 }}>
        {error && <div className="alert alert-error mb-4"><span>⚠️</span><span>{error}</span></div>}
        {success && <div className="alert alert-success mb-4"><span>✅</span><span>{success}</span></div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h4 style={{ marginBottom: 16 }}>Basic Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} required />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input className="form-input" value={form.sku} onChange={e => setField('sku', e.target.value.toUpperCase())} />
                </div>
                <div className="form-group">
                  <label className="form-label">Price per Base Unit (₹) *</label>
                  <input type="number" step="0.000001" min="0" className="form-input" value={form.price_per_base_unit} onChange={e => setField('price_per_base_unit', e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" value={form.description} onChange={e => setField('description', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 16 }}>Unit Configuration</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Base Unit</label>
                <div className="flex gap-2 flex-wrap">
                  {UNIT_DEFINITIONS.map(u => (
                    <button key={u.code} type="button" onClick={() => handleBaseUnitChange(u.code)}
                      className={`btn btn-sm ${form.base_unit === u.code ? 'btn-primary' : 'btn-secondary'}`}>
                      {u.label} ({u.code})
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Allowed Display Units</label>
                <div className="flex gap-2 flex-wrap">
                  {compatibleUnits.map(u => (
                    <button key={u.code} type="button" onClick={() => toggleAllowedUnit(u.code)}
                      className={`btn btn-sm ${form.allowed_units.includes(u.code) ? 'btn-primary' : 'btn-secondary'}`}>
                      {u.label} ({u.code}) {form.allowed_units.includes(u.code) ? '✓' : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Price: </span>
                <strong style={{ color: 'var(--accent)' }}>
                  {formatINR(form.price_per_base_unit || '0')} per {form.base_unit}
                </strong>
                {form.base_unit === 'g' && <span style={{ color: 'var(--text-muted)' }}> = {formatINR(String(parseFloat(form.price_per_base_unit || '0') * 1000))} per kg</span>}
                {form.base_unit === 'mL' && <span style={{ color: 'var(--text-muted)' }}> = {formatINR(String(parseFloat(form.price_per_base_unit || '0') * 1000))} per L</span>}
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 16 }}>Inventory</h4>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Stock ({form.base_unit})</label>
                <input type="number" step="0.000001" min="0" className="form-input" value={form.stock_quantity} onChange={e => setField('stock_quantity', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Alert ({form.base_unit})</label>
                <input type="number" step="0.000001" min="0" className="form-input" value={form.low_stock_alert} onChange={e => setField('low_stock_alert', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : '✓ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
