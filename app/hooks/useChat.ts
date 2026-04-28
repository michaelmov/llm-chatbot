'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readSSEStream } from '@/lib/sse';
import type { Message } from '../components/MessageBubble';

export type ChatEvent =
  | { type: 'start'; requestId: string; conversationId: string }
  | { type: 'token'; token: string }
  | { type: 'done'; requestId: string; text: string; conversationId: string }
  | { type: 'title'; conversationId: string; title: string }
  | { type: 'error'; error: string; requestId?: string };

export interface UseChatOptions {
  onEvent: (event: ChatEvent) => void;
}

export function useChat({ onEvent }: UseChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const sendChat = useCallback(
    async (
      requestId: string,
      messages: Pick<Message, 'role' | 'content'>[],
      conversationId?: string
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            messages,
            ...(conversationId && { conversationId }),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => response.statusText);
          onEventRef.current({ type: 'error', error: text, requestId });
          setIsStreaming(false);
          return;
        }

        await readSSEStream(
          response,
          {
            onEvent: ({ event, data }) => {
              try {
                const parsed = JSON.parse(data);
                switch (event) {
                  case 'start':
                    onEventRef.current({ type: 'start', ...parsed });
                    break;
                  case 'token':
                    onEventRef.current({ type: 'token', ...parsed });
                    break;
                  case 'done':
                    onEventRef.current({ type: 'done', ...parsed });
                    setIsStreaming(false);
                    break;
                  case 'title':
                    onEventRef.current({ type: 'title', ...parsed });
                    break;
                  case 'error':
                    onEventRef.current({ type: 'error', ...parsed });
                    setIsStreaming(false);
                    break;
                }
              } catch {
                // Ignore malformed events
              }
            },
          },
          controller.signal
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        onEventRef.current({ type: 'error', error: 'Connection failed', requestId });
        setIsStreaming(false);
      }
    },
    []
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  return { sendChat, cancelStream, isStreaming };
}
