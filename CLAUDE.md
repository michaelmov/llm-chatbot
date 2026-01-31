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

Express server with WebSocket support for real-time LLM streaming.

**Request flow:** `index.ts` → `server.ts` (creates Express + WSS) → `websocket/handler.ts` (manages connections) → `providers/` (LLM integration)

**Provider pattern:** The `LLMProvider` interface (`providers/types.ts`) defines the contract for LLM integrations. New providers implement this interface and are registered in `providers/factory.ts`. Currently only Anthropic is implemented using LangChain.

**WebSocket protocol:**
- Client sends: `chat` (with requestId + messages), `cancel`, `ping`
- Server responds: `ready`, `start`, `token`, `done`, `error`, `canceled`, `pong`

### Frontend (`/frontend`)

Next.js 15 with React 19, using Tailwind CSS and shadcn/ui components.

**Component hierarchy:** `layout.tsx` (theme provider) → `page.tsx` → `ChatContainer.tsx` (orchestrates state, WebSocket hook) → `MessageList`, `MessageBubble`, `ChatInput`, `StatusIndicator`

**Key hook:** `useWebSocket.ts` manages connection lifecycle, reconnection, and message handling.

**Theming:** Uses `next-themes` with class-based dark mode. Theme toggle in `components/mode-toggle.tsx`.

### Communication

Frontend connects to `ws://localhost:3001/ws`. Messages stream as individual tokens with request IDs for tracking. Supports cancellation mid-stream.

## Environment Setup

Backend requires `backend/.env` with `ANTHROPIC_API_KEY`. Copy from `.env.example`.

Frontend optionally uses `frontend/.env.local` for `NEXT_PUBLIC_WS_URL` (defaults to `ws://localhost:3001/ws`).

## Adding New LLM Providers

1. Create class implementing `LLMProvider` in `backend/src/providers/`
2. Register in `backend/src/providers/factory.ts`
3. Add required env vars to config
