'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble, type Message } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId: string | null;
}

export function MessageList({ messages, isStreaming, streamingMessageId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visibleMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-4">
        {visibleMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Send a message to start the conversation
          </div>
        ) : (
          visibleMessages.map((message) => {
            const isStreamFinished = !(isStreaming && message.id === streamingMessageId);
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isStreamFinished={isStreamFinished}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
