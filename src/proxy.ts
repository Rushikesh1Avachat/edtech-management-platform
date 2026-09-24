import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/dashboard/admin');
  const isInstructorRoute = pathname.startsWith('/dashboard/instructor');

  if (!isDashboard) {
    return NextResponse.next();
  }

  const token = request.cookies.get('edutrack_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = await verifyToken(token);

  if (!user) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('edutrack_token');
    return response;
  }

  if (isAdminRoute && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isInstructorRoute && user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-role', user.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
