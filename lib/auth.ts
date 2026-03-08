import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/server/db';
import { config } from '@/lib/server/config';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  secret: config.auth.secret,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: !!config.cookieDomain,
      domain: config.cookieDomain,
    },
    defaultCookieAttributes: {
      secure: config.cookieSecure,
      httpOnly: true,
      sameSite: 'lax' as const,
    },
  },
});
