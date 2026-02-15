'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChat } from '../hooks/useChat';
import { useConversation } from '../hooks/useConversation';
import { useSession } from '@/lib/auth-client';
import type { Message } from './MessageBubble';

interface ChatContainerProps {
  conversationId?: string;
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const { data: sessionData } = useSession();
  const queryClient = useQueryClient();
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const currentRequestIdRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | undefined>(conversationId);

  const sessionToken = sessionData?.session?.token;
  const { data: conversationData } = useConversation(conversationId, sessionToken);

  const loadedMessages = useMemo<Message[]>(() => {
    if (!conversationData?.messages) return [];
    return conversationData.messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }, [conversationData]);

  const messages = useMemo(
    () => [...loadedMessages, ...localMessages],
    [loadedMessages, localMessages]
  );

  const handleStart = useCallback(
    (data: { requestId: string; conversationId: string }) => {
      const assistantId = uuidv4();
      streamingMessageIdRef.current = assistantId;
      setStreamingMessageId(assistantId);
      setLocalMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      if (data.conversationId) {
        activeConversationIdRef.current = data.conversationId;
        if (!conversationId) {
          window.history.replaceState(null, '', `/c/${data.conversationId}`);
        }
        queryClient.invalidateQueries({ queryKey: ['conversations'], exact: true });
      }
    },
    [conversationId, queryClient]
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
    (data: { text: string }) => {
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

  const handleSend = useCallback(
    (content: string) => {
      const userMessage: Message = { id: uuidv4(), role: 'user', content };
      setLocalMessages((prev) => [...prev, userMessage]);

      const requestId = uuidv4();
      currentRequestIdRef.current = requestId;

      const allMessages = [...messages, userMessage];
      const chatMessages = allMessages.map(({ role, content }) => ({
        role,
        content,
      }));
      sendChat(requestId, chatMessages, activeConversationIdRef.current);
    },
    [messages, sendChat]
  );

  const handleStop = useCallback(() => {
    cancelStream();
  }, [cancelStream]);

  return (
    <div className="flex h-full max-h-screen w-full flex-col bg-background">
      <div className="border-b border-border">
        <div className="mx-auto w-full max-w-2xl px-4 py-4">
          <h1 className="text-lg font-bold text-center">
            {conversationData?.conversation.title ?? 'New Conversation'}
          </h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto h-full max-w-2xl">
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingMessageId={streamingMessageId}
          />
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <ChatInput
          onSend={handleSend}
          onStopGeneration={handleStop}
          isLoading={isStreaming}
          placeholder="Message..."
          tools={[]}
        />
      </div>
    </div>
  );
}
