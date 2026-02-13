'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquarePlus, LogOut, Trash } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { signOut, useSession } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useConversations } from '../hooks/useConversations';

export function AppSidebar() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const activeConversationId = params?.conversationId as string | undefined;
  const { data: sessionData } = useSession();
  const token = sessionData?.session?.token;
  const { data: conversations } = useConversations(token);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId || !token) return;
    const deletingId = pendingDeleteId;
    setPendingDeleteId(null);

    await apiFetch(`/api/conversations/${deletingId}`, token, { method: 'DELETE' });
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });

    if (activeConversationId === deletingId) {
      router.push('/c');
    }
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
              <SidebarMenuAction
                title="Delete Conversation"
                onClick={() => setPendingDeleteId(conversation.id)}
              >
                <Trash className="h-5 w-5" />
              </SidebarMenuAction>
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

      <AlertDialog open={!!pendingDeleteId} onOpenChange={() => setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
