import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  // Protect /super-admin/* routes: require isSuperAdmin
  if (pathname.startsWith('/super-admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', nextUrl));
    }
    if (!session.user?.isSuperAdmin) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // Protect /dashboard/* routes: require auth
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/portal')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', nextUrl));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/portal/:path*',
    '/super-admin/:path*',
  ],
};
