'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useChat, type ChatEvent } from '../hooks/useChat';
import type { Message } from '../components/MessageBubble';

// One in-flight chat exchange. Both messages share a single lifecycle:
// created on sendChat, finalized on 'done', cleared once the server-rendered
// list contains them.
interface ActiveStream {
  // Null between sendChat and 'start' on the new-chat flow (URL is still /c).
  // Promoted to the server-confirmed id by handleEvent('start').
  conversationId: string | null;
  userMessage: Message;
  // Null until 'start' creates the assistant placeholder.
  assistantMessage: Message | null;
}

interface ChatContextValue {
  activeStream: ActiveStream | null;
  isStreaming: boolean;
  sendChat: (content: string, history: Message[], conversationId?: string) => void;
  cancelStream: () => void;
  clearActiveStream: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const urlConversationId = params?.conversationId as string | undefined;
  const router = useRouter();

  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);

  const handleEvent = useCallback(
    (event: ChatEvent) => {
      switch (event.type) {
        case 'start': {
          const assistantMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: '',
          };
          setActiveStream((prev) =>
            prev
              ? { ...prev, conversationId: event.conversationId, assistantMessage }
              : prev
          );
          if (event.conversationId && !urlConversationId) {
            router.replace(`/c/${event.conversationId}`);
          }
          break;
        }
        case 'token': {
          if (!event.token) break;
          setActiveStream((prev) =>
            prev?.assistantMessage
              ? {
                  ...prev,
                  assistantMessage: {
                    ...prev.assistantMessage,
                    content: prev.assistantMessage.content + event.token,
                  },
                }
              : prev
          );
          break;
        }
        case 'done': {
          setActiveStream((prev) =>
            prev?.assistantMessage
              ? {
                  ...prev,
                  assistantMessage: { ...prev.assistantMessage, content: event.text },
                }
              : prev
          );
          router.refresh();
          break;
        }
        case 'title': {
          router.refresh();
          break;
        }
        case 'error': {
          setActiveStream((prev) => {
            if (!prev) return prev;
            const errorContent = `Error: ${event.error}`;
            const assistantMessage: Message = prev.assistantMessage
              ? { ...prev.assistantMessage, content: errorContent }
              : { id: uuidv4(), role: 'assistant', content: errorContent };
            return { ...prev, assistantMessage };
          });
          break;
        }
      }
    },
    [router, urlConversationId]
  );

  const { sendChat: rawSend, cancelStream, isStreaming } = useChat({ onEvent: handleEvent });

  const sendChat = useCallback(
    (content: string, history: Message[], conversationId?: string) => {
      const userMessage: Message = { id: uuidv4(), role: 'user', content };
      setActiveStream({
        conversationId: conversationId ?? null,
        userMessage,
        assistantMessage: null,
      });

      const requestId = uuidv4();
      const payload = [...history, userMessage].map(({ role, content: c }) => ({
        role,
        content: c,
      }));
      rawSend(requestId, payload, conversationId);
    },
    [rawSend]
  );

  const clearActiveStream = useCallback(() => {
    setActiveStream(null);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({ activeStream, isStreaming, sendChat, cancelStream, clearActiveStream }),
    [activeStream, isStreaming, sendChat, cancelStream, clearActiveStream]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Merges server-rendered messages with the in-flight stream.
 * Pass the URL's conversationId (or null on /c). Returns the rendered list,
 * stream metadata scoped to that conversation, and stable send/cancel callbacks.
 */
export function useChatMessages(
  initialMessages: Message[],
  conversationId: string | null
): {
  messages: Message[];
  streamingMessageId: string | null;
  isStreaming: boolean;
  sendChat: (content: string, history: Message[], conversationId?: string) => void;
  cancelStream: () => void;
} {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatMessages must be used within ChatProvider');

  const { activeStream, isStreaming, sendChat, cancelStream, clearActiveStream } = ctx;
  const matchesCurrentConv =
    activeStream !== null && activeStream.conversationId === conversationId;

  const messages = useMemo(() => {
    if (!activeStream || !matchesCurrentConv) return initialMessages;

    const out = [...initialMessages];
    const lastInitial = initialMessages.at(-1);
    const userAlreadyInInitial =
      lastInitial?.role === 'user' &&
      lastInitial.content === activeStream.userMessage.content;
    if (!userAlreadyInInitial) out.push(activeStream.userMessage);
    if (activeStream.assistantMessage) out.push(activeStream.assistantMessage);
    return out;
  }, [initialMessages, activeStream, matchesCurrentConv]);

  // After server data refreshes (post-stream), drop the optimistic state in
  // the same commit so consumers never paint a duplicated frame.
  useLayoutEffect(() => {
    if (!isStreaming && matchesCurrentConv) {
      clearActiveStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when server data refreshes
  }, [initialMessages]);

  return {
    messages,
    streamingMessageId:
      isStreaming && matchesCurrentConv && activeStream?.assistantMessage
        ? activeStream.assistantMessage.id
        : null,
    isStreaming: isStreaming && matchesCurrentConv,
    sendChat,
    cancelStream,
  };
}
