'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import { useChat } from '../hooks/useChat';
import { useConversation } from '../hooks/useConversation';
import type { Message } from '../components/MessageBubble';

interface ChatContextValue {
  messages: Message[];
  streamingMessageId: string | null;
  isStreaming: boolean;
  conversationTitle: string;
  handleSend: (content: string) => void;
  handleStop: () => void;
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
  const { data: sessionData } = useSession();
  const queryClient = useQueryClient();

  const sessionToken = sessionData?.session?.token;

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

  const currentRequestIdRef = useRef<string | null>(null);
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
    currentRequestIdRef.current = null;
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

  const { data: conversationData } = useConversation(conversationId, sessionToken);

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
      // The user message is now in DB → will come from loadedMessages.
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
        queryClient.invalidateQueries({ queryKey: ['conversations'], exact: true });
      }
    },
    [conversationId, queryClient, router, setMsgsForConv, setStreamingMsg, setStreamingConv]
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
    async (data: { text: string; conversationId: string }) => {
      const convId = streamingConvIdRef.current;
      if (streamingMessageIdRef.current && data.text && convId) {
        setMsgsForConv(convId, (prev) =>
          prev.map((m) =>
            m.id === streamingMessageIdRef.current ? { ...m, content: data.text } : m
          )
        );
      }
      resetStreamingState();

      queryClient.invalidateQueries({ queryKey: ['conversations'], exact: true });
      await queryClient.refetchQueries({ queryKey: ['conversations', convId] });

      // Clear local messages for this conversation — DB data is now fresh
      clearMsgsForConv(convId);
    },
    [queryClient, setMsgsForConv, resetStreamingState, clearMsgsForConv]
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
    sessionToken,
    onStart: handleStart,
    onToken: handleToken,
    onDone: handleDone,
    onError: handleError,
  });

  const loadedMessages = useMemo<Message[]>(() => {
    if (!conversationData?.messages) return [];
    return conversationData.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }, [conversationData]);

  // Is the currently viewed conversation the one being streamed?
  const isCurrentConvStreaming = isStreaming && streamingConvId === (conversationId ?? null);

  // Only show streaming indicator when on the streaming conversation
  const currentStreamingMessageId = isCurrentConvStreaming ? streamingMessageId : null;

  const messages = useMemo(() => {
    // Derive local messages inside useMemo to avoid stale reference in deps
    const local = localMsgsByConvId.get(conversationId ?? null) ?? [];
    return [...loadedMessages, ...local];
  }, [loadedMessages, localMsgsByConvId, conversationId]);

  const conversationTitle = conversationData?.conversation.title ?? 'New Conversation';

  const handleSend = useCallback(
    (content: string) => {
      // Abandon any stream belonging to a different conversation
      if (isStreaming && streamingConvId !== null && streamingConvId !== (conversationId ?? null)) {
        clearMsgsForConv(streamingConvId);
        resetStreamingState();
      }

      const convId = conversationId ?? null;
      const userMessage: Message = { id: uuidv4(), role: 'user', content };
      setMsgsForConv(convId, (prev) => [...prev, userMessage]);

      const requestId = uuidv4();
      currentRequestIdRef.current = requestId;
      const allMessages = [...messages, userMessage];
      sendChat(
        requestId,
        allMessages.map(({ role, content: c }) => ({ role, content: c })),
        conversationId
      );
    },
    [
      isStreaming,
      streamingConvId,
      conversationId,
      messages,
      sendChat,
      setMsgsForConv,
      clearMsgsForConv,
      resetStreamingState,
    ]
  );

  const handleStop = useCallback(() => {
    cancelStream();
  }, [cancelStream]);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      streamingMessageId: currentStreamingMessageId,
      isStreaming: isCurrentConvStreaming,
      conversationTitle,
      handleSend,
      handleStop,
    }),
    [
      messages,
      currentStreamingMessageId,
      isCurrentConvStreaming,
      conversationTitle,
      handleSend,
      handleStop,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
