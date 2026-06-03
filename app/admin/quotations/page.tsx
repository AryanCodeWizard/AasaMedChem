'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/utils/currency';

interface Quotation {
  id: string; quotation_no: string; status: string;
  total_inr: string; created_at: string;
  seller_name: string; seller_email: string;
  notes: string | null;
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status !== 'all') params.set('status', status);
    const res = await fetch(`/api/quotations?${params}`);
    const json = await res.json();
    setQuotations(json.data || []);
    setTotalPages(json.pagination?.pages || 1);
    setTotal(json.pagination?.total || 0);
    setLoading(false);
  }, [page, status]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);
  useEffect(() => { setPage(1); }, [status]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">Quotations</h2>
          <p className="page-subtitle">{total} quotations total</p>
        </div>
      </div>
      <div className="dashboard-content">
        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}>
              {s === 'all' ? '📋 All' : s === 'pending' ? '⏳ Pending' : s === 'approved' ? '✅ Approved' : s === 'rejected' ? '❌ Rejected' : '🚫 Cancelled'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /><span className="loading-text">Loading quotations…</span></div>
        ) : quotations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No quotations found</div>
            <div className="empty-subtitle">{status !== 'all' ? `No ${status} quotations` : 'No quotations have been placed yet'}</div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Quotation #</th>
                    <th>Seller</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => (
                    <tr key={q.id}>
                      <td>
                        <span className="font-mono text-xs" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{q.quotation_no}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{q.seller_name}</div>
                        <div className="text-xs text-muted">{q.seller_email}</div>
                      </td>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatINR(q.total_inr)}</td>
                      <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                      <td className="text-sm text-muted" style={{ maxWidth: 160 }}>
                        <div className="truncate">{q.notes || '—'}</div>
                      </td>
                      <td className="text-xs text-muted">{new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <Link href={`/admin/quotations/${q.id}`} className="btn btn-secondary btn-sm">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
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
