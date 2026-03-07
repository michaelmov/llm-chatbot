'use client';

import { useChatContext } from '../c/ChatProvider';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatContainer() {
  const { messages, streamingMessageId, isStreaming, conversationTitle, handleSend, handleStop } =
    useChatContext();

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
