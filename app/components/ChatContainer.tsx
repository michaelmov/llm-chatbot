'use client';

import { useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useChatMessages } from '../c/ChatProvider';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import type { Message } from './MessageBubble';

interface ChatContainerProps {
  initialMessages: Message[];
  conversationTitle: string;
}

export function ChatContainer({ initialMessages, conversationTitle }: ChatContainerProps) {
  const params = useParams();
  const conversationId = (params?.conversationId as string | undefined) ?? null;

  const { messages, streamingMessageId, isStreaming, sendChat, cancelStream } = useChatMessages(
    initialMessages,
    conversationId
  );

  const handleSend = useCallback(
    (content: string) => {
      sendChat(content, messages, conversationId ?? undefined);
    },
    [sendChat, messages, conversationId]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4!" />
        <h1 className="truncate text-lg font-bold">{conversationTitle}</h1>
      </header>
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
          onStopGeneration={cancelStream}
          isLoading={isStreaming}
          placeholder="Message..."
          tools={[]}
        />
      </div>
    </div>
  );
}
