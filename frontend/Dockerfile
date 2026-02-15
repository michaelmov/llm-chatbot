# syntax=docker/dockerfile:1

# Frontend Production Dockerfile
# Multi-stage build with Next.js standalone output
# Build context should be the monorepo root

FROM node:22.17.0-alpine3.21 AS deps

WORKDIR /app

# Copy root package files (monorepo uses root package-lock.json)
# All workspace package.json files must be present for npm workspaces to work
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all dependencies (npm workspaces requires full install for proper resolution)
RUN npm ci


FROM node:22.17.0-alpine3.21 AS builder

WORKDIR /app

# Copy package files and dependencies from deps stage
COPY --from=deps /app/package.json ./
COPY --from=deps /app/package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/package.json ./backend/

# Copy frontend source code (includes package.json)
COPY frontend/ ./frontend/

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/frontend

# Build Next.js
RUN npm run build


FROM node:22.17.0-alpine3.21 AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

WORKDIR /app/frontend

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check using wget (included in Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
