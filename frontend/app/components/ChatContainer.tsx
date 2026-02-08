'use client';

import { useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { StatusIndicator } from './StatusIndicator';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSession, signOut } from '@/lib/auth-client';
import type { Message } from './MessageBubble';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

export function ChatContainer() {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const currentRequestIdRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const handleMessage = useCallback(
    (message: {
      type: string;
      token?: string;
      text?: string;
      error?: string;
      requestId?: string;
    }) => {
      switch (message.type) {
        case 'start':
          setIsStreaming(true);
          const assistantId = uuidv4();
          streamingMessageIdRef.current = assistantId;
          setStreamingMessageId(assistantId);
          setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);
          break;

        case 'token':
          if (streamingMessageIdRef.current && message.token) {
            setMessages((prev) =>
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
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingMessageIdRef.current ? { ...m, content: message.text! } : m
              )
            );
          }
          currentRequestIdRef.current = null;
          streamingMessageIdRef.current = null;
          setStreamingMessageId(null);
          break;

        case 'error':
          setIsStreaming(false);
          if (streamingMessageIdRef.current) {
            setMessages((prev) =>
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
    []
  );

  const sessionToken = sessionData?.session?.token;

  const { connectionStatus, sendChat, sendCancel, isConnected } = useWebSocket({
    url: WS_URL,
    sessionToken,
    onMessage: handleMessage,
  });

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push('/sign-in');
    router.refresh();
  }, [router]);

  const handleSend = useCallback(
    (content: string) => {
      const userMessage: Message = { id: uuidv4(), role: 'user', content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      const requestId = uuidv4();
      currentRequestIdRef.current = requestId;

      const chatMessages = newMessages.map(({ role, content }) => ({
        role,
        content,
      }));
      sendChat(requestId, chatMessages);
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
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Chat</h1>
            <div className="flex items-center gap-2">
              <StatusIndicator connectionStatus={connectionStatus} isStreaming={isStreaming} />
              <ModeToggle />
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
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
