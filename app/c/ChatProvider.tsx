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
  streamingConvId: string | null;
  streamingMessageId: string | null;
  localMessages: Map<string | null, Message[]>;
  clearLocalMessages: (convId: string | null) => void;
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

  // Per-conversation local messages map: convId (or null for new) → Message[]
  const [localMsgsByConvId, setLocalMsgsByConvId] = useState<Map<string | null, Message[]>>(
    () => new Map()
  );
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // Which conversation the active stream belongs to
  const [streamingConvId, setStreamingConvId] = useState<string | null>(null);

  const [prevConversationId, setPrevConversationId] = useState(conversationId);
  // True when we triggered the navigation (new conversation created via our own send)
  const [isOwnNavigation, setIsOwnNavigation] = useState(false);

  const streamingMessageIdRef = useRef<string | null>(null);
  // Ref mirror of streamingConvId so callbacks always see the latest value
  const streamingConvIdRef = useRef<string | null>(null);

  // Paired setters: keep state + ref in sync without a useEffect
  const setStreamingMsg = useCallback((id: string | null) => {
    setStreamingMessageId(id);
    streamingMessageIdRef.current = id;
  }, []);

  const setStreamingConv = useCallback((id: string | null) => {
    setStreamingConvId(id);
    streamingConvIdRef.current = id;
  }, []);

  const resetStreamingState = useCallback(() => {
    setStreamingMsg(null);
    setStreamingConv(null);
  }, [setStreamingMsg, setStreamingConv]);

  const clearMsgsForConv = useCallback((convId: string | null) => {
    setLocalMsgsByConvId((prev) => {
      const next = new Map(prev);
      next.delete(convId);
      return next;
    });
  }, []);

  // Helper: update messages for a specific conversation
  const setMsgsForConv = useCallback(
    (convId: string | null, updater: (prev: Message[]) => Message[]) => {
      setLocalMsgsByConvId((prev) => {
        const next = new Map(prev);
        next.set(convId, updater(next.get(convId) ?? []));
        return next;
      });
    },
    []
  );

  // Detect route changes: own navigation vs user navigation
  if (prevConversationId !== conversationId) {
    setPrevConversationId(conversationId);
    if (isOwnNavigation) {
      // We triggered this navigation (new conversation created).
      // The user message is now in DB → will come from SSR.
      // Keep streaming conversation's messages (assistant message still streaming),
      // clear the null-keyed messages (user message now in DB).
      setIsOwnNavigation(false);
      clearMsgsForConv(null);
    }
  }

  const handleStart = useCallback(
    (data: { requestId: string; conversationId: string }) => {
      const assistantId = uuidv4();
      const convId = data.conversationId ?? null;
      setStreamingMsg(assistantId);
      setStreamingConv(convId);
      setMsgsForConv(convId, (prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      if (data.conversationId) {
        if (!conversationId) {
          setIsOwnNavigation(true);
          router.replace(`/c/${data.conversationId}`);
        }
        router.refresh();
      }
    },
    [conversationId, router, setMsgsForConv, setStreamingMsg, setStreamingConv]
  );

  const handleToken = useCallback(
    (data: { token: string }) => {
      const convId = streamingConvIdRef.current;
      if (streamingMessageIdRef.current && data.token && convId !== undefined) {
        setMsgsForConv(convId, (prev) =>
          prev.map((m) =>
            m.id === streamingMessageIdRef.current ? { ...m, content: m.content + data.token } : m
          )
        );
      }
    },
    [setMsgsForConv]
  );

  const handleDone = useCallback(
    (data: { text: string; conversationId: string }) => {
      const convId = streamingConvIdRef.current;
      if (streamingMessageIdRef.current && data.text && convId) {
        setMsgsForConv(convId, (prev) =>
          prev.map((m) =>
            m.id === streamingMessageIdRef.current ? { ...m, content: data.text } : m
          )
        );
      }
      resetStreamingState();

      // Refresh server data — sidebar + page re-fetch from DB
      router.refresh();

      // Clear local messages for this conversation — DB data is now fresh
      clearMsgsForConv(convId);
    },
    [setMsgsForConv, resetStreamingState, clearMsgsForConv, router]
  );

  const handleError = useCallback(
    (data: { error: string }) => {
      const convId = streamingConvIdRef.current;
      if (streamingMessageIdRef.current && convId !== undefined) {
        setMsgsForConv(convId, (prev) =>
          prev.map((m) =>
            m.id === streamingMessageIdRef.current ? { ...m, content: `Error: ${data.error}` } : m
          )
        );
      }
      resetStreamingState();
    },
    [setMsgsForConv, resetStreamingState]
  );

  const { sendChat, cancelStream, isStreaming } = useChat({
    onStart: handleStart,
    onToken: handleToken,
    onDone: handleDone,
    onError: handleError,
  });

  const value = useMemo<ChatContextValue>(
    () => ({
      sendChat,
      cancelStream,
      isStreaming,
      streamingConvId,
      streamingMessageId,
      localMessages: localMsgsByConvId,
      clearLocalMessages: clearMsgsForConv,
    }),
    [
      sendChat,
      cancelStream,
      isStreaming,
      streamingConvId,
      streamingMessageId,
      localMsgsByConvId,
      clearMsgsForConv,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
