'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useChat } from '../hooks/useChat';
import type { Message } from '../components/MessageBubble';

interface ChatContextValue {
  sendChat: (
    requestId: string,
    messages: Pick<Message, 'role' | 'content'>[],
    conversationId?: string
  ) => void;
  cancelStream: () => void;
  isStreaming: boolean;
  pendingConvId: string | null;
  streamingMessageId: string | null;
  pendingMessages: Message[];
  clearPendingMessages: () => void;
  addPendingUserMessage: (message: Message, conversationId?: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const conversationId = params?.conversationId as string | undefined;
  const router = useRouter();

  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [pendingConvId, setPendingConvId] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const streamingMessageIdRef = useRef<string | null>(null);

  const setStreamingMsg = useCallback((id: string | null) => {
    setStreamingMessageId(id);
    streamingMessageIdRef.current = id;
  }, []);

  const clearPendingMessages = useCallback(() => {
    setPendingMessages([]);
    setPendingConvId(null);
  }, []);

  const addPendingUserMessage = useCallback((message: Message, convId?: string) => {
    setPendingConvId(convId ?? null);
    setPendingMessages((prev) => [...prev, message]);
  }, []);

  const handleStart = useCallback(
    (data: { requestId: string; conversationId: string }) => {
      const assistantId = uuidv4();
      setStreamingMsg(assistantId);
      setPendingConvId(data.conversationId ?? null);
      setPendingMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      if (data.conversationId && !conversationId) {
        router.replace(`/c/${data.conversationId}`);
      }
    },
    [conversationId, router, setStreamingMsg]
  );

  const handleToken = useCallback((data: { token: string }) => {
    if (streamingMessageIdRef.current && data.token) {
      const msgId = streamingMessageIdRef.current;
      setPendingMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: m.content + data.token } : m))
      );
    }
  }, []);

  const handleDone = useCallback(
    (data: { text: string; conversationId: string }) => {
      if (streamingMessageIdRef.current && data.text) {
        const msgId = streamingMessageIdRef.current;
        setPendingMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: data.text } : m))
        );
      }
      setStreamingMsg(null);
      router.refresh();
    },
    [setStreamingMsg, router]
  );

  const handleError = useCallback(
    (data: { error: string }) => {
      if (streamingMessageIdRef.current) {
        const msgId = streamingMessageIdRef.current;
        setPendingMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: `Error: ${data.error}` } : m))
        );
      }
      setStreamingMsg(null);
    },
    [setStreamingMsg]
  );

  const handleTitle = useCallback(() => {
    router.refresh();
  }, [router]);

  const { sendChat, cancelStream, isStreaming } = useChat({
    onStart: handleStart,
    onToken: handleToken,
    onDone: handleDone,
    onError: handleError,
    onTitle: handleTitle,
  });

  const value = useMemo<ChatContextValue>(
    () => ({
      sendChat,
      cancelStream,
      isStreaming,
      pendingConvId,
      streamingMessageId,
      pendingMessages,
      clearPendingMessages,
      addPendingUserMessage,
    }),
    [
      sendChat,
      cancelStream,
      isStreaming,
      pendingConvId,
      streamingMessageId,
      pendingMessages,
      clearPendingMessages,
      addPendingUserMessage,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
