'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquarePlus, LogOut } from 'lucide-react';
import { signOut, useSession } from '@/lib/auth-client';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useConversations } from '../hooks/useConversations';

export function AppSidebar() {
  const router = useRouter();
  const params = useParams();
  const activeConversationId = params?.conversationId as string | undefined;
  const { data: sessionData } = useSession();
  const token = sessionData?.session?.token;
  const { data: conversations } = useConversations(token);

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
    router.refresh();
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="New Chat">
              <Link href="/c">
                <MessageSquarePlus className="h-4 w-4" />
                <span>New Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {conversations?.map((conversation) => (
            <SidebarMenuItem key={conversation.id}>
              <SidebarMenuButton
                asChild
                isActive={activeConversationId === conversation.id}
                tooltip={conversation.title}
              >
                <Link href={`/c/${conversation.id}`}>
                  <span className="truncate">{conversation.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{sessionData?.user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{sessionData?.user?.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
