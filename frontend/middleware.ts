import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/sign-in', '/sign-up'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('better-auth.session_token');

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  try {
    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/api/auth/get-session`, {
      headers: {
        cookie: `better-auth.session_token=${sessionCookie.value}`,
      },
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const data = await res.json();
    if (!data?.session) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
