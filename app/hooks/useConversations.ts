import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function useConversations(token?: string) {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<Conversation[]>('/api/conversations', token!),
    enabled: !!token,
  });
}
