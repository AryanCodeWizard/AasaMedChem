import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/shared/Sidebar';

const sellerNavItems = [
  { href: '/seller',            label: 'Dashboard',   icon: '📊' },
  { href: '/seller/products',   label: 'Browse Products', icon: '🧪' },
  { href: '/seller/cart',       label: 'My Cart',     icon: '🛒' },
  { href: '/seller/quotations', label: 'My Quotations', icon: '📋' },
];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if ((session.user as { role: string }).role !== 'seller') redirect('/admin');

  return (
    <div className="dashboard-layout">
      <Sidebar navItems={sellerNavItems} role="seller" />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
