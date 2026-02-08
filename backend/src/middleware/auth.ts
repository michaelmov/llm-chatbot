import type { Request, Response, NextFunction } from 'express';
import { auth } from '../auth.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId: string;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const session = await auth.api.getSession({
      headers: new Headers({ authorization: authHeader }),
    });

    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.userId = session.user.id;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
