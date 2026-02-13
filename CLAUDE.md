# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run both backend and frontend
npm run dev

# Run individually
npm run dev:backend    # tsx watch src/index.ts (port 3001)
npm run dev:frontend   # next dev (port 3000)

# Run everything with Docker infra (postgres + redis)
npm run dev:with-docker

# Build
npm run build          # Builds both workspaces

# Lint & Format
npm run lint           # Lints both workspaces
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

# Redis
npm run redis:start    # Start Redis container
npm run redis:stop     # Stop Redis container
```

**Node.js requirement:** `>=22.17.0`

## Architecture

This is a monorepo (npm workspaces) with a WebSocket-based streaming chat application with user authentication.

### Backend (`/backend`)

Express server with WebSocket support for real-time LLM streaming using LangChain.

**Request flow:** `index.ts` → `server.ts` (creates Express + WSS) → `websocket/handler.ts` (manages connections) → `providers/` (LLM integration)

**Provider pattern:** The `LLMProvider` interface (`providers/types.ts`) defines the contract for LLM integrations. Currently uses Anthropic via LangChain with agent support for tool calling. Providers are registered in `providers/factory.ts`.

**Tools:** LangChain tools are defined in `tools/`:

- `weatherTool` — get current weather for a location
- `weatherForecastTool` — get 5-day weather forecast
- `dateTimeTool` — get current date and time (`tools/datetime.ts`)

**WebSocket protocol:**

- Client sends: `chat` (with requestId + messages), `cancel`, `ping`
- Server responds: `ready`, `start`, `token`, `done`, `error`, `canceled`, `pong`

**Validation:** Messages validated in `websocket/validation.ts` with max payload size of 50,000 chars.

**Health endpoint:** `GET /health` returns provider and model info.

### Authentication

Uses [better-auth](https://www.better-auth.com/) with email/password and a Bearer token plugin.

**Backend setup** (`auth.ts`):
- `betterAuth()` configured with Drizzle adapter, `emailAndPassword` enabled, `bearer()` plugin
- Auth REST endpoints mounted at `/api/auth/*` via `toNodeHandler(auth)` in `server.ts`
- Cross-subdomain cookie support via `COOKIE_DOMAIN` config

**Middleware** (`middleware/auth.ts`):
- `requireAuth` — validates `Authorization: Bearer <token>` header, calls `auth.api.getSession()`, sets `req.userId`
- Applied to all `/api/conversations` routes and `POST /api/ws/ticket`

**Frontend** (`lib/auth-client.ts`):
- `createAuthClient()` from `better-auth/react` exposes `signIn`, `signUp`, `signOut`, `useSession`
- All API calls include `credentials: 'include'` for cookie-based sessions
- `apiFetch()` helper (`lib/api.ts`) attaches `Authorization: Bearer <token>` header

**Next.js middleware** (`frontend/middleware.ts`):
- Protects all routes except `/sign-in`, `/sign-up`, and static assets
- Checks for `better-auth.session_token` cookie, validates against backend's `/api/auth/get-session`
- Redirects unauthenticated users to `/sign-in`

### WebSocket Authentication

Ticket-based auth flow to avoid sending long-lived tokens over WebSocket:

1. Client calls `POST /api/ws/ticket` with Bearer token → receives a 30-second one-time ticket (stored in Redis)
2. Client connects to `ws://localhost:3001/ws?ticket={ticket}`
3. Server validates ticket during HTTP upgrade via `ticketService.validate()` (atomic `GETDEL` — single-use)
4. On success, `userId` is mapped to the WebSocket connection via `WeakMap` in `server.ts`

**Key files:** `services/ticket-service.ts`, `routes/ws-ticket.ts`, `server.ts` (upgrade handler)

### REST API Routes

**Conversations** (`routes/conversations.ts`) — all require `requireAuth`:

| Method   | Path                       | Description                           |
| -------- | -------------------------- | ------------------------------------- |
| `POST`   | `/api/conversations`       | Create conversation                   |
| `GET`    | `/api/conversations`       | List user's conversations             |
| `GET`    | `/api/conversations/:id`   | Get conversation with messages        |
| `DELETE` | `/api/conversations/:id`   | Delete conversation (cascades to messages) |

**WebSocket ticket** (`routes/ws-ticket.ts`):

| Method | Path              | Description                  |
| ------ | ----------------- | ---------------------------- |
| `POST` | `/api/ws/ticket`  | Get one-time WebSocket ticket |

### Services Layer

- `conversation.service.ts` — CRUD + `touch()` (updates `updatedAt` timestamp)
- `message.service.ts` — create message + list by conversation
- `ticket-service.ts` — create/validate WebSocket tickets in Redis (30s TTL, single-use via `GETDEL`)

### Database

PostgreSQL 17 with Drizzle ORM and postgres.js driver. Schema in `db/schema.ts`. Migrations in `backend/drizzle/`, config in `backend/drizzle.config.ts`.

**Chat tables:**
- `conversations` — id, userId, title, timestamps
- `messages` — id, conversationId, role (user/assistant/system), content, timestamp

**Better-auth managed tables** (auto-managed, do not modify manually):
- `user` — id, name, email, emailVerified, image, timestamps
- `session` — id, token, expiresAt, userId, timestamps
- `account` — id, accountId, providerId, userId, tokens
- `verification` — id, identifier, value, expiresAt

### Redis

`ioredis` with lazy connect (`redis.ts`). Connected on server start via `connectRedis()`.

- Used for WebSocket ticket storage (30s TTL keys with `ws-ticket:` prefix)
- Config: `REDIS_URL` env var (defaults to `redis://localhost:6379`)

### Logging

Structured logging via `utils/logger.ts` — outputs `[timestamp] [LEVEL] message {metadata}`. Methods: `info`, `warn`, `error`, `debug`.

### Frontend (`/frontend`)

Next.js 16 with React 19, using Tailwind CSS 4 and shadcn/ui components.

**Directory structure:**

- `/frontend/app/` — Next.js app router pages and app-specific components
- `/frontend/app/components/` — Chat components (ChatContainer, MessageList, MessageBubble, ChatInput, StatusIndicator, AppSidebar)
- `/frontend/app/components/llm-output/` — LLMOutputRenderer, LLMOutputDynamic (streaming markdown + code blocks with `@llm-ui/*` + Shiki v3)
- `/frontend/app/hooks/` — Custom hooks (useWebSocket, useConversations, useConversation)
- `/frontend/components/` — Shared UI components (ui/, theme-provider, mode-toggle)
- `/frontend/lib/` — Utilities (auth-client.ts, api.ts)

**Pages:**

- `/sign-in`, `/sign-up` — auth pages
- `/` — redirects to `/c`
- `/c` — new chat
- `/c/[conversationId]` — existing conversation

**Component hierarchy:** `layout.tsx` (theme provider, sidebar) → `page.tsx` → `ChatContainer.tsx` (orchestrates state, WebSocket hook) → `MessageList`, `MessageBubble`, `ChatInput`, `StatusIndicator`

**Key features:**

- `useWebSocket.ts` manages connection lifecycle, reconnection (3s delay), and 30s keep-alive pings
- `useConversations.ts` / `useConversation.ts` — React Query hooks for conversation CRUD
- `LLMOutputRenderer` — streaming markdown rendering with code syntax highlighting via `@llm-ui/*` and Shiki v3
- `AppSidebar` — conversation list, user info, delete actions
- System messages filtered from UI display
- UUID-based message and request tracking

**Theming:** Uses `next-themes` with class-based dark mode. Theme toggle in `components/mode-toggle.tsx`.

### Communication

Frontend connects to `ws://localhost:3001/ws?ticket={ticket}` (ticket obtained via `POST /api/ws/ticket`). Messages stream as individual tokens with request IDs for tracking. Supports cancellation mid-stream.

## Docker

**Production** (`docker-compose.yml`) — full stack with postgres, redis, backend, frontend:

```bash
docker compose up
```

**Development infrastructure** (`docker-compose.dev.yml`) — postgres + redis only:

```bash
docker compose -f docker-compose.dev.yml up -d
```

## Environment Setup

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

```
PORT=3001
LLM_PROVIDER=anthropic
MODEL_NAME=claude-3-5-sonnet-latest
MODEL_TEMPERATURE=0.3
MODEL_MAX_TOKENS=4096
ANTHROPIC_API_KEY=your-api-key-here
WEATHER_API_KEY=your-weather-api-key-here  # From weatherapi.com
DATABASE_URL=postgresql://chatbot:chatbot_dev@localhost:5432/chatbot
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BACKEND_URL=http://localhost:3001
# COOKIE_DOMAIN=.example.com  # Only for production with separate subdomains
```

Generate `BETTER_AUTH_SECRET` with: `openssl rand -base64 32`

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Code Quality

**ESLint:** Separate configs for backend (`backend/eslint.config.mjs`) and frontend (`frontend/eslint.config.mjs` with Next.js rules).

**Prettier:** Root config (`.prettierrc`) — single quotes, 2-space tabs, 100 char width, trailing commas.

## Adding New LLM Providers

1. Create class implementing `LLMProvider` in `backend/src/providers/`
2. Register in `backend/src/providers/factory.ts`
3. Add required env vars to config

## Adding New Tools

1. Define tool using LangChain's `tool()` helper with Zod schema in `backend/src/tools/`
2. Export from `backend/src/tools/index.ts`
3. Tools are automatically available to the LangChain agent
