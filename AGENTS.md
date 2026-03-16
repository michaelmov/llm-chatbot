# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run development server (port 3000)
npm run dev

# Build
npm run build

# Start production server
npm run start

# Lint & Format
npm run lint           # Lint with ESLint
npm run lint:fix       # Auto-fix lint issues
npm run format         # Format with Prettier
npm run format:check   # Check formatting

# Database
npm run db:start       # Start PostgreSQL container
npm run db:stop        # Stop PostgreSQL container
npm run db:reset       # Reset database (removes volumes)
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run Drizzle migrations
npm run db:push        # Push schema directly
npm run db:studio      # Open Drizzle Studio

# Deployment
npm run deploy              # Run migrations + SST deploy (production)
npm run db:migrate:prod     # Run migrations only via SST shell (production)
```

**Node.js requirement:** `>=22.17.0`

## Architecture

Single Next.js 16 application with API Route Handlers for chat streaming and server actions for data mutations. SSE-based streaming chat with cookie-based authentication.

### Directory Structure

- `app/` — Next.js app router (pages, API routes, components, hooks)
- `app/api/` — API Route Handlers (chat, auth, health)
- `app/c/` — Chat route group (`ChatProvider.tsx`, `actions.ts`, layouts, pages)
- `app/components/` — Chat UI components (ChatContainer, MessageList, MessageBubble, ChatInput, AppSidebar, AuthCard)
- `app/components/llm-output/` — Streaming markdown rendering with `@llm-ui/*` + Shiki v3
- `app/hooks/` — Custom hooks (useChat, use-mobile)
- `components/` — Shared UI components (shadcn/ui, theme-provider, mode-toggle)
- `lib/` — Client utilities (auth-client.ts, sse.ts, utils.ts)
- `lib/auth.ts` — better-auth server instance
- `lib/server/` — Server-only code (config, db, services, providers, tools, validation, logger)
- `proxy.ts` — Auth proxy (replaces middleware.ts), redirects unauthenticated users
- `drizzle/` — Database migration files

### API Routes

Route handlers use `getAuthenticatedUserId(request)` from `lib/server/auth-helpers.ts` for auth.

**Chat** (`app/api/chat/route.ts`):

| Method | Path        | Description                 |
| ------ | ----------- | --------------------------- |
| `POST` | `/api/chat` | SSE streaming chat endpoint |

**Auth** (`app/api/auth/[...all]/route.ts`): better-auth catch-all handler via `toNextJsHandler(auth)`.

**Health** (`app/api/health/route.ts`): `GET /api/health` returns status, provider, model.

### Server Actions

Conversation management uses server actions instead of API routes:

- `app/c/actions.ts` — `deleteConversation(conversationId)`: deletes a conversation and revalidates `/c`

Conversations are loaded server-side in layouts/pages using service functions directly.

### SSE Streaming Protocol

Client sends `POST /api/chat` with JSON body `{ requestId, messages, conversationId? }`. Server responds with an SSE stream:

| Event   | Payload                               | Description          |
| ------- | ------------------------------------- | -------------------- |
| `start` | `{ requestId, conversationId }`       | Stream started       |
| `token` | `{ token }`                           | Individual LLM token |
| `done`  | `{ requestId, text, conversationId }` | Streaming complete   |
| `title` | `{ conversationId, title }`           | Auto-generated title |
| `error` | `{ error, requestId? }`               | Error occurred       |

SSE in Route Handlers uses `new ReadableStream()` with `controller.enqueue()` for events and `request.signal` for abort detection.

### Server Logic (`lib/server/`)

- `config.ts` — Environment-based configuration
- `db/` — Drizzle ORM client and schema
- `services/` — conversation.service.ts, message.service.ts, title.service.ts
- `providers/` — LLMProvider interface + Anthropic implementation via LangChain
- `tools/` — LangChain tools (weather, weather forecast, datetime)
- `validation/chat.ts` — Chat request validation (max 50,000 chars)
- `auth-helpers.ts` — `getSessionUser()` (cached, for server components/actions) and `getAuthenticatedUserId(request)` (for route handlers), plus `unauthorizedResponse()` helper
- `logger.ts` — Structured logging

### Authentication

Uses [better-auth](https://www.better-auth.com/) with email/password. Cookie-based auth (httpOnly, secure, sameSite: lax) with cross-subdomain support.

- `lib/auth.ts` — Server-side better-auth instance with Drizzle adapter, cross-subdomain cookie config
- `lib/auth-client.ts` — Client-side auth (signIn, signUp, signOut, useSession) with `credentials: 'include'`
- `lib/server/auth-helpers.ts` — `getSessionUser()` (React `cache()`, for server components/actions) and `getAuthenticatedUserId(request)` (for route handlers)
- `proxy.ts` — Auth proxy, checks public paths (`/sign-in`, `/sign-up`, `/api/auth`), redirects unauthenticated users to `/sign-in`

### Database

PostgreSQL 17 with Drizzle ORM and postgres.js driver. Schema in `lib/server/db/schema.ts`. Migrations in `drizzle/`, config in `drizzle.config.ts`.

**Chat tables:** `conversations`, `messages`

**Better-auth managed tables** (do not modify manually): `user`, `session`, `account`, `verification`

### Frontend

Next.js 16 with React 19, Tailwind CSS 4, shadcn/ui components.

**Pages:** `/sign-in`, `/sign-up`, `/` (redirects to `/c`), `/c` (new chat), `/c/[conversationId]`

**Key features:**

- `ChatProvider.tsx` (`app/c/`) — Client-side chat context, manages per-conversation local message state, SSE streaming lifecycle, and router navigation on new conversations
- `useChat.ts` — SSE streaming hook with AbortController cancellation, used by ChatProvider
- `LLMOutputRenderer` — Streaming markdown with Shiki v3 code highlighting
- `AppSidebar` — Conversation list, user info, delete actions (via server action)
- `AuthCard.tsx` — Shared auth form component used by sign-in/sign-up pages
- `next-themes` dark mode with class-based toggle
- Conversations loaded server-side in layouts; mutations via server actions

## Docker

**Development infrastructure** (`docker-compose.dev.yml`) — postgres only:

```bash
docker compose -f docker-compose.dev.yml up -d
```

## Environment Setup

Single `.env.local` file at root. Copy from `.env.example`:

```
LLM_PROVIDER=anthropic
MODEL_NAME=claude-sonnet-4-5-20250929
MODEL_TEMPERATURE=0.3
MODEL_MAX_TOKENS=4096
ANTHROPIC_API_KEY=your-api-key-here
WEATHER_API_KEY=your-weather-api-key-here
TITLE_MODEL_NAME=claude-haiku-4-5-20251001
DATABASE_URL=postgresql://chatbot:chatbot_dev@localhost:5432/chatbot
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BASE_URL=https://yourdomain.com
# COOKIE_DOMAIN=.example.com   (optional, for cross-subdomain cookies)
# COOKIE_SECURE=true            (optional, defaults based on environment)
```

Generate `BETTER_AUTH_SECRET` with: `openssl rand -base64 32`

`BASE_URL` defaults to `http://localhost:3000` for development. Set it to your production domain for deployment.

## Code Quality

**ESLint:** `eslint.config.mjs` with Next.js core-web-vitals + TypeScript rules.

**Prettier:** Root config (`.prettierrc`) — single quotes, 2-space tabs, 100 char width, trailing commas.

## Adding New LLM Providers

1. Create class implementing `LLMProvider` in `lib/server/providers/`
2. Register in `lib/server/providers/factory.ts`
3. Add required env vars to config

## Adding New Tools

1. Define tool using LangChain's `tool()` helper with Zod schema in `lib/server/tools/`
2. Export from `lib/server/tools/index.ts`
3. Tools are automatically available to the LangChain agent
