import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/shared/Sidebar';

const adminNavItems = [
  { href: '/admin',             label: 'Dashboard',   icon: '📊' },
  { href: '/admin/products',    label: 'Products',    icon: '🧪' },
  { href: '/admin/quotations',  label: 'Quotations',  icon: '📋' },
  { href: '/admin/users',       label: 'Users',       icon: '👥' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if ((session.user as { role: string }).role !== 'admin') redirect('/seller');

  return (
    <div className="dashboard-layout">
      <Sidebar navItems={adminNavItems} role="admin" />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
