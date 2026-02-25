'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const currentRequestIdRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | undefined>(conversationId);
  const isNavigatingToNewConversationRef = useRef(false);
  const prevConversationIdRef = useRef<string | undefined>(conversationId);

  const { data: conversationData } = useConversation(conversationId, sessionToken);

  // Detect route changes: own navigation vs user navigation
  useEffect(() => {
    if (conversationId === prevConversationIdRef.current) return;

    if (isNavigatingToNewConversationRef.current) {
      // We triggered this navigation (new conversation created).
      // The user message is now in DB → will come from loadedMessages.
      // Keep only the in-flight streaming assistant message to avoid duplication.
      isNavigatingToNewConversationRef.current = false;
      setLocalMessages((prev) =>
        streamingMessageIdRef.current
          ? prev.filter((m) => m.id === streamingMessageIdRef.current)
          : []
      );
    } else {
      // User navigated (sidebar click, new chat, etc.) — reset state
      cancelStream();
      setLocalMessages([]);
      currentRequestIdRef.current = null;
      streamingMessageIdRef.current = null;
      setStreamingMessageId(null);
      activeConversationIdRef.current = conversationId;
    }

    prevConversationIdRef.current = conversationId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleStart = useCallback(
    (data: { requestId: string; conversationId: string }) => {
      const assistantId = uuidv4();
      streamingMessageIdRef.current = assistantId;
      setStreamingMessageId(assistantId);
      setLocalMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      if (data.conversationId) {
        activeConversationIdRef.current = data.conversationId;
        if (!conversationId) {
          isNavigatingToNewConversationRef.current = true;
          router.replace(`/c/${data.conversationId}`);
        }
        queryClient.invalidateQueries({ queryKey: ['conversations'], exact: true });
      }
    },
    [conversationId, queryClient, router]
  );

  const handleToken = useCallback((data: { token: string }) => {
    if (streamingMessageIdRef.current && data.token) {
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageIdRef.current ? { ...m, content: m.content + data.token } : m
        )
      );
    }
  }, []);

  const handleDone = useCallback(
    async (data: { text: string }) => {
      if (streamingMessageIdRef.current && data.text) {
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === streamingMessageIdRef.current ? { ...m, content: data.text } : m
          )
        );
      }
      currentRequestIdRef.current = null;
      streamingMessageIdRef.current = null;
      setStreamingMessageId(null);
      queryClient.invalidateQueries({ queryKey: ['conversations'], exact: true });
      await queryClient.refetchQueries({ queryKey: ['conversations', activeConversationIdRef.current] });
      setLocalMessages([]);
    },
    [queryClient]
  );

  const handleError = useCallback((data: { error: string }) => {
    if (streamingMessageIdRef.current) {
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageIdRef.current ? { ...m, content: `Error: ${data.error}` } : m
        )
      );
    }
    currentRequestIdRef.current = null;
    streamingMessageIdRef.current = null;
    setStreamingMessageId(null);
  }, []);

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

  const messages = useMemo(
    () => [...loadedMessages, ...localMessages],
    [loadedMessages, localMessages]
  );

  const conversationTitle = conversationData?.conversation.title ?? 'New Conversation';

  const handleSend = useCallback(
    (content: string) => {
      const userMessage: Message = { id: uuidv4(), role: 'user', content };
      setLocalMessages((prev) => [...prev, userMessage]);

      const requestId = uuidv4();
      currentRequestIdRef.current = requestId;

      const allMessages = [...messages, userMessage];
      const chatMessages = allMessages.map(({ role, content: c }) => ({ role, content: c }));
      sendChat(requestId, chatMessages, activeConversationIdRef.current);
    },
    [messages, sendChat]
  );

  const handleStop = useCallback(() => {
    cancelStream();
  }, [cancelStream]);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      streamingMessageId,
      isStreaming,
      conversationTitle,
      handleSend,
      handleStop,
    }),
    [messages, streamingMessageId, isStreaming, conversationTitle, handleSend, handleStop]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
