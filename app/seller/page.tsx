import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { sql } from '@/lib/db';
import Link from 'next/link';
import { formatINR } from '@/lib/utils/currency';

export const metadata = { title: 'My Dashboard — AasaMedChem' };

export default async function SellerDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { name?: string; id?: string };

  const [stats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status='pending') as pending,
      COUNT(*) FILTER (WHERE status='approved') as approved,
      COALESCE(SUM(total_inr) FILTER (WHERE status='approved'), 0) as approved_value
    FROM quotations WHERE seller_id = ${user.id}::uuid
  `;

  const recentQuotations = await sql`
    SELECT id, quotation_no, status, total_inr, created_at
    FROM quotations WHERE seller_id = ${user.id}::uuid
    ORDER BY created_at DESC LIMIT 5
  `;

  const productCount = await sql`SELECT COUNT(*) as total FROM products WHERE is_active = true`;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">Welcome, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="page-subtitle">Browse chemicals and place quotations</p>
        </div>
        <Link href="/seller/products" className="btn btn-primary">🧪 Browse Products</Link>
      </div>

      <div className="dashboard-content">
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)' }}>🧪</div>
            <div>
              <div className="stat-value">{productCount[0]?.total || 0}</div>
              <div className="stat-label">Available Products</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>⏳</div>
            <div>
              <div className="stat-value">{stats?.pending || 0}</div>
              <div className="stat-label">Pending Quotations</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>✅</div>
            <div>
              <div className="stat-value">{stats?.approved || 0}</div>
              <div className="stat-label">Approved Orders</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>💰</div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatINR(stats?.approved_value || '0')}</div>
              <div className="stat-label">Approved Value</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3>My Recent Quotations</h3>
            <Link href="/seller/quotations" className="btn btn-secondary btn-sm">View All →</Link>
          </div>
          {recentQuotations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No quotations yet</div>
              <div className="empty-subtitle">Browse products and add to cart to place your first quotation</div>
              <Link href="/seller/products" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Products →</Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Quotation #</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {recentQuotations.map(q => (
                    <tr key={q.id}>
                      <td><span className="font-mono text-xs" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{q.quotation_no}</span></td>
                      <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatINR(q.total_inr)}</td>
                      <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                      <td className="text-xs text-muted">{new Date(q.created_at).toLocaleDateString('en-IN')}</td>
                      <td><Link href={`/seller/quotations/${q.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
