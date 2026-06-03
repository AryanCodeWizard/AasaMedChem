import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { sql } from '@/lib/db';
import { createQuotationSchema } from '@/lib/validations/quotation';
import { calculateLineTotal, sumLineTotals } from '@/lib/units/calculations';

// GET /api/quotations
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;
  const isAdmin = role === 'admin';

  try {
    let quotations;
    let countResult;

    if (isAdmin) {
      quotations = await sql`
        SELECT q.*, u.name as seller_name, u.email as seller_email,
               r.name as reviewer_name
        FROM quotations q
        JOIN users u ON u.id = q.seller_id
        LEFT JOIN users r ON r.id = q.reviewed_by
        ${status ? sql`WHERE q.status = ${status}` : sql``}
        ORDER BY q.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM quotations
        ${status ? sql`WHERE status = ${status}` : sql``}
      `;
    } else {
      quotations = await sql`
        SELECT q.*, u.name as seller_name, u.email as seller_email,
               r.name as reviewer_name
        FROM quotations q
        JOIN users u ON u.id = q.seller_id
        LEFT JOIN users r ON r.id = q.reviewed_by
        WHERE q.seller_id = ${userId}::uuid
        ${status ? sql`AND q.status = ${status}` : sql``}
        ORDER BY q.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM quotations
        WHERE seller_id = ${userId}::uuid
        ${status ? sql`AND status = ${status}` : sql``}
      `;
    }

    const total = parseInt(countResult[0]?.total || '0');

    return NextResponse.json({
      data: quotations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/quotations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quotations — seller places a new quotation
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role: string }).role !== 'seller') {
    return NextResponse.json({ error: 'Only sellers can place quotations' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parseResult = createQuotationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const sellerId = (session.user as { id: string }).id;

    // Fetch all product IDs + units in one query
    const productIds = [...new Set(data.items.map(i => i.product_id))];
    const products = await sql`
      SELECT id, name, base_unit, allowed_units, price_per_base_unit, is_active, stock_quantity
      FROM products
      WHERE id = ANY(${productIds}::uuid[])
    `;

    const productMap = new Map(products.map(p => [p.id, p]));
    const stockWarnings: string[] = [];

    // Validate each item
    for (const item of data.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found` },
          { status: 400 }
        );
      }
      if (!product.is_active) {
        return NextResponse.json(
          { error: `Product '${product.name}' is no longer available` },
          { status: 400 }
        );
      }
      const allowedUnits = product.allowed_units as string[];
      if (!allowedUnits.includes(item.ordered_unit)) {
        return NextResponse.json(
          { error: `Unit '${item.ordered_unit}' not allowed for product '${product.name}'. Allowed: ${allowedUnits.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Fetch unit conversion factors
    const unitCodes = [...new Set(data.items.map(i => i.ordered_unit))];
    const units = await sql`SELECT code, to_base, base_unit FROM units WHERE code = ANY(${unitCodes})`;
    const unitMap = new Map(units.map(u => [u.code, u]));

    // Calculate line items
    const lineItems = data.items.map(item => {
      const product = productMap.get(item.product_id)!;
      const unit = unitMap.get(item.ordered_unit)!;

      const { baseQty, lineTotal } = calculateLineTotal(
        item.ordered_qty,
        unit.to_base,
        product.price_per_base_unit
      );

      // Check stock
      if (parseFloat(baseQty) > parseFloat(product.stock_quantity)) {
        stockWarnings.push(`${product.name}: requested ${baseQty} ${product.base_unit}, available ${product.stock_quantity} ${product.base_unit}`);
      }

      return {
        product_id: item.product_id,
        product_name: product.name,
        ordered_unit: item.ordered_unit,
        ordered_qty: item.ordered_qty,
        base_unit: product.base_unit,
        base_qty: baseQty,
        unit_price_snapshot: product.price_per_base_unit,
        line_total_inr: lineTotal,
      };
    });

    const subtotal = sumLineTotals(lineItems.map(li => li.line_total_inr));

    // Generate quotation number + insert in transaction
    const [quotation] = await sql`
      WITH new_no AS (
        SELECT 'QT-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('quotation_seq')::text, 5, '0') AS quotation_no
      )
      INSERT INTO quotations (quotation_no, seller_id, notes, subtotal_inr, total_inr)
      SELECT quotation_no, ${sellerId}::uuid, ${data.notes || null}, ${subtotal}, ${subtotal}
      FROM new_no
      RETURNING *
    `;

    // Insert line items
    for (const li of lineItems) {
      await sql`
        INSERT INTO quotation_line_items
          (quotation_id, product_id, ordered_unit, ordered_qty, base_unit, base_qty, unit_price_snapshot, line_total_inr)
        VALUES (
          ${quotation.id}::uuid,
          ${li.product_id}::uuid,
          ${li.ordered_unit},
          ${li.ordered_qty},
          ${li.base_unit},
          ${li.base_qty},
          ${li.unit_price_snapshot},
          ${li.line_total_inr}
        )
      `;
    }

    return NextResponse.json({
      data: {
        ...quotation,
        items: lineItems,
        stock_warnings: stockWarnings.length > 0 ? stockWarnings : undefined,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/quotations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
