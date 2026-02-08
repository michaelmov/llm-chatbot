'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { StatusIndicator } from './StatusIndicator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useWebSocket } from '../hooks/useWebSocket';
import { useConversation } from '../hooks/useConversation';
import { useSession } from '@/lib/auth-client';
import type { Message } from './MessageBubble';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

interface ChatContainerProps {
  conversationId?: string;
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const { data: sessionData } = useSession();
  const queryClient = useQueryClient();
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
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

  const handleMessage = useCallback(
    (message: {
      type: string;
      conversationId?: string;
      token?: string;
      text?: string;
      error?: string;
      requestId?: string;
    }) => {
      switch (message.type) {
        case 'start': {
          setIsStreaming(true);
          const assistantId = uuidv4();
          streamingMessageIdRef.current = assistantId;
          setStreamingMessageId(assistantId);
          setLocalMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content: '' },
          ]);

          if (message.conversationId) {
            activeConversationIdRef.current = message.conversationId;
            if (!conversationId) {
              window.history.replaceState(null, '', `/c/${message.conversationId}`);
            }
          }
          break;
        }

        case 'token':
          if (streamingMessageIdRef.current && message.token) {
            setLocalMessages((prev) =>
              prev.map((m) =>
                m.id === streamingMessageIdRef.current
                  ? { ...m, content: m.content + message.token }
                  : m
              )
            );
          }
          break;

        case 'done':
          setIsStreaming(false);
          if (streamingMessageIdRef.current && message.text) {
            setLocalMessages((prev) =>
              prev.map((m) =>
                m.id === streamingMessageIdRef.current ? { ...m, content: message.text! } : m
              )
            );
          }
          currentRequestIdRef.current = null;
          streamingMessageIdRef.current = null;
          setStreamingMessageId(null);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          break;

        case 'error':
          setIsStreaming(false);
          if (streamingMessageIdRef.current) {
            setLocalMessages((prev) =>
              prev.map((m) =>
                m.id === streamingMessageIdRef.current
                  ? { ...m, content: `Error: ${message.error}` }
                  : m
              )
            );
          }
          currentRequestIdRef.current = null;
          streamingMessageIdRef.current = null;
          setStreamingMessageId(null);
          break;

        case 'canceled':
          setIsStreaming(false);
          currentRequestIdRef.current = null;
          streamingMessageIdRef.current = null;
          setStreamingMessageId(null);
          break;
      }
    },
    [conversationId, queryClient]
  );

  const { connectionStatus, sendChat, sendCancel, isConnected } = useWebSocket({
    url: WS_URL,
    sessionToken,
    onMessage: handleMessage,
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
    if (currentRequestIdRef.current) {
      sendCancel(currentRequestIdRef.current);
    }
  }, [sendCancel]);

  return (
    <div className="flex h-full max-h-screen w-full flex-col bg-background">
      <div className="border-b border-border">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 block md:hidden" />
            <Separator orientation="vertical" className="mr-2 h-4 block md:hidden" />
            <StatusIndicator connectionStatus={connectionStatus} isStreaming={isStreaming} />
          </div>
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
          disabled={!isConnected}
        />
      </div>
    </div>
  );
}
