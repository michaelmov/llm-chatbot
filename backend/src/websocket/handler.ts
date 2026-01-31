import type { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createProvider } from '../providers/factory.js';
import { logger } from '../utils/logger.js';
import { validateMessage, type ClientMessage } from './validation.js';
import type { LLMProvider } from '../providers/types.js';

interface ServerMessage {
  type: 'ready' | 'start' | 'token' | 'done' | 'error' | 'canceled' | 'pong';
  requestId?: string;
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

  constructor(private ws: WebSocket) {
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
        this.handleChat(message.requestId, message.messages);
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
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  ): Promise<void> {
    const abortController = new AbortController();
    this.activeRequests.set(requestId, { abortController, requestId });

    logger.info('Starting chat request', {
      connectionId: this.connectionId,
      requestId,
      messageCount: messages.length,
    });

    this.send({ type: 'start', requestId });

    await this.provider.stream(
      messages,
      {
        onToken: (token) => {
          this.send({ type: 'token', requestId, token });
        },
        onComplete: (text) => {
          this.activeRequests.delete(requestId);
          this.send({ type: 'done', requestId, text });
          logger.info('Chat request completed', {
            connectionId: this.connectionId,
            requestId,
          });
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
