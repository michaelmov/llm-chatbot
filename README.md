# LLM Chatbot

A model-agnostic chatbot with WebSocket streaming, built with Node.js/Express backend and Next.js frontend.

## Features

- Real-time token streaming via WebSocket
- Model-agnostic architecture (currently supports Anthropic Claude)
- Cancel in-progress requests
- Connection status indicator
- Responsive chat UI

## Prerequisites

- Node.js 20+
- npm
- Anthropic API key

## Project Structure

```
/llm-chatbot
├── package.json          # Workspace root
├── backend/              # Express + WebSocket server
│   ├── src/
│   │   ├── index.ts      # Entry point
│   │   ├── config.ts     # Configuration
│   │   ├── server.ts     # Express + WebSocket setup
│   │   ├── providers/    # LLM provider implementations
│   │   ├── websocket/    # WebSocket handling
│   │   └── utils/        # Utilities
│   └── package.json
└── frontend/             # Next.js app
    ├── src/
    │   ├── app/          # App Router pages & components
    │   ├── components/   # UI components (shadcn/ui)
    │   └── lib/          # Utilities
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

   Edit `backend/.env` and add your Anthropic API key:

   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

3. **Configure frontend environment (optional):**

   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

   The default WebSocket URL is `ws://localhost:3001/ws`.

## Running the Application

### Development

Start both backend and frontend:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

Or run both with:

```bash
npm run dev
```

### Access the Application

- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/health
- WebSocket: ws://localhost:3001/ws

## WebSocket Protocol

### Client → Server

| Type | Payload | Description |
|------|---------|-------------|
| `chat` | `{ requestId, messages }` | Send chat messages |
| `cancel` | `{ requestId }` | Cancel streaming |
| `ping` | - | Keepalive |

### Server → Client

| Type | Payload | Description |
|------|---------|-------------|
| `ready` | - | Connection established |
| `start` | `{ requestId }` | Streaming started |
| `token` | `{ requestId, token }` | Token received |
| `done` | `{ requestId, text }` | Streaming complete |
| `error` | `{ requestId?, error }` | Error occurred |
| `canceled` | `{ requestId }` | Request canceled |
| `pong` | - | Ping response |

## Configuration

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `LLM_PROVIDER` | anthropic | LLM provider |
| `MODEL_NAME` | claude-3-5-sonnet-latest | Model name |
| `MODEL_TEMPERATURE` | 0.3 | Temperature |
| `MODEL_MAX_TOKENS` | 4096 | Max tokens |
| `ANTHROPIC_API_KEY` | - | API key |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_WS_URL` | ws://localhost:3001/ws | Backend WebSocket URL |

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
