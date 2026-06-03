import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8-hour sessions
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Missing email or password');
          }

          const rows = await sql`
            SELECT id, email, password_hash, name, role, is_active
            FROM users
            WHERE email = ${credentials.email.toLowerCase()}
            AND is_active = true
            LIMIT 1
          `;

          if (!rows || rows.length === 0) {
            // No user found
            throw new Error('Invalid email or password');
          }

          const user = rows[0];
          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) {
            throw new Error('Invalid email or password');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (err: any) {
          // Log server-side for visibility in Vercel logs, but do not expose sensitive details to clients
          console.error('NextAuth authorize error:', err?.message ?? err);
          // Propagate a generic message so the client receives an error via NextAuth
          throw new Error(err?.message || 'Authentication failed');
        }
      },
    }),
  ],
  //to prevengt multiple db queries to get user role in each request, we can add role to jwt token and session
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string; id: string }).role = token.role as string;
        (session.user as { role: string; id: string }).id = token.id as string;
      }
      return session;
    },
  },
};
