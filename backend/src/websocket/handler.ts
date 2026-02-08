import type { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createProvider } from '../providers/factory.js';
import { logger } from '../utils/logger.js';
import { validateMessage, type ClientMessage } from './validation.js';
import type { LLMProvider, ChatMessage } from '../providers/types.js';
import { conversationService, messageService } from '../services/index.js';

interface ServerMessage {
  type: 'ready' | 'start' | 'token' | 'done' | 'error' | 'canceled' | 'pong';
  requestId?: string;
  conversationId?: string;
  token?: string;
  text?: string;
  error?: string;
}

interface ActiveRequest {
  abortController: AbortController;
  requestId: string;
}

export class WebSocketHandler {
  private provider: LLMProvider;
  private activeRequests: Map<string, ActiveRequest> = new Map();
  private connectionId: string;

  constructor(
    private ws: WebSocket,
    private userId: string
  ) {
    this.connectionId = uuidv4().slice(0, 8);
    this.provider = createProvider();
    this.setupListeners();
    this.sendReady();
    logger.info('WebSocket connected', { connectionId: this.connectionId });
  }

  private setupListeners(): void {
    this.ws.on('message', (data) => this.handleMessage(data.toString()));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (error) => this.handleError(error));
  }

  private send(message: ServerMessage): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendReady(): void {
    this.send({ type: 'ready' });
  }

  private handleMessage(data: string): void {
    const result = validateMessage(data);

    if (!result.valid) {
      logger.warn('Invalid message received', {
        connectionId: this.connectionId,
        error: result.error,
      });
      this.send({ type: 'error', error: result.error });
      return;
    }

    const message = result.message!;
    this.processMessage(message);
  }

  private processMessage(message: ClientMessage): void {
    switch (message.type) {
      case 'ping':
        this.send({ type: 'pong' });
        break;
      case 'cancel':
        this.handleCancel(message.requestId);
        break;
      case 'chat':
        this.handleChat(message.requestId, message.messages, message.conversationId);
        break;
    }
  }

  private handleCancel(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    if (request) {
      logger.info('Cancelling request', {
        connectionId: this.connectionId,
        requestId,
      });
      request.abortController.abort();
      this.activeRequests.delete(requestId);
      this.send({ type: 'canceled', requestId });
    }
  }

  private async handleChat(
    requestId: string,
    messages: ChatMessage[],
    conversationId?: string
  ): Promise<void> {
    const abortController = new AbortController();
    this.activeRequests.set(requestId, { abortController, requestId });

    try {
      let resolvedConversationId: string;
      let llmMessages: ChatMessage[];

      if (conversationId) {
        // Existing conversation — verify ownership and load history from DB
        const conversation = await conversationService.getById(conversationId, this.userId);
        if (!conversation) {
          this.activeRequests.delete(requestId);
          this.send({ type: 'error', requestId, error: 'Conversation not found' });
          return;
        }
        resolvedConversationId = conversationId;

        // Extract latest user message from client payload
        const latestUserMessage = messages[messages.length - 1];
        if (!latestUserMessage || latestUserMessage.role !== 'user') {
          this.activeRequests.delete(requestId);
          this.send({ type: 'error', requestId, error: 'Last message must be a user message' });
          return;
        }

        // Persist user message
        await messageService.create({
          conversationId: resolvedConversationId,
          role: 'user',
          content: latestUserMessage.content,
        });

        // Load full history from DB (now includes the just-persisted user message)
        const dbMessages = await messageService.getByConversationId(resolvedConversationId);
        llmMessages = dbMessages.map((m) => ({ role: m.role, content: m.content }));
      } else {
        // New conversation — auto-create
        const conversation = await conversationService.create(this.userId);
        resolvedConversationId = conversation.id;

        // Extract latest user message
        const latestUserMessage = messages[messages.length - 1];
        if (!latestUserMessage || latestUserMessage.role !== 'user') {
          this.activeRequests.delete(requestId);
          this.send({ type: 'error', requestId, error: 'Last message must be a user message' });
          return;
        }

        // Persist user message
        await messageService.create({
          conversationId: resolvedConversationId,
          role: 'user',
          content: latestUserMessage.content,
        });

        // For new conversations, use the client's messages (allows system prompt etc.)
        llmMessages = messages;
      }

      logger.info('Starting chat request', {
        connectionId: this.connectionId,
        requestId,
        conversationId: resolvedConversationId,
        messageCount: llmMessages.length,
      });

      this.send({ type: 'start', requestId, conversationId: resolvedConversationId });

      await this.provider.stream(
        llmMessages,
        {
          onToken: (token) => {
            this.send({ type: 'token', requestId, token });
          },
          onComplete: async (text) => {
            this.activeRequests.delete(requestId);
            this.send({ type: 'done', requestId, text, conversationId: resolvedConversationId });
            logger.info('Chat request completed', {
              connectionId: this.connectionId,
              requestId,
              conversationId: resolvedConversationId,
            });

            // Persist assistant message (non-fatal)
            try {
              await messageService.create({
                conversationId: resolvedConversationId,
                role: 'assistant',
                content: text,
              });
              await conversationService.touch(resolvedConversationId);
            } catch (error) {
              logger.error('Failed to persist assistant message', {
                connectionId: this.connectionId,
                requestId,
                conversationId: resolvedConversationId,
                error: error instanceof Error ? error.message : error,
              });
            }
          },
          onError: (error) => {
            this.activeRequests.delete(requestId);
            logger.error('Chat request failed', {
              connectionId: this.connectionId,
              requestId,
              error: error.message,
            });
            this.send({ type: 'error', requestId, error: error.message });
          },
        },
        abortController.signal
      );
    } catch (error) {
      this.activeRequests.delete(requestId);
      const message = error instanceof Error ? error.message : 'Internal error';
      logger.error('Chat setup failed', {
        connectionId: this.connectionId,
        requestId,
        error: message,
      });
      this.send({ type: 'error', requestId, error: message });
    }
  }

  private handleClose(): void {
    logger.info('WebSocket disconnected', { connectionId: this.connectionId });
    for (const [, request] of this.activeRequests) {
      request.abortController.abort();
    }
    this.activeRequests.clear();
  }

  private handleError(error: Error): void {
    logger.error('WebSocket error', {
      connectionId: this.connectionId,
      error: error.message,
    });
  }
}
