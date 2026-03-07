import { auth } from '@/lib/auth';

export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const session = await auth.api.getSession({
      headers: new Headers({ authorization: authHeader }),
    });

    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
