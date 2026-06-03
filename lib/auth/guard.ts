import { getServerSession } from 'next-auth';
import { authOptions } from './config';
import { NextResponse } from 'next/server';

type Role = 'admin' | 'seller';

export async function requireRole(allowedRoles: Role[]) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
    };
  }

  const userRole = (session.user as { role: string }).role as Role;

  if (!allowedRoles.includes(userRole)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}

export async function getSession() {
  return getServerSession(authOptions);
}
