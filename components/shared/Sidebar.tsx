'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  navItems: NavItem[];
  role: 'admin' | 'seller';
}

export default function Sidebar({ navItems, role }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined;
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>⚗️ AasaMedChem</h1>
        <p>{role === 'admin' ? '🔑 Admin Panel' : '🛒 Seller Portal'}</p>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section">Navigation</span>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href)) ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name truncate">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || role}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn btn-secondary w-full"
          style={{ justifyContent: 'center', fontSize: '0.8rem' }}
        >
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
