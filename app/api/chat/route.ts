import { NextRequest } from 'next/server';
import { createProvider } from '@/lib/server/providers/factory';
import { logger } from '@/lib/server/logger';
import { validateChatRequest } from '@/lib/server/validation/chat';
import type { ChatMessage } from '@/lib/server/providers/types';
import {
  conversationService,
  messageService,
  generateTitle,
  apiKeyService,
} from '@/lib/server/services';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/server/auth-helpers';

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const body = await request.json();
  const result = validateChatRequest(body);
  if (!result.valid) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const { requestId, messages, conversationId } = result.data!;
  const isNewConversation = !conversationId;

  const encoder = new TextEncoder();

  function formatSSE(event: string, data: Record<string, unknown>): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function sendEvent(event: string, data: Record<string, unknown>) {
        if (!closed) {
          controller.enqueue(encoder.encode(formatSSE(event, data)));
        }
      }

      // Listen for client disconnect
      request.signal.addEventListener('abort', () => {
        closed = true;
        logger.info('Client disconnected, aborting stream', { requestId });
      });

      try {
        let resolvedConversationId: string;
        let llmMessages: ChatMessage[];

        if (conversationId) {
          const conversation = await conversationService.getById(conversationId, userId);
          if (!conversation) {
            sendEvent('error', { error: 'Conversation not found', requestId });
            controller.close();
            return;
          }
          resolvedConversationId = conversationId;

          const latestUserMessage = messages[messages.length - 1];
          if (!latestUserMessage || latestUserMessage.role !== 'user') {
            sendEvent('error', { error: 'Last message must be a user message', requestId });
            controller.close();
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
            sendEvent('error', { error: 'Last message must be a user message', requestId });
            controller.close();
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

        const apiKey = await apiKeyService.getDecryptedKey(userId);
        if (!apiKey) {
          sendEvent('error', {
            error: 'No API key configured. Please add your Anthropic API key in Settings.',
            requestId,
          });
          controller.close();
          return;
        }

        sendEvent('start', { requestId, conversationId: resolvedConversationId });

        const provider = createProvider(apiKey);

        await provider.stream(
          llmMessages,
          {
            onToken: (token) => {
              sendEvent('token', { token });
            },
            onComplete: async (text) => {
              sendEvent('done', { requestId, text, conversationId: resolvedConversationId });

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

              if (isNewConversation) {
                try {
                  const userMessage = messages[messages.length - 1]?.content || '';
                  const title = await generateTitle(userMessage, text, apiKey);
                  if (title) {
                    await conversationService.updateTitle(resolvedConversationId, title);
                    sendEvent('title', { conversationId: resolvedConversationId, title });
                  }
                } catch (error) {
                  logger.error('Failed to generate/persist title', {
                    conversationId: resolvedConversationId,
                    error: error instanceof Error ? error.message : error,
                  });
                }
              }

              controller.close();
              closed = true;
            },
            onError: (error) => {
              logger.error('Chat request failed', {
                requestId,
                error: error.message,
              });
              sendEvent('error', { error: error.message, requestId });
              controller.close();
              closed = true;
            },
          },
          request.signal
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        logger.error('Chat setup failed', { requestId, error: message });
        if (!closed) {
          sendEvent('error', { error: message, requestId });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
