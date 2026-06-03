'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/utils/currency';
import { formatBaseQty, type UnitCode } from '@/lib/units/conversions';

interface LineItem {
  id: string; product_name: string; product_sku: string | null;
  ordered_qty: string; ordered_unit: string;
  base_qty: string; base_unit: UnitCode;
  unit_price_snapshot: string; line_total_inr: string;
}

interface Quotation {
  id: string; quotation_no: string; status: string;
  subtotal_inr: string; total_inr: string;
  notes: string | null; admin_notes: string | null;
  reviewer_name: string | null; reviewed_at: string | null;
  created_at: string; items: LineItem[];
}

export default function SellerQuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/quotations/${id}`).then(r => r.json()).then(json => {
        setQuotation(json.data);
        setLoading(false);
      });
    });
  }, [params]);

  async function handleCancel() {
    if (!quotation) return;
    setCancelling(true); setError('');
    const res = await fetch(`/api/quotations/${quotation.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    const json = await res.json();
    setCancelling(false);
    if (!res.ok) { setError(json.error || 'Cancel failed'); return; }
    setQuotation(prev => prev ? { ...prev, status: 'cancelled' } : null);
    setSuccess('Quotation cancelled.');
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span className="loading-text">Loading…</span></div>;
  if (!quotation) return <div className="dashboard-content"><div className="alert alert-error">Quotation not found.</div></div>;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="font-mono" style={{ color: 'var(--primary-light)' }}>{quotation.quotation_no}</span>
            <span className={`badge badge-${quotation.status}`}>{quotation.status}</span>
          </h2>
          <p className="page-subtitle">Placed on {new Date(quotation.created_at).toLocaleString('en-IN')}</p>
        </div>
        <button onClick={() => router.back()} className="btn btn-secondary">← Back</button>
      </div>

      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}
        {success && <div className="alert alert-success"><span>✅</span><span>{success}</span></div>}

        {quotation.notes && (
          <div className="card">
            <h4 style={{ marginBottom: 8 }}>Your Notes</h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{quotation.notes}</p>
          </div>
        )}

        <div className="card">
          <h4 style={{ marginBottom: 16 }}>Order Items ({quotation.items?.length || 0})</h4>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Product</th><th>Ordered</th><th>Base Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
              <tbody>
                {(quotation.items || []).map(li => (
                  <tr key={li.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{li.product_name}</div>
                      {li.product_sku && <div className="text-xs text-muted font-mono">{li.product_sku}</div>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{parseFloat(li.ordered_qty).toLocaleString('en-IN', { maximumFractionDigits: 4 })} {li.ordered_unit}</td>
                    <td className="text-muted text-sm">{formatBaseQty(li.base_qty, li.base_unit)}</td>
                    <td className="text-sm">{formatINR(li.unit_price_snapshot)} / {li.base_unit}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatINR(li.line_total_inr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cart-total" style={{ marginTop: 16 }}>
            <span>Total Amount</span>
            <span style={{ fontSize: '1.35rem', color: 'var(--accent)' }}>{formatINR(quotation.total_inr)}</span>
          </div>
        </div>

        {/* Admin review */}
        {quotation.status !== 'pending' && quotation.status !== 'cancelled' && (
          <div className="card">
            <h4 style={{ marginBottom: 12 }}>Review Details</h4>
            <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
              <div><div className="text-xs text-muted">Status</div><span className={`badge badge-${quotation.status}`}>{quotation.status}</span></div>
              {quotation.reviewer_name && <div><div className="text-xs text-muted">Reviewed By</div><div style={{ fontWeight: 600 }}>{quotation.reviewer_name}</div></div>}
              {quotation.reviewed_at && <div><div className="text-xs text-muted">Reviewed At</div><div>{new Date(quotation.reviewed_at).toLocaleString('en-IN')}</div></div>}
              {quotation.admin_notes && <div><div className="text-xs text-muted">Admin Notes</div><div style={{ color: 'var(--text-secondary)' }}>{quotation.admin_notes}</div></div>}
            </div>
          </div>
        )}

        {/* Cancel button for pending */}
        {quotation.status === 'pending' && (
          <div className="flex justify-end">
            <button onClick={handleCancel} className="btn btn-danger" disabled={cancelling}>
              {cancelling ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Cancelling…</> : '🚫 Cancel Quotation'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
