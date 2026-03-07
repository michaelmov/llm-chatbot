import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/sign-in', '/sign-up', '/api/auth'];

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

  try {
    const res = await fetch(new URL('/api/auth/get-session', request.url), {
      headers: {
        cookie: request.headers.get('cookie') || '',
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
