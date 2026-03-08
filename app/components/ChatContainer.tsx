'use client';

import { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useChatContext } from '../c/ChatProvider';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { Message } from './MessageBubble';

interface ChatContainerProps {
  initialMessages: Message[];
  conversationTitle: string;
}

export function ChatContainer({ initialMessages, conversationTitle }: ChatContainerProps) {
  const params = useParams();
  const conversationId = params?.conversationId as string | undefined;

  const {
    sendChat,
    cancelStream,
    isStreaming,
    streamingConvId,
    streamingMessageId,
    localMessages,
    addLocalMessage,
    clearLocalMessages,
  } = useChatContext();

  const convKey = conversationId ?? null;
  const messages = useMemo(() => {
    const local = localMessages.get(convKey) ?? [];
    return [...initialMessages, ...local];
  }, [initialMessages, localMessages, convKey]);

  // Is the currently viewed conversation the one being streamed?
  const isCurrentConvStreaming = isStreaming && streamingConvId === convKey;
  const currentStreamingMessageId = isCurrentConvStreaming ? streamingMessageId : null;

  const handleSend = useCallback(
    (content: string) => {
      // Abandon any stream belonging to a different conversation
      if (isStreaming && streamingConvId !== null && streamingConvId !== convKey) {
        clearLocalMessages(streamingConvId);
      }

      const userMessage: Message = { id: uuidv4(), role: 'user', content };
      addLocalMessage(convKey, userMessage);

      const requestId = uuidv4();
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
      convKey,
      messages,
      sendChat,
      addLocalMessage,
      clearLocalMessages,
      conversationId,
    ]
  );

  const handleStop = useCallback(() => {
    cancelStream();
  }, [cancelStream]);

  return (
    <div className="flex h-full max-h-screen w-full flex-col bg-background">
      <div className="border-b border-border">
        <div className="mx-auto w-full max-w-2xl px-4 py-4">
          <h1 className="text-lg font-bold text-center">{conversationTitle}</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto h-full max-w-2xl">
          <MessageList
            messages={messages}
            isStreaming={isCurrentConvStreaming}
            streamingMessageId={currentStreamingMessageId}
          />
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <ChatInput
          onSend={handleSend}
          onStopGeneration={handleStop}
          isLoading={isCurrentConvStreaming}
          placeholder="Message..."
          tools={[]}
        />
      </div>
    </div>
  );
}
