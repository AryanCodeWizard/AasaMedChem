import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { sql } from '@/lib/db';
import { updateQuotationSchema } from '@/lib/validations/quotation';

// GET /api/quotations/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  try {
    const [quotation] = await sql`
      SELECT q.*, u.name as seller_name, u.email as seller_email,
             r.name as reviewer_name
      FROM quotations q
      JOIN users u ON u.id = q.seller_id
      LEFT JOIN users r ON r.id = q.reviewed_by
      WHERE q.id = ${id}::uuid
    `;

    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    // Seller can only see their own
    if (role !== 'admin' && quotation.seller_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch line items with product info
    const lineItems = await sql`
      SELECT qli.*, p.name as product_name, p.sku as product_sku
      FROM quotation_line_items qli
      JOIN products p ON p.id = qli.product_id
      WHERE qli.quotation_id = ${id}::uuid
      ORDER BY qli.created_at ASC
    `;

    return NextResponse.json({ data: { ...quotation, items: lineItems } });
  } catch (error) {
    console.error('GET /api/quotations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/quotations/[id] — approve/reject (admin) or cancel (seller, own pending)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  try {
    const body = await request.json();
    const parseResult = updateQuotationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, admin_notes } = parseResult.data;

    const [quotation] = await sql`SELECT * FROM quotations WHERE id = ${id}::uuid`;
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    // Role-based action checks
    if (action === 'cancel') {
      if (role === 'admin') {
        // admin can cancel any
      } else if (quotation.seller_id !== userId) {
        return NextResponse.json({ error: 'Forbidden: not your quotation' }, { status: 403 });
      }
      if (quotation.status !== 'pending') {
        return NextResponse.json(
          { error: `Cannot cancel a quotation with status '${quotation.status}'` },
          { status: 400 }
        );
      }
    } else {
      // approve / reject — admin only
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: only admins can approve or reject' }, { status: 403 });
      }
      if (quotation.status !== 'pending') {
        return NextResponse.json(
          { error: `Quotation is already '${quotation.status}'` },
          { status: 400 }
        );
      }
    }

    // For approve: decrement stock with FOR UPDATE lock
    if (action === 'approve') {
      const lineItems = await sql`
        SELECT * FROM quotation_line_items WHERE quotation_id = ${id}::uuid
      `;

      const insufficientStock: string[] = [];
      for (const li of lineItems) {
        const [product] = await sql`
          SELECT id, name, stock_quantity FROM products
          WHERE id = ${li.product_id}::uuid
          FOR UPDATE
        `;
        if (parseFloat(product.stock_quantity) < parseFloat(li.base_qty)) {
          insufficientStock.push(
            `${product.name}: need ${li.base_qty} ${li.base_unit}, have ${product.stock_quantity} ${li.base_unit}`
          );
        }
      }

      if (insufficientStock.length > 0) {
        return NextResponse.json(
          { error: 'Insufficient stock', items: insufficientStock },
          { status: 400 }
        );
      }

      // Decrement stock
      for (const li of lineItems) {
        await sql`
          UPDATE products
          SET stock_quantity = stock_quantity - ${li.base_qty}::numeric, updated_at = NOW()
          WHERE id = ${li.product_id}::uuid
        `;
      }
    }

    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';

    const [updated] = await sql`
      UPDATE quotations SET
        status = ${newStatus},
        admin_notes = COALESCE(${admin_notes || null}, admin_notes),
        reviewed_by = ${role === 'admin' ? userId : null},
        reviewed_at = ${role === 'admin' ? 'NOW()' : null},
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/quotations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
