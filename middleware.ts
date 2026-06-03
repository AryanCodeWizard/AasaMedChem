import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    // Admin trying to access seller routes
    if (pathname.startsWith('/seller') && role !== 'seller') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    // Seller trying to access admin routes
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/seller', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/seller/:path*',
    '/api/products/:path*',
    '/api/quotations/:path*',
    '/api/users/:path*',
  ],
};
