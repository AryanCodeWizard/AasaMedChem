import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { sql } from '@/lib/db';
import Link from 'next/link';

export const metadata = { title: 'Admin Dashboard — AasaMedChem' };

async function getStats() {
  const [products] = await sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM products`;
  const [quotations] = await sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='pending') as pending, COUNT(*) FILTER (WHERE status='approved') as approved FROM quotations`;
  const [users] = await sql`SELECT COUNT(*) as total FROM users WHERE role='seller' AND is_active`;
  return { products, quotations, users };
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { name?: string };
  const stats = await getStats();

  const recentQuotations = await sql`
    SELECT q.id, q.quotation_no, q.status, q.total_inr, q.created_at, u.name as seller_name
    FROM quotations q JOIN users u ON u.id = q.seller_id
    ORDER BY q.created_at DESC LIMIT 5
  `;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="page-subtitle">Here's what's happening in your lab today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">+ New Product</Link>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Stats Grid */}
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>🧪</div>
            <div>
              <div className="stat-value">{stats.products.active}</div>
              <div className="stat-label">Active Products</div>
              <div className="text-xs text-muted mt-4">{stats.products.total} total</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>⏳</div>
            <div>
              <div className="stat-value">{stats.quotations.pending}</div>
              <div className="stat-label">Pending Quotations</div>
              <div className="text-xs text-muted mt-4">{stats.quotations.total} total</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>✅</div>
            <div>
              <div className="stat-value">{stats.quotations.approved}</div>
              <div className="stat-label">Approved Orders</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)' }}>👥</div>
            <div>
              <div className="stat-value">{stats.users.total}</div>
              <div className="stat-label">Active Sellers</div>
            </div>
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3>Recent Quotations</h3>
            <Link href="/admin/quotations" className="btn btn-secondary btn-sm">View All →</Link>
          </div>
          {recentQuotations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No quotations yet</div>
              <div className="empty-subtitle">Sellers will start placing quotations soon</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Quotation #</th>
                    <th>Seller</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotations.map((q) => (
                    <tr key={q.id}>
                      <td><span className="font-mono text-xs" style={{ color: 'var(--primary-light)' }}>{q.quotation_no}</span></td>
                      <td>{q.seller_name}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        ₹{parseFloat(q.total_inr).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                      <td className="text-muted text-xs">{new Date(q.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <Link href={`/admin/quotations/${q.id}`} className="btn btn-secondary btn-sm">View</Link>
                      </td>
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
