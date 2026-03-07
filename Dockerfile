# syntax=docker/dockerfile:1

# Production Dockerfile — Single Next.js app
# Multi-stage build with standalone output

FROM node:22.17.0-alpine3.21 AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps

FROM node:22.17.0-alpine3.21 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM node:22.17.0-alpine3.21 AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy drizzle migrations
COPY --from=builder /app/drizzle ./drizzle

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
