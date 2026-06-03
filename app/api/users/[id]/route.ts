import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { sql } from '@/lib/db';
import { updateUserSchema } from '@/lib/validations/user';

// GET /api/users/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [user] = await sql`
      SELECT id, email, name, role, is_active, created_at, updated_at
      FROM users WHERE id = ${id}::uuid
    `;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const currentUserId = (session.user as { id: string }).id;

  // Prevent self-demotion or self-deactivation
  if (id === currentUserId) {
    const body = await request.json();
    if (body.is_active === false || body.role === 'seller') {
      return NextResponse.json({ error: 'Cannot demote or deactivate yourself' }, { status: 400 });
    }
  }

  try {
    const body = id === currentUserId ? await request.json().catch(() => ({})) : await request.json();
    const parseResult = updateUserSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const [user] = await sql`
      UPDATE users SET
        name = COALESCE(${data.name ?? null}, name),
        email = COALESCE(${data.email ?? null}, email),
        role = COALESCE(${data.role ?? null}, role),
        is_active = COALESCE(${data.is_active ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, email, name, role, is_active, updated_at
    `;

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id] — soft delete (deactivate)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const currentUserId = (session.user as { id: string }).id;

  if (id === currentUserId) {
    return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
  }

  try {
    const [user] = await sql`
      UPDATE users SET is_active = false, updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, name
    `;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ message: `User '${user.name}' deactivated`, data: user });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
