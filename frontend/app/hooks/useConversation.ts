import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Conversation } from './useConversations';

interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface ConversationResponse {
  conversation: Conversation;
  messages: ConversationMessage[];
}

export function useConversation(conversationId: string | undefined, token?: string) {
  return useQuery({
    queryKey: ['conversations', conversationId],
    queryFn: () => apiFetch<ConversationResponse>(`/api/conversations/${conversationId}`, token!),
    enabled: !!token && !!conversationId,
  });
}
