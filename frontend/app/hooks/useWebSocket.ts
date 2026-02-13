'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { ConnectionStatus } from '../components/StatusIndicator';
import type { Message } from '../components/MessageBubble';

interface ServerMessage {
  type: 'ready' | 'start' | 'token' | 'done' | 'error' | 'canceled' | 'pong';
  requestId?: string;
  conversationId?: string;
  token?: string;
  text?: string;
  error?: string;
}

interface UseWebSocketOptions {
  url: string;
  sessionToken?: string;
  onMessage?: (message: ServerMessage) => void;
}

export function useWebSocket({ url, sessionToken, onMessage }: UseWebSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const connectAbortRef = useRef<AbortController | null>(null);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!sessionToken) return;

    // Abort any previous in-flight connect attempt
    connectAbortRef.current?.abort();
    const abortController = new AbortController();
    connectAbortRef.current = abortController;

    setConnectionStatus('connecting');

    let ticket: string;
    try {
      const res = await apiFetch<{ ticket: string }>('/api/ws/ticket', sessionToken, {
        method: 'POST',
        signal: abortController.signal,
      });
      ticket = res.ticket;
    } catch {
      if (!abortController.signal.aborted) {
        setConnectionStatus('disconnected');
      }
      return;
    }

    // Check if aborted while awaiting
    if (abortController.signal.aborted) return;

    const wsUrl = `${url}?ticket=${encodeURIComponent(ticket)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus('connected');
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        onMessage?.(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current?.();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [url, sessionToken, onMessage]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    connectAbortRef.current?.abort();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendChat = useCallback(
    (requestId: string, messages: Pick<Message, 'role' | 'content'>[], conversationId?: string) => {
      send({ type: 'chat', requestId, messages, ...(conversationId && { conversationId }) });
    },
    [send]
  );

  const sendCancel = useCallback(
    (requestId: string) => {
      send({ type: 'cancel', requestId });
    },
    [send]
  );

  useEffect(() => {
    queueMicrotask(connect);
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connectionStatus,
    sendChat,
    sendCancel,
    isConnected: connectionStatus === 'connected',
  };
}
