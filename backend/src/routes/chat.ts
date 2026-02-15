import { Router, type Request, type Response } from 'express';
import { createProvider } from '../providers/factory.js';
import { logger } from '../utils/logger.js';
import { validateChatRequest } from '../validation/chat.js';
import type { ChatMessage } from '../providers/types.js';
import { conversationService, messageService } from '../services/index.js';
import { requireAuth } from '../middleware/auth.js';

export const chatRouter = Router();

chatRouter.post('/chat', requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;

  const result = validateChatRequest(req.body);
  if (!result.valid) {
    res.status(400).json({ error: result.error });
    return;
  }

  const { requestId, messages, conversationId } = result.data!;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const abortController = new AbortController();
  let closed = false;

  req.on('close', () => {
    closed = true;
    abortController.abort();
    logger.info('Client disconnected, aborting stream', { requestId });
  });

  try {
    let resolvedConversationId: string;
    let llmMessages: ChatMessage[];

    if (conversationId) {
      const conversation = await conversationService.getById(conversationId, userId);
      if (!conversation) {
        sendEvent(res, 'error', { error: 'Conversation not found', requestId });
        res.end();
        return;
      }
      resolvedConversationId = conversationId;

      const latestUserMessage = messages[messages.length - 1];
      if (!latestUserMessage || latestUserMessage.role !== 'user') {
        sendEvent(res, 'error', { error: 'Last message must be a user message', requestId });
        res.end();
        return;
      }

      await messageService.create({
        conversationId: resolvedConversationId,
        role: 'user',
        content: latestUserMessage.content,
      });

      const dbMessages = await messageService.getByConversationId(resolvedConversationId);
      llmMessages = dbMessages.map((m) => ({ role: m.role, content: m.content }));
    } else {
      const conversation = await conversationService.create(userId);
      resolvedConversationId = conversation.id;

      const latestUserMessage = messages[messages.length - 1];
      if (!latestUserMessage || latestUserMessage.role !== 'user') {
        sendEvent(res, 'error', { error: 'Last message must be a user message', requestId });
        res.end();
        return;
      }

      await messageService.create({
        conversationId: resolvedConversationId,
        role: 'user',
        content: latestUserMessage.content,
      });

      llmMessages = messages;
    }

    logger.info('Starting chat request', {
      requestId,
      conversationId: resolvedConversationId,
      messageCount: llmMessages.length,
    });

    sendEvent(res, 'start', { requestId, conversationId: resolvedConversationId });

    const provider = createProvider();

    await provider.stream(
      llmMessages,
      {
        onToken: (token) => {
          if (!closed) {
            sendEvent(res, 'token', { token });
          }
        },
        onComplete: async (text) => {
          if (!closed) {
            sendEvent(res, 'done', { requestId, text, conversationId: resolvedConversationId });
          }
          res.end();

          logger.info('Chat request completed', {
            requestId,
            conversationId: resolvedConversationId,
          });

          try {
            await messageService.create({
              conversationId: resolvedConversationId,
              role: 'assistant',
              content: text,
            });
            await conversationService.touch(resolvedConversationId);
          } catch (error) {
            logger.error('Failed to persist assistant message', {
              requestId,
              conversationId: resolvedConversationId,
              error: error instanceof Error ? error.message : error,
            });
          }
        },
        onError: (error) => {
          logger.error('Chat request failed', {
            requestId,
            error: error.message,
          });
          if (!closed) {
            sendEvent(res, 'error', { error: error.message, requestId });
          }
          res.end();
        },
      },
      abortController.signal
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    logger.error('Chat setup failed', { requestId, error: message });
    if (!closed) {
      sendEvent(res, 'error', { error: message, requestId });
    }
    res.end();
  }
});

function sendEvent(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
