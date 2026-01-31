'use client';

import { cn } from '@/lib/utils';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface StatusIndicatorProps {
  connectionStatus: ConnectionStatus;
  isStreaming: boolean;
}

export function StatusIndicator({ connectionStatus, isStreaming }: StatusIndicatorProps) {
  const statusConfig = {
    connecting: { color: 'bg-yellow-500', text: 'Connecting...' },
    connected: { color: 'bg-green-500', text: 'Connected' },
    disconnected: { color: 'bg-red-500', text: 'Disconnected' },
  };

  const { color, text } = statusConfig[connectionStatus];

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span>{isStreaming ? 'Streaming...' : text}</span>
    </div>
  );
}
