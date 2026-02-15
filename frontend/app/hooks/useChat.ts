'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readSSEStream } from '@/lib/sse';
import type { Message } from '../components/MessageBubble';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SSEStartData {
  requestId: string;
  conversationId: string;
}

interface SSETokenData {
  token: string;
}

interface SSEDoneData {
  requestId: string;
  text: string;
  conversationId: string;
}

interface SSEErrorData {
  error: string;
  requestId?: string;
}

export interface UseChatOptions {
  sessionToken?: string;
  onStart?: (data: SSEStartData) => void;
  onToken?: (data: SSETokenData) => void;
  onDone?: (data: SSEDoneData) => void;
  onError?: (data: SSEErrorData) => void;
}

export function useChat({ sessionToken, onStart, onToken, onDone, onError }: UseChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef({ onStart, onToken, onDone, onError });
  useEffect(() => {
    callbacksRef.current = { onStart, onToken, onDone, onError };
  });

  const sendChat = useCallback(
    async (
      requestId: string,
      messages: Pick<Message, 'role' | 'content'>[],
      conversationId?: string
    ) => {
      // Abort previous request if still in-flight
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            requestId,
            messages,
            ...(conversationId && { conversationId }),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => response.statusText);
          callbacksRef.current.onError?.({ error: text, requestId });
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
                    callbacksRef.current.onStart?.(parsed);
                    break;
                  case 'token':
                    callbacksRef.current.onToken?.(parsed);
                    break;
                  case 'done':
                    callbacksRef.current.onDone?.(parsed);
                    setIsStreaming(false);
                    break;
                  case 'error':
                    callbacksRef.current.onError?.(parsed);
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
          // Expected on cancellation — isStreaming already set by cancelStream
          return;
        }
        callbacksRef.current.onError?.({ error: 'Connection failed', requestId });
        setIsStreaming(false);
      }
    },
    [sessionToken]
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  return { sendChat, cancelStream, isStreaming };
}
