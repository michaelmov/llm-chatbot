'use client';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { parse } from 'marked';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const parsedMessageContent = isUser ? message.content : parse(message.content);

  return (
    <div
      className={cn('flex rounded-md', {
        'justify-end': isUser,
        'justify-start': !isUser,
      })}
    >
      <div
        className={cn('rounded-lg px-4 py-2 overflow-x-auto', {
          'max-w-[80%] bg-blue-600 text-slate-50 dark:bg-blue-500 dark:text-slate-900': isUser,
          'w-full border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50':
            !isUser,
        })}
      >
        {!parsedMessageContent ? (
          <div className="flex justify-center py-2">
            <Spinner />
          </div>
        ) : (
          <p
            className="whitespace-pre-wrap wrap-break-word"
            dangerouslySetInnerHTML={{ __html: parsedMessageContent }}
          />
        )}
      </div>
    </div>
  );
}
