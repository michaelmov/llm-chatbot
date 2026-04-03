# LLM Chatbot

A model-agnostic chatbot with SSE streaming, built with Next.js 16 (React 19, Tailwind CSS 4, shadcn/ui).

## Features

- Real-time token streaming via SSE (Server-Sent Events)
- User authentication (email/password via better-auth, cookie-based)
- Conversation management (create, list, delete via server actions) with auto-generated titles
- Model-agnostic architecture (currently supports Anthropic Claude)
- LangChain-based agent with tool calling support
- Built-in tools: weather (current + 5-day forecast), date/time
- Cancel in-progress requests
- Responsive chat UI with dark mode support
- Streaming markdown + code syntax highlighting (@llm-ui + Shiki v3)

## Prerequisites

- Node.js >=22.17.0
- npm
- Docker (optional, for local PostgreSQL)
- Anthropic API key
- Weather API key (optional, from [weatherapi.com](https://www.weatherapi.com/))

## Project Structure

```
/llm-chatbot
├── package.json              # Single package (no workspaces)
├── sst.config.ts             # SST v4 deployment config (AWS Lambda)
├── docker-compose.dev.yml    # Dev infrastructure (postgres)
├── proxy.ts                  # Auth proxy (redirects unauthenticated users)
├── app/
│   ├── page.tsx              # Root redirect → /c
│   ├── sign-in/              # Sign in page
│   ├── sign-up/              # Sign up page
│   ├── c/                    # Chat route group
│   │   ├── ChatProvider.tsx  # Client-side chat context (SSE streaming state)
│   │   ├── actions.ts        # Server actions (deleteConversation)
│   │   ├── layout.tsx        # Loads conversations server-side
│   │   └── [conversationId]/ # Individual conversation page
│   ├── api/
│   │   ├── chat/             # POST /api/chat (SSE streaming)
│   │   ├── auth/             # better-auth catch-all handler
│   │   └── health/           # GET /api/health
│   ├── components/           # Chat UI + AppSidebar + AuthCard + LLM output renderer
│   └── hooks/                # useChat, use-mobile
├── components/               # Shared UI components (shadcn/ui)
├── lib/
│   ├── auth.ts               # better-auth server instance
│   ├── auth-client.ts        # Client-side auth (credentials: 'include')
│   ├── sse.ts                # SSE stream reader
│   ├── utils.ts              # Utility functions
│   └── server/               # Server-only code
│       ├── config.ts         # Environment-based configuration
│       ├── db/               # Drizzle ORM client & schema
│       ├── services/         # Conversation & message services
│       ├── providers/        # LLM provider implementations
│       ├── tools/            # LangChain tools (weather, datetime)
│       ├── validation/       # Request validation
│       ├── auth-helpers.ts   # getSessionUser(), getAuthenticatedUserId()
│       └── logger.ts         # Structured logging
└── drizzle/                  # Database migration files
```

## Setup

1. **Clone and install dependencies:**

   ```bash
   npm install --legacy-peer-deps
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your auth secret:

   ```
   WEATHER_API_KEY=your-weather-api-key-here  # Optional, for weather tools
   BETTER_AUTH_SECRET=$(openssl rand -base64 32)
   ```

   > **Note:** Anthropic API keys are provided per-user via the Settings UI (stored encrypted in the database).

3. **Start the database:**

   ```bash
   npm run db:start
   npm run db:migrate
   ```

## Running the Application

### Development

```bash
# Start the app (database must be running)
npm run dev

# Or start everything including postgres database (Docker)
npm run dev:with-db
```

#### Database Commands

```bash
npm run db:start       # Start PostgreSQL container
npm run db:stop        # Stop PostgreSQL container
npm run db:reset       # Reset database (removes volumes)
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run Drizzle migrations
npm run db:push        # Push schema directly
npm run db:studio      # Open Drizzle Studio
```

#### Code Quality Commands

```bash
npm run lint           # Lint with ESLint
npm run lint:fix       # Auto-fix lint issues
npm run format         # Format with Prettier
npm run format:check   # Check formatting
```

### Deployment (AWS SST)

This app deploys to AWS using [SST v4](https://sst.dev/) (serverless Next.js on Lambda + CloudFront).

**Set secrets** (stored in AWS SSM Parameter Store):

```bash
npx sst secret set AnthropicApiKey "sk-ant-..." --stage production
npx sst secret set BetterAuthSecret "$(openssl rand -base64 32)" --stage production
npx sst secret set DatabaseUrl "postgresql://user:pass@host:5432/db" --stage production
npx sst secret set WeatherApiKey "..." --stage production
npx sst secret set BaseUrl "https://your-cloudfront-url.cloudfront.net" --stage production
```

**Deploy to production:**

```bash
npm run deploy:prod        # Runs migrations + SST deploy
npm run db:migrate:prod    # Run migrations only (via SST shell)
```

After the first deploy, capture the printed CloudFront URL, set `BaseUrl`, and redeploy.

### Docker (Development)

**Development infrastructure** (postgres only):

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Access the Application

- App: http://localhost:3000
- Health: http://localhost:3000/api/health

## Authentication

Uses [better-auth](https://www.better-auth.com/) with email/password authentication. Cookie-based sessions (httpOnly, secure, sameSite: lax).

- **Sign up / Sign in** at `/sign-up` and `/sign-in`
- `proxy.ts` redirects unauthenticated users to `/sign-in`
- API route handlers use `getAuthenticatedUserId(request)` for auth
- Server components/actions use `getSessionUser()` (React `cache()`)

See `CLAUDE.md` for detailed architecture.

## SSE Streaming Protocol

### Client Request

`POST /api/chat` with JSON body:

```json
{
  "requestId": "uuid",
  "messages": [{ "role": "user", "content": "Hello" }],
  "conversationId": "uuid (optional)"
}
```

Cancellation: Abort the HTTP request via AbortController.

### Server SSE Events

| Event   | Payload                               | Description                                   |
| ------- | ------------------------------------- | --------------------------------------------- |
| `start` | `{ requestId, conversationId }`       | Stream started                                |
| `token` | `{ token }`                           | Individual token                              |
| `done`  | `{ requestId, text, conversationId }` | Streaming complete                            |
| `title` | `{ conversationId, title }`           | Auto-generated title (new conversations only) |
| `error` | `{ error, requestId? }`               | Error occurred                                |

## Configuration

| Variable             | Default                    | Description                               |
| -------------------- | -------------------------- | ----------------------------------------- |
| `LLM_PROVIDER`       | anthropic                  | LLM provider                              |
| `MODEL_NAME`         | claude-sonnet-4-5-20250929 | Model name                                |
| `MODEL_TEMPERATURE`  | 0.3                        | Temperature                               |
| `MODEL_MAX_TOKENS`   | 4096                       | Max tokens                                |
| `TITLE_MODEL_NAME`   | claude-haiku-4-5-20251001  | Model for auto-generating titles          |
| `WEATHER_API_KEY`    | -                          | Weather API key (optional)                |
| `DATABASE_URL`       | -                          | PostgreSQL connection URL                 |
| `BETTER_AUTH_SECRET` | -                          | Auth secret (`openssl rand -base64 32`)   |
| `BASE_URL`           | http://localhost:3000      | App URL (set for production)              |
| `DATABASE_SSL`       | -                          | Enable SSL for DB connection (optional)   |
| `COOKIE_DOMAIN`      | -                          | Cookie domain (optional, cross-subdomain) |
| `COOKIE_SECURE`      | -                          | Force secure cookies (optional)           |

> **Production secrets** (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `WEATHER_API_KEY`, `BASE_URL`) are managed via AWS SSM Parameter Store through SST. See [Deployment](#deployment-aws-sst) above. Anthropic API keys are stored per-user in the database (encrypted with `BETTER_AUTH_SECRET`).

## Adding New Providers

1. Create class implementing `LLMProvider` in `lib/server/providers/`
2. Register in `lib/server/providers/factory.ts`
3. Add required env vars to config

## Adding New Tools

1. Define a tool using LangChain's `tool()` helper with Zod schema in `lib/server/tools/`
2. Export from `lib/server/tools/index.ts`
3. Tools are automatically available to the LangChain agent
