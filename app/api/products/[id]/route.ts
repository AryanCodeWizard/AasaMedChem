import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guard';
import { sql } from '@/lib/db';
import { updateProductSchema } from '@/lib/validations/product';

// GET /api/products/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireRole(['admin', 'seller']);
  if (error) return error;

  const { id } = await params;

  try {
    const [product] = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ${id}::uuid
    `;

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const role = (session!.user as { role: string }).role;
    if (role !== 'admin' && !product.is_active) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/products/[id] — admin only
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireRole(['admin']);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parseResult = updateProductSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Check SKU uniqueness if changing
    if (data.sku) {
      const existing = await sql`SELECT id FROM products WHERE sku = ${data.sku} AND id != ${id}::uuid`;
      if (existing.length > 0) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
    }

    const [product] = await sql`
      UPDATE products SET
        name = COALESCE(${data.name ?? null}, name),
        sku = COALESCE(${data.sku ?? null}, sku),
        description = COALESCE(${data.description ?? null}, description),
        category_id = COALESCE(${data.category_id ?? null}, category_id),
        base_unit = COALESCE(${data.base_unit ?? null}, base_unit),
        allowed_units = COALESCE(${data.allowed_units ?? null}, allowed_units),
        price_per_base_unit = COALESCE(${data.price_per_base_unit ?? null}, price_per_base_unit),
        stock_quantity = COALESCE(${data.stock_quantity ?? null}, stock_quantity),
        low_stock_alert = COALESCE(${data.low_stock_alert ?? null}, low_stock_alert),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('PATCH /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/products/[id] — soft delete (admin only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireRole(['admin']);
  if (error) return error;

  const { id } = await params;

  try {
    const [product] = await sql`
      UPDATE products SET is_active = false, updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, name
    `;

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    return NextResponse.json({ message: `Product '${product.name}' deactivated`, data: product });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
