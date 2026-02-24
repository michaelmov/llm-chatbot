import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { db } from './db/index.js';
import { config } from './config.js';

export const auth = betterAuth({
  baseURL: config.backendUrl,
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  secret: config.auth.secret,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [config.frontendUrl],
  plugins: [bearer()],
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
