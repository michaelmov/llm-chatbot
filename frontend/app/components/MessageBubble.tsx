'use client';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { LLMOutputDynamic } from './llm-output/LLMOutputDynamic';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MessageBubbleProps {
  message: Message;
  isStreamFinished: boolean;
}

export function MessageBubble({ message, isStreamFinished }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex rounded-md', {
        'justify-end': isUser,
        'justify-start': !isUser,
      })}
    >
      <div
        className={cn('rounded-lg px-4 py-2 overflow-x-auto', {
          'max-w-[80%] bg-primary text-primary-foreground': isUser,
          'w-full border border-border bg-card text-card-foreground': !isUser,
        })}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
        ) : !message.content ? (
          <div className="flex justify-center py-2">
            <Spinner />
          </div>
        ) : (
          <LLMOutputDynamic content={message.content} isStreamFinished={isStreamFinished} />
        )}
      </div>
    </div>
  );
}
