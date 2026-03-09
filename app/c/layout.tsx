import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getSessionUser } from '@/lib/server/auth-helpers';
import { conversationService } from '@/lib/server/services';
import { AppSidebar } from '../components/AppSidebar';
import { ChatProvider } from './ChatProvider';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');

  const conversations = await conversationService.listByUser(user.id);

  return (
    <ChatProvider>
      <SidebarProvider>
        <AppSidebar
          conversations={conversations.map((c) => ({
            id: c.id,
            title: c.title ?? 'Untitled',
          }))}
          userName={user.name}
          userEmail={user.email}
        />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ChatProvider>
  );
}
