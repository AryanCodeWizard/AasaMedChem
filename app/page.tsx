import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const role = (session.user as { role: string }).role;
  if (role === 'admin') redirect('/admin');
  redirect('/seller');
}
