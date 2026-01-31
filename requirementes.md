Project Requirements: Model-Agnostic Chatbot

Anthropic (Claude) via LangChain · WebSocket Streaming · Next.js + Tailwind + shadcn

⸻

1. Goal

Build a minimal but production-leaning chatbot where:
	•	Backend streams LLM output token-by-token over WebSockets
	•	LLM provider is Anthropic Claude, accessed via LangChain JS
	•	Frontend is Next.js (App Router) with Tailwind CSS and shadcn/ui
	•	Architecture is model-agnostic, enabling future provider swaps with minimal changes

⸻

2. Non-Goals (Out of Scope)
	•	Authentication / accounts
	•	Persistent storage (DB, chat history)
	•	RAG / embeddings / vector search
	•	Tool or function calling
	•	Multi-user chat rooms
	•	Production deployment / infra automation

⸻

3. High-Level Architecture

Services
	1.	Backend
	•	Node.js + TypeScript
	•	Express HTTP server
	•	WebSocket server for streaming
	•	LangChain ChatAnthropic for LLM access
	2.	Frontend
	•	Next.js App Router
	•	Tailwind CSS
	•	shadcn/ui components
	•	Browser WebSocket client

Rationale
	•	WebSockets are easier and cleaner in a dedicated Node server.
	•	Next.js focuses on UI + rendering; backend owns long-lived connections.
	•	No vendor-specific logic leaks into the frontend.

⸻

4. Repository Layout

Recommended monorepo:

/chatbot-ws-langchain
  /backend
  /frontend
  README.md
  package.json (optional workspace root)


⸻

5. Backend Requirements

5.1 Tech Stack
	•	Node.js 18+ (or 20+)
	•	TypeScript
	•	Express
	•	ws (WebSocket server)
	•	LangChain:
	•	@langchain/anthropic
	•	@langchain/core
	•	dotenv for env config

⸻

5.2 Environment Variables

Required:
	•	ANTHROPIC_API_KEY

Optional:
	•	PORT (default: 8787)
	•	CORS_ORIGIN (if HTTP CORS is needed later)

⸻

5.3 HTTP Endpoints
	•	GET /health
	•	Response: { "ok": true }

⸻

5.4 WebSocket Endpoint
	•	Path: /ws
	•	On connection, server sends:

{ "type": "ready" }


⸻

5.5 WebSocket Message Protocol

Client → Server
All messages are JSON.
	1.	Chat request

{
  "type": "chat",
  "requestId": "optional-string",
  "messages": [
    { "role": "system|user|assistant", "content": "string" }
  ]
}

	2.	Cancel in-flight request

{
  "type": "cancel",
  "requestId": "string"
}

	3.	Ping

{ "type": "ping" }


⸻

Server → Client
	1.	Ready

{ "type": "ready" }

	2.	Start streaming

{ "type": "start", "requestId": "string" }

	3.	Token chunk

{
  "type": "token",
  "requestId": "string",
  "token": "string"
}

	4.	Done

{
  "type": "done",
  "requestId": "string",
  "final": "string"
}

	5.	Error

{
  "type": "error",
  "requestId": "string",
  "message": "string"
}

	6.	Canceled

{
  "type": "canceled",
  "requestId": "string"
}

	7.	Pong

{ "type": "pong" }


⸻

5.6 Streaming Behavior
	•	Use ChatAnthropic with streaming: true
	•	Stream tokens via LangChain callback (handleLLMNewToken)
	•	Emit each token as a WebSocket message

⸻

5.7 Cancellation Behavior
	•	Each chat request is tied to an AbortController
	•	On cancel, abort the corresponding request
	•	On socket close, abort all in-flight requests for that connection

⸻

5.8 Model Configuration
	•	Default model: claude-3-5-sonnet-latest
	•	Temperature: 0.3
	•	Model name and temperature should be defined in a single config location

⸻

5.9 Validation & Safety
	•	Reject invalid JSON
	•	Validate:
	•	messages is an array
	•	roles ∈ system | user | assistant
	•	user message content is non-empty
	•	Guard against oversized payloads (≈50k chars total)

⸻

5.10 Logging
	•	Log:
	•	WebSocket connect / disconnect
	•	Request start / completion / error
	•	Do not log full user message content by default

⸻

6. Frontend Requirements

6.1 Tech Stack
	•	Next.js (latest) App Router
	•	TypeScript
	•	Tailwind CSS
	•	shadcn/ui components:
	•	Card
	•	Button
	•	Input
	•	(optional) ScrollArea

⸻

6.2 UI

Single page (/) containing:
	•	Chat transcript
	•	User input field
	•	Send button
	•	Stop button (cancel streaming)
	•	Connection status indicator
	•	Streaming status indicator

⸻

6.3 Frontend State Rules
	•	Maintain messages in memory
	•	Keep system prompt hidden from UI
	•	On send:
	•	append user message
	•	send full message history to backend
	•	disable input while streaming
	•	On start:
	•	append empty assistant message
	•	On token:
	•	append token to last assistant message
	•	On done:
	•	stop streaming
	•	On error:
	•	stop streaming and surface error
	•	On stop:
	•	send cancel with active requestId

⸻

6.4 Frontend Configuration
	•	NEXT_PUBLIC_WS_URL
	•	Default: ws://localhost:8787/ws

⸻

6.5 Styling
	•	Tailwind defaults + shadcn styling
	•	Chat bubbles:
	•	User: muted background
	•	Assistant: bordered / neutral background
	•	Transcript scrolls vertically

⸻

7. Model-Agnostic Design (Required)

Even though only Anthropic is implemented initially, the backend must be structured to support additional providers.

7.1 Provider Interface

interface LLMProvider {
  streamChat(args: {
    messages: BaseMessage[];
    signal: AbortSignal;
    onToken: (token: string) => void;
  }): Promise<{ finalText: string }>;
}


⸻

7.2 Anthropic Provider
	•	AnthropicProvider implements LLMProvider
	•	Internally uses ChatAnthropic

⸻

7.3 Provider Factory
	•	A createProvider() function selects provider based on env/config
	•	Default provider: anthropic

⸻

8. Deliverables
	•	Backend:
	•	Express server
	•	/health endpoint
	•	/ws streaming WebSocket endpoint
	•	Frontend:
	•	Next.js app with Tailwind + shadcn
	•	Streaming chat UI
	•	Cancel support
	•	README.md:
	•	Setup instructions
	•	Env vars
	•	Run commands
	•	Usage example

⸻

9. Acceptance Criteria
	•	Assistant response streams token-by-token
	•	Stop button cancels generation immediately
	•	UI reflects disconnected state if backend is down
	•	Frontend contains zero vendor-specific logic
	•	Provider can be swapped by backend config only

⸻

10. Nice-to-Haves (Optional)
	•	Token batching (20–50ms flush)
	•	Per-socket rate limiting (one active request)
	•	SSE endpoint as alternative to WebSockets

⸻

