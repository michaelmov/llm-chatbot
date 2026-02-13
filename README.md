# LLM Chatbot

A model-agnostic chatbot with WebSocket streaming, built with Node.js/Express backend and Next.js 16 frontend (React 19, Tailwind CSS 4, shadcn/ui).

## Features

- Real-time token streaming via WebSocket
- User authentication (email/password via better-auth)
- Conversation management (create, list, delete)
- Model-agnostic architecture (currently supports Anthropic Claude)
- LangChain-based agent with tool calling support
- Built-in tools: weather (current + 5-day forecast), date/time
- Cancel in-progress requests
- Connection status indicator
- Responsive chat UI with dark mode support
- Streaming markdown + code syntax highlighting (@llm-ui + Shiki v3)

## Prerequisites

- Node.js >=22.17.0
- npm
- Docker (for PostgreSQL and Redis)
- Anthropic API key
- Weather API key (optional, from [weatherapi.com](https://www.weatherapi.com/))

## Project Structure

```
/llm-chatbot
├── package.json              # Workspace root
├── docker-compose.yml        # Production stack (postgres, redis, backend, frontend)
├── docker-compose.dev.yml    # Dev infrastructure (postgres + redis)
├── backend/                  # Express + WebSocket server
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── config.ts         # Configuration
│   │   ├── server.ts         # Express + WebSocket setup
│   │   ├── auth.ts           # better-auth configuration
│   │   ├── redis.ts          # Redis client (ioredis)
│   │   ├── db/               # Database client & schema (Drizzle ORM)
│   │   ├── middleware/       # Auth middleware (requireAuth)
│   │   ├── providers/        # LLM provider implementations
│   │   ├── routes/           # REST routes (conversations, ws-ticket)
│   │   ├── services/         # Business logic (conversations, messages, tickets)
│   │   ├── tools/            # LangChain tools (weather, datetime)
│   │   ├── websocket/        # WebSocket handling
│   │   └── utils/            # Utilities (logger)
│   └── package.json
└── frontend/                 # Next.js app
    ├── middleware.ts          # Route protection (auth check)
    ├── app/
    │   ├── page.tsx           # Root redirect
    │   ├── sign-in/           # Sign in page
    │   ├── sign-up/           # Sign up page
    │   ├── c/                 # Chat pages (/c, /c/[conversationId])
    │   ├── components/        # Chat UI + AppSidebar + LLM output renderer
    │   └── hooks/             # useWebSocket, useConversations, useConversation
    ├── components/            # Shared UI components (shadcn/ui)
    ├── lib/                   # Utilities (auth-client, api)
    └── package.json
```

## Setup

1. **Clone and install dependencies:**

   ```bash
   npm install
   ```

2. **Configure backend environment:**

   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` and add your API keys and auth secret:

   ```
   ANTHROPIC_API_KEY=your-api-key-here
   WEATHER_API_KEY=your-weather-api-key-here  # Optional, for weather tools
   BETTER_AUTH_SECRET=$(openssl rand -base64 32)
   ```

3. **Start the database and Redis:**

   ```bash
   npm run db:start
   npm run redis:start
   npm run db:migrate
   ```

4. **Configure frontend environment:**

   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

   Add the backend API URL:

   ```
   NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

## Running the Application

### Development

Start both backend and frontend:

```bash
# Start backend + frontend (database and Redis must be running)
npm run dev

# Or start everything including database and Redis
npm run dev:with-docker
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

#### Redis Commands

```bash
npm run redis:start    # Start Redis container
npm run redis:stop     # Stop Redis container
```

#### Code Quality Commands

```bash
npm run lint           # Lint both workspaces
npm run lint:fix       # Auto-fix lint issues
npm run format         # Format with Prettier
npm run format:check   # Check formatting
```

### Docker Deployment

**Production** (full stack — postgres, redis, backend, frontend):

```bash
docker compose up
```

**Development infrastructure** (postgres + redis only):

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Access the Application

- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/health
- WebSocket: ws://localhost:3001/ws

## Authentication

Uses [better-auth](https://www.better-auth.com/) with email/password authentication.

- **Sign up / Sign in** at `/sign-up` and `/sign-in`
- Session managed via cookies + Bearer tokens
- All API routes protected by `requireAuth` middleware
- **WebSocket auth:** ticket-based — client gets a 30-second single-use ticket via `POST /api/ws/ticket`, then connects with `ws://localhost:3001/ws?ticket={ticket}`. Tickets are stored in Redis and consumed atomically on use.

See `CLAUDE.md` for detailed auth architecture.

## WebSocket Protocol

### Client → Server

| Type     | Payload                   | Description        |
| -------- | ------------------------- | ------------------ |
| `chat`   | `{ requestId, messages }` | Send chat messages |
| `cancel` | `{ requestId }`           | Cancel streaming   |
| `ping`   | -                         | Keepalive          |

### Server → Client

| Type       | Payload                 | Description            |
| ---------- | ----------------------- | ---------------------- |
| `ready`    | -                       | Connection established |
| `start`    | `{ requestId }`         | Streaming started      |
| `token`    | `{ requestId, token }`  | Token received         |
| `done`     | `{ requestId, text }`   | Streaming complete     |
| `error`    | `{ requestId?, error }` | Error occurred         |
| `canceled` | `{ requestId }`         | Request canceled       |
| `pong`     | -                       | Ping response          |

## Configuration

### Backend

| Variable              | Default                        | Description                              |
| --------------------- | ------------------------------ | ---------------------------------------- |
| `PORT`                | 3001                           | Server port                              |
| `LLM_PROVIDER`        | anthropic                      | LLM provider                             |
| `MODEL_NAME`          | claude-3-5-sonnet-latest       | Model name                               |
| `MODEL_TEMPERATURE`   | 0.3                            | Temperature                              |
| `MODEL_MAX_TOKENS`    | 4096                           | Max tokens                               |
| `ANTHROPIC_API_KEY`   | -                              | Anthropic API key                        |
| `WEATHER_API_KEY`     | -                              | Weather API key (optional)               |
| `DATABASE_URL`        | -                              | PostgreSQL connection URL                |
| `REDIS_URL`           | redis://localhost:6379         | Redis connection URL                     |
| `BETTER_AUTH_SECRET`  | -                              | Auth secret (`openssl rand -base64 32`)  |
| `BACKEND_URL`         | http://localhost:3001          | Backend URL (used by better-auth)        |
| `FRONTEND_URL`        | http://localhost:3000          | Frontend URL (CORS origin)               |
| `COOKIE_DOMAIN`       | -                              | Cookie domain (production cross-subdomain) |

### Frontend

| Variable              | Default                  | Description              |
| --------------------- | ------------------------ | ------------------------ |
| `NEXT_PUBLIC_WS_URL`  | ws://localhost:3001/ws   | Backend WebSocket URL    |
| `NEXT_PUBLIC_API_URL` | http://localhost:3001    | Backend API URL          |

## Adding New Providers

1. Create a new provider in `backend/src/providers/`:

   ```typescript
   import type { LLMProvider, ProviderConfig, StreamCallbacks, ChatMessage } from './types.js';

   export class NewProvider implements LLMProvider {
     public readonly name = 'new-provider';

     constructor(config: ProviderConfig) {
       // Initialize
     }

     async stream(
       messages: ChatMessage[],
       callbacks: StreamCallbacks,
       abortSignal?: AbortSignal
     ): Promise<void> {
       // Implement streaming
     }
   }
   ```

2. Register in `backend/src/providers/factory.ts`

3. Update config and environment variables as needed

## Adding New Tools

1. Define a tool using LangChain's `tool()` helper with Zod schema in `backend/src/tools/`:

   ```typescript
   import { tool } from '@langchain/core/tools';
   import { z } from 'zod';

   export const myTool = tool(
     async ({ param }) => {
       // Tool implementation
       return 'result';
     },
     {
       name: 'my_tool',
       description: 'Description of what the tool does',
       schema: z.object({
         param: z.string().describe('Parameter description'),
       }),
     }
   );
   ```

2. Export from `backend/src/tools/index.ts`

3. Tools are automatically available to the LangChain agent
