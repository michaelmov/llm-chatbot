'use client';

import { useParams } from 'next/navigation';
import { ChatContainer } from '../../components/ChatContainer';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  return <ChatContainer key={conversationId} conversationId={conversationId} />;
}
