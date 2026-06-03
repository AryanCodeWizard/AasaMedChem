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
  seller_name: string; seller_email: string;
  reviewer_name: string | null; reviewed_at: string | null;
  created_at: string; items: LineItem[];
}

export default function AdminQuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
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

  async function handleAction(action: 'approve' | 'reject') {
    if (!quotation) return;
    setActionLoading(true); setError('');
    const res = await fetch(`/api/quotations/${quotation.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, admin_notes: adminNotes }),
    });
    const json = await res.json();
    setActionLoading(false);
    if (!res.ok) {
      setError(json.error || (json.items ? `Insufficient stock: ${json.items.join('; ')}` : 'Action failed'));
      return;
    }
    setQuotation(prev => prev ? { ...prev, ...json.data } : null);
    setSuccess(action === 'approve' ? '✅ Quotation approved! Stock decremented.' : '❌ Quotation rejected.');
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span className="loading-text">Loading…</span></div>;
  if (!quotation) return <div className="dashboard-content"><div className="alert alert-error">Quotation not found.</div></div>;

  const isPending = quotation.status === 'pending';

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="font-mono" style={{ color: 'var(--primary-light)' }}>{quotation.quotation_no}</span>
            <span className={`badge badge-${quotation.status}`}>{quotation.status}</span>
          </h2>
          <p className="page-subtitle">By {quotation.seller_name} · {new Date(quotation.created_at).toLocaleString('en-IN')}</p>
        </div>
        <button onClick={() => router.back()} className="btn btn-secondary">← Back</button>
      </div>

      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}
        {success && <div className="alert alert-success"><span>✅</span><span>{success}</span></div>}

        {/* Seller info */}
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>Seller Information</h4>
          <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
            <div><div className="text-xs text-muted">Name</div><div style={{ fontWeight: 600 }}>{quotation.seller_name}</div></div>
            <div><div className="text-xs text-muted">Email</div><div>{quotation.seller_email}</div></div>
            {quotation.notes && <div><div className="text-xs text-muted">Seller Notes</div><div style={{ color: 'var(--text-secondary)' }}>{quotation.notes}</div></div>}
          </div>
        </div>

        {/* Line Items */}
        <div className="card">
          <h4 style={{ marginBottom: 16 }}>Order Items ({quotation.items?.length || 0})</h4>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Ordered</th>
                  <th>Base Qty</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
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

        {/* Reviewer info */}
        {!isPending && (
          <div className="card">
            <h4 style={{ marginBottom: 12 }}>Review Details</h4>
            <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
              <div><div className="text-xs text-muted">Reviewed By</div><div style={{ fontWeight: 600 }}>{quotation.reviewer_name || '—'}</div></div>
              <div><div className="text-xs text-muted">Reviewed At</div><div>{quotation.reviewed_at ? new Date(quotation.reviewed_at).toLocaleString('en-IN') : '—'}</div></div>
              {quotation.admin_notes && <div><div className="text-xs text-muted">Admin Notes</div><div style={{ color: 'var(--text-secondary)' }}>{quotation.admin_notes}</div></div>}
            </div>
          </div>
        )}

        {/* Action panel — only for pending */}
        {isPending && (
          <div className="card" style={{ borderColor: 'var(--border-light)' }}>
            <h4 style={{ marginBottom: 16 }}>Review Quotation</h4>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Admin Notes (optional)</label>
              <textarea className="form-input" placeholder="Add notes for the seller…" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button id="approve-btn" onClick={() => handleAction('approve')} className="btn btn-success" disabled={actionLoading} style={{ flex: 1, justifyContent: 'center' }}>
                {actionLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '✅'} Approve & Deduct Stock
              </button>
              <button id="reject-btn" onClick={() => handleAction('reject')} className="btn btn-danger" disabled={actionLoading} style={{ flex: 1, justifyContent: 'center' }}>
                {actionLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '❌'} Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
