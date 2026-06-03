'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError('Invalid email or password.');
      return;
    }

    // Redirect based on role — middleware will handle mismatched routes
    // We fetch session to get role
    const sessionRes = await fetch('/api/auth/session');
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role === 'admin') router.push('/admin');
    else router.push('/seller');
  }

  return (
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-bg-orb" style={{ width: 400, height: 400, background: '#6366f1', top: -100, left: -100 }} />
      <div className="login-bg-orb" style={{ width: 300, height: 300, background: '#0ea5e9', bottom: -80, right: -60 }} />

      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚗️</div>
          <h1>AasaMedChem</h1>
          <p>Inventory &amp; Order Management System</p>
        </div>

        {error && (
          <div className="alert alert-error mb-4" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 4, justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                Signing in…
              </>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Demo Credentials</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Admin</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--primary-light)' }}>admin@aasalab.in / Admin@1234</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Seller</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--secondary)' }}>seller@demo.in / Seller@1234</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
