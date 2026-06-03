import { NextResponse } from 'next/server';
import { createProductSchema } from '@/lib/validations/product';
import { requireRole } from '@/lib/auth/guard';
import { sql } from '@/lib/db';

// GET /api/products — list products with search + pagination
export async function GET(request: Request) {
  const { error, session } = await requireRole(['admin', 'seller']);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  const role = (session!.user as { role: string }).role;
  const isAdmin = role === 'admin';

  try {
    let products;
    let countResult;

    if (q) {
      if (isAdmin) {
        products = await sql`
          SELECT p.*, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${q})
            ${category ? sql`AND p.category_id = ${category}::uuid` : sql``}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await sql`
          SELECT COUNT(*) as total FROM products
          WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${q})
          ${category ? sql`AND category_id = ${category}::uuid` : sql``}
        `;
      } else {
        products = await sql`
          SELECT p.*, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${q})
            AND p.is_active = true
            ${category ? sql`AND p.category_id = ${category}::uuid` : sql``}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await sql`
          SELECT COUNT(*) as total FROM products
          WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${q})
          AND is_active = true
          ${category ? sql`AND category_id = ${category}::uuid` : sql``}
        `;
      }
    } else {
      if (isAdmin) {
        products = await sql`
          SELECT p.*, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          ${category ? sql`WHERE p.category_id = ${category}::uuid` : sql``}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await sql`
          SELECT COUNT(*) as total FROM products
          ${category ? sql`WHERE category_id = ${category}::uuid` : sql``}
        `;
      } else {
        products = await sql`
          SELECT p.*, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.is_active = true
          ${category ? sql`AND p.category_id = ${category}::uuid` : sql``}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await sql`
          SELECT COUNT(*) as total FROM products WHERE is_active = true
          ${category ? sql`AND category_id = ${category}::uuid` : sql``}
        `;
      }
    }

    const total = parseInt(countResult[0]?.total || '0');

    return NextResponse.json({
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products — create product (admin only)
export async function POST(request: Request) {
  const { error, session } = await requireRole(['admin']);
  if (error) return error;

  try {
    const body = await request.json();
    const parseResult = createProductSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const userId = (session.user as { id: string }).id;

    // Check SKU uniqueness
    if (data.sku) {
      const existing = await sql`SELECT id FROM products WHERE sku = ${data.sku}`;
      if (existing.length > 0) {
        return NextResponse.json({ error: 'SKU already exists', errors: { sku: ['SKU already in use'] } }, { status: 409 });
      }
    }

    const [product] = await sql`
      INSERT INTO products (name, sku, description, category_id, base_unit, allowed_units,
        price_per_base_unit, stock_quantity, low_stock_alert, created_by)
      VALUES (
        ${data.name},
        ${data.sku || null},
        ${data.description || null},
        ${data.category_id || null},
        ${data.base_unit},
        ${data.allowed_units},
        ${data.price_per_base_unit},
        ${data.stock_quantity || '0'},
        ${data.low_stock_alert || '0'},
        ${userId}::uuid
      )
      RETURNING *
    `;

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
