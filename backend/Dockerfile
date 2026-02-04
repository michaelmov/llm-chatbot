# syntax=docker/dockerfile:1

# Backend Production Dockerfile
# Multi-stage build for minimal image size
# Build context should be the monorepo root

FROM node:22.17.0-alpine3.21 AS deps

WORKDIR /app

# Copy root package files (monorepo uses root package-lock.json)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install production dependencies only for backend workspace
RUN npm ci --omit=dev -w backend


FROM node:22.17.0-alpine3.21 AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install all dependencies (including devDependencies for build)
RUN npm ci -w backend

# Copy backend source code
COPY backend/ ./backend/

# Build TypeScript
RUN npm run build -w backend


FROM node:22.17.0-alpine3.21 AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled code from builder stage
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/

# Set ownership
RUN chown -R backend:nodejs /app

USER backend

WORKDIR /app/backend

# Expose port
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Health check using wget (included in Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
