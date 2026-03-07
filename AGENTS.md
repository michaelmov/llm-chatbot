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
```

**Node.js requirement:** `>=22.17.0`

## Architecture

Single Next.js 16 application with API Route Handlers for server-side logic. SSE-based streaming chat with user authentication.

### Directory Structure

- `app/` — Next.js app router (pages, API routes, components, hooks)
- `app/api/` — API Route Handlers (chat, conversations, auth, health)
- `app/components/` — Chat UI components (ChatContainer, MessageList, MessageBubble, ChatInput, AppSidebar)
- `app/components/llm-output/` — Streaming markdown rendering with `@llm-ui/*` + Shiki v3
- `app/hooks/` — Custom hooks (useChat, useConversations, useConversation)
- `components/` — Shared UI components (shadcn/ui, theme-provider, mode-toggle)
- `hooks/` — Root-level hooks (use-mobile)
- `lib/` — Client utilities (auth-client.ts, api.ts, sse.ts, utils.ts)
- `lib/auth.ts` — better-auth server instance
- `lib/server/` — Server-only code (config, db, services, providers, tools, validation, logger)
- `drizzle/` — Database migration files

### API Routes

All routes use `getAuthenticatedUserId()` from `lib/server/auth-helpers.ts` for auth.

**Chat** (`app/api/chat/route.ts`):

| Method | Path        | Description                 |
| ------ | ----------- | --------------------------- |
| `POST` | `/api/chat` | SSE streaming chat endpoint |

**Conversations** (`app/api/conversations/`):

| Method   | Path                     | Description                                |
| -------- | ------------------------ | ------------------------------------------ |
| `POST`   | `/api/conversations`     | Create conversation                        |
| `GET`    | `/api/conversations`     | List user's conversations                  |
| `GET`    | `/api/conversations/:id` | Get conversation with messages             |
| `DELETE` | `/api/conversations/:id` | Delete conversation (cascades to messages) |

**Auth** (`app/api/auth/[...all]/route.ts`): better-auth catch-all handler via `toNextJsHandler(auth)`.

**Health** (`app/api/health/route.ts`): `GET /api/health` returns status, provider, model.

### SSE Streaming Protocol

Client sends `POST /api/chat` with JSON body `{ requestId, messages, conversationId? }`. Server responds with an SSE stream:

| Event   | Payload                               | Description          |
| ------- | ------------------------------------- | -------------------- |
| `start` | `{ requestId, conversationId }`       | Stream started       |
| `token` | `{ token }`                           | Individual LLM token |
| `done`  | `{ requestId, text, conversationId }` | Streaming complete   |
| `error` | `{ error, requestId? }`               | Error occurred       |

SSE in Route Handlers uses `new ReadableStream()` with `controller.enqueue()` for events and `request.signal` for abort detection.

### Server Logic (`lib/server/`)

- `config.ts` — Environment-based configuration
- `db/` — Drizzle ORM client and schema
- `services/` — conversation.service.ts, message.service.ts
- `providers/` — LLMProvider interface + Anthropic implementation via LangChain
- `tools/` — LangChain tools (weather, forecast, datetime)
- `validation/chat.ts` — Chat request validation (max 50,000 chars)
- `auth-helpers.ts` — `getAuthenticatedUserId()` and `unauthorizedResponse()` helpers
- `logger.ts` — Structured logging

### Authentication

Uses [better-auth](https://www.better-auth.com/) with email/password and a Bearer token plugin.

- `lib/auth.ts` — Server-side better-auth instance with Drizzle adapter
- `lib/auth-client.ts` — Client-side auth (signIn, signUp, signOut, useSession)
- `lib/api.ts` — `apiFetch()` helper with Bearer token
- `middleware.ts` — Protects routes, validates session via `/api/auth/get-session`

### Database

PostgreSQL 17 with Drizzle ORM and postgres.js driver. Schema in `lib/server/db/schema.ts`. Migrations in `drizzle/`, config in `drizzle.config.ts`.

**Chat tables:** `conversations`, `messages`

**Better-auth managed tables** (do not modify manually): `user`, `session`, `account`, `verification`

### Frontend

Next.js 16 with React 19, Tailwind CSS 4, shadcn/ui components.

**Pages:** `/sign-in`, `/sign-up`, `/` (redirects to `/c`), `/c` (new chat), `/c/[conversationId]`

**Key features:**
- `useChat.ts` — SSE streaming with AbortController cancellation
- `LLMOutputRenderer` — Streaming markdown with Shiki v3 code highlighting
- `AppSidebar` — Conversation list, user info, delete actions
- `next-themes` dark mode with class-based toggle

## Docker

**Production** (`docker-compose.yml`) — postgres + single Next.js app:

```bash
docker compose up
```

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
DATABASE_URL=postgresql://chatbot:chatbot_dev@localhost:5432/chatbot
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
```

Generate `BETTER_AUTH_SECRET` with: `openssl rand -base64 32`

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
