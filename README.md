# LLM Chatbot

A model-agnostic chatbot with WebSocket streaming, built with Node.js/Express backend and Next.js 16 frontend (React 19, Tailwind CSS 4, shadcn/ui).

## Features

- Real-time token streaming via WebSocket
- Model-agnostic architecture (currently supports Anthropic Claude)
- LangChain-based agent with tool calling support
- Built-in weather tools (current weather and 5-day forecast)
- Cancel in-progress requests
- Connection status indicator
- Responsive chat UI with dark mode support

## Prerequisites

- Node.js 20+
- npm
- Docker (for PostgreSQL database)
- Anthropic API key
- Weather API key (optional, from [weatherapi.com](https://www.weatherapi.com/))

## Project Structure

```
/llm-chatbot
├── package.json          # Workspace root
├── backend/              # Express + WebSocket server
│   ├── src/
│   │   ├── index.ts      # Entry point
│   │   ├── config.ts     # Configuration
│   │   ├── server.ts     # Express + WebSocket setup
│   │   ├── db/           # Database client & schema (Drizzle ORM)
│   │   ├── providers/    # LLM provider implementations
│   │   ├── tools/        # LangChain tools (weather, etc.)
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

   Edit `backend/.env` and add your API keys:

   ```
   ANTHROPIC_API_KEY=your-api-key-here
   WEATHER_API_KEY=your-weather-api-key-here  # Optional, for weather tools
   ```

3. **Start the database:**

   ```bash
   npm run db:start
   npm run db:migrate
   ```

4. **Configure frontend environment (optional):**

   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

   The default WebSocket URL is `ws://localhost:3001/ws`.

## Running the Application

### Development

Start both backend and frontend:

```bash
# Start backend + frontend (database must be running)
npm run dev

# Or start everything including the database
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

### Access the Application

- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/health
- WebSocket: ws://localhost:3001/ws

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

| Variable            | Default                  | Description              |
| ------------------- | ------------------------ | ------------------------ |
| `PORT`              | 3001                     | Server port              |
| `LLM_PROVIDER`      | anthropic                | LLM provider             |
| `MODEL_NAME`        | claude-3-5-sonnet-latest | Model name               |
| `MODEL_TEMPERATURE` | 0.3                      | Temperature              |
| `MODEL_MAX_TOKENS`  | 4096                     | Max tokens               |
| `ANTHROPIC_API_KEY` | -                        | Anthropic API key        |
| `WEATHER_API_KEY`   | -                        | Weather API key (optional) |
| `DATABASE_URL`      | -                        | PostgreSQL connection URL  |

### Frontend

| Variable             | Default                | Description           |
| -------------------- | ---------------------- | --------------------- |
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
