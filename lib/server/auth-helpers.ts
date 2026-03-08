import { cache } from 'react';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';

// Deduplicated per-request via React cache() — layout + page share one call
export const getSessionUser = cache(async () => {
  const cookieStore = await cookies();
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieStore.toString() }),
  });
  return session?.user ?? null;
});

// Used by /api/chat route handler — cookie-based auth from request
export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  try {
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
