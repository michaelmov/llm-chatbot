import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/server/auth-helpers';
import { conversationService } from '@/lib/server/services';
import { ChatContainer } from '../../components/ChatContainer';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');

  const { conversationId } = await params;
  const data = await conversationService.getWithMessages(conversationId, user.id);
  if (!data) notFound();

  const messages = data.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  return (
    <ChatContainer
      initialMessages={messages}
      conversationTitle={data.conversation.title ?? 'New Conversation'}
    />
  );
}
