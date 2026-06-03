'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/utils/currency';
import { formatBaseQty, type UnitCode } from '@/lib/units/conversions';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  base_unit: UnitCode;
  allowed_units: string[];
  price_per_base_unit: string;
  stock_quantity: string;
  is_active: boolean;
  category_name: string | null;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (query) params.set('q', query);
    const res = await fetch(`/api/products?${params}`);
    const json = await res.json();
    setProducts(json.data || []);
    setTotalPages(json.pagination?.pages || 1);
    setTotal(json.pagination?.total || 0);
    setLoading(false);
  }, [page, query]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) { setDeleteConfirm(null); fetchProducts(); }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">Products</h2>
          <p className="page-subtitle">{total} products total</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">+ New Product</Link>
      </div>

      <div className="dashboard-content">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="search-box" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input
              id="product-search"
              className="form-input"
              placeholder="Search products by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
          {query && (
            <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setQuery(''); setPage(1); }}>
              Clear
            </button>
          )}
        </form>

        {loading ? (
          <div className="loading-center"><div className="spinner" /><span className="loading-text">Loading products…</span></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧪</div>
            <div className="empty-title">No products found</div>
            <div className="empty-subtitle">Create your first product to get started</div>
            <Link href="/admin/products/new" className="btn btn-primary" style={{ marginTop: 16 }}>+ New Product</Link>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name / SKU</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Price / Base Unit</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.sku && <div className="text-xs text-muted font-mono">{p.sku}</div>}
                      </td>
                      <td className="text-muted text-sm">{p.category_name || '—'}</td>
                      <td>
                        <div className="flex gap-2 flex-wrap">
                          {p.allowed_units.map(u => (
                            <span key={u} className="product-card-unit">{u}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          {formatINR(p.price_per_base_unit)}
                        </div>
                        <div className="text-xs text-muted">per {p.base_unit}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{formatBaseQty(p.stock_quantity, p.base_unit)}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${p.is_active ? 'active' : 'inactive'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/admin/products/${p.id}`} className="btn btn-secondary btn-sm">Edit</Link>
                          {p.is_active && (
                            <button
                              onClick={() => setDeleteConfirm(p.id)}
                              className="btn btn-danger btn-sm"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

      {/* Deactivate confirm modal */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Deactivate Product?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 24 }}>
              The product will be hidden from sellers but existing quotations will be preserved.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
