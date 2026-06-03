'use client';
import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string; name: string; email: string;
  role: string; is_active: boolean; created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seller' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    const json = await res.json();
    setUsers(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setError(''); setFieldErrors({}); setSuccess('');
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) { setError(json.error || 'Failed'); if (json.errors) setFieldErrors(json.errors); return; }
    setSuccess(`User '${json.data.name}' created successfully!`);
    setForm({ name: '', email: '', password: '', role: 'seller' });
    setShowCreate(false);
    fetchUsers();
  }

  async function toggleActive(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    fetchUsers();
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">Manage admin and seller accounts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">+ New User</button>
      </div>

      <div className="dashboard-content">
        {success && <div className="alert alert-success mb-4"><span>✅</span><span>{success}</span></div>}

        {loading ? (
          <div className="loading-center"><div className="spinner" /><span className="loading-text">Loading users…</span></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td className="text-sm">{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td><span className={`badge badge-${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="text-xs text-muted">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button onClick={() => toggleActive(u)} className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20 }}>Create New User</h3>
            {error && <div className="alert alert-error mb-4"><span>⚠️</span><span>{error}</span></div>}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Rahul Sharma" />
                {fieldErrors.name?.map(e => <span key={e} className="form-error">{e}</span>)}
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="seller@company.com" />
                {fieldErrors.email?.map(e => <span key={e} className="form-error">{e}</span>)}
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special" />
                {fieldErrors.password?.map(e => <span key={e} className="form-error">{e}</span>)}
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="seller">Seller</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating…</> : '✓ Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
