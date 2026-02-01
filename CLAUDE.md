# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run both backend and frontend
npm run dev

# Run individually
npm run dev:backend    # tsx watch src/index.ts (port 3001)
npm run dev:frontend   # next dev (port 3000)

# Build
npm run build          # Builds both workspaces

# Lint
npm run lint           # Lints both workspaces
```

## Architecture

This is a monorepo (npm workspaces) with a WebSocket-based streaming chat application.

### Backend (`/backend`)

Express server with WebSocket support for real-time LLM streaming using LangChain.

**Request flow:** `index.ts` → `server.ts` (creates Express + WSS) → `websocket/handler.ts` (manages connections) → `providers/` (LLM integration)

**Provider pattern:** The `LLMProvider` interface (`providers/types.ts`) defines the contract for LLM integrations. Currently uses Anthropic via LangChain with agent support for tool calling. Providers are registered in `providers/factory.ts`.

**Tools:** LangChain tools are defined in `tools/`:
- `weatherTool` - Get current weather for a location
- `weatherForecastTool` - Get 5-day weather forecast

**WebSocket protocol:**
- Client sends: `chat` (with requestId + messages), `cancel`, `ping`
- Server responds: `ready`, `start`, `token`, `done`, `error`, `canceled`, `pong`

**Validation:** Messages validated in `websocket/validation.ts` with max payload size of 50,000 chars.

**Health endpoint:** `GET /health` returns provider and model info.

### Frontend (`/frontend`)

Next.js 16 with React 19, using Tailwind CSS 4 and shadcn/ui components.

**Directory structure:**
- `/frontend/app/` - Next.js app router pages and app-specific components
- `/frontend/app/components/` - Chat components (ChatContainer, MessageList, MessageBubble, ChatInput, StatusIndicator)
- `/frontend/app/hooks/` - Custom hooks (useWebSocket)
- `/frontend/components/` - Shared UI components (ui/, theme-provider, mode-toggle)

**Component hierarchy:** `layout.tsx` (theme provider) → `page.tsx` → `ChatContainer.tsx` (orchestrates state, WebSocket hook) → `MessageList`, `MessageBubble`, `ChatInput`, `StatusIndicator`

**Key features:**
- `useWebSocket.ts` manages connection lifecycle, reconnection (3s delay), and 30s keep-alive pings
- Markdown rendering via `marked` library in MessageBubble
- System messages filtered from UI display
- UUID-based message and request tracking

**Theming:** Uses `next-themes` with class-based dark mode. Theme toggle in `components/mode-toggle.tsx`.

### Communication

Frontend connects to `ws://localhost:3001/ws`. Messages stream as individual tokens with request IDs for tracking. Supports cancellation mid-stream.

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
```

### Frontend (`frontend/.env.local`)

Optional - defaults to `ws://localhost:3001/ws`:

```
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```

## Code Quality

**ESLint:** Separate configs for backend (`backend/eslint.config.mjs`) and frontend (`frontend/eslint.config.mjs` with Next.js rules).

**Prettier:** Root config (`.prettierrc`) - single quotes, 2-space tabs, 100 char width, trailing commas.

## Adding New LLM Providers

1. Create class implementing `LLMProvider` in `backend/src/providers/`
2. Register in `backend/src/providers/factory.ts`
3. Add required env vars to config

## Adding New Tools

1. Define tool using LangChain's `tool()` helper with Zod schema in `backend/src/tools/`
2. Export from `backend/src/tools/index.ts`
3. Tools are automatically available to the LangChain agent
