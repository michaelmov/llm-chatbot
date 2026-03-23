'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquarePlus, LogOut, Trash } from 'lucide-react';
import { signOut } from '@/lib/auth-client';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { deleteConversation } from '../c/actions';
import { cn } from '@/lib/utils';

interface SidebarConversation {
  id: string;
  title: string;
}

interface AppSidebarProps {
  conversations: SidebarConversation[];
  userName: string;
  userEmail: string;
}

export function AppSidebar({ conversations, userName, userEmail }: AppSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const activeConversationId = params?.conversationId as string | undefined;
  const { setOpenMobile } = useSidebar();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    const deletingId = pendingDeleteId;
    setPendingDeleteId(null);

    await deleteConversation(deletingId);

    // useParams() doesn't update when URL is changed via window.history.replaceState
    // (which ChatContainer does when a new conversation is created from /c).
    // Check window.location.pathname as a fallback to cover that case.
    const isViewingDeleted =
      activeConversationId === deletingId || window.location.pathname === `/c/${deletingId}`;

    if (isViewingDeleted) {
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
                <Link href={`/c/${conversation.id}`} onClick={() => setOpenMobile(false)}>
                  <span className="truncate">{conversation.title}</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuAction
                className={cn(
                  'cursor-pointer',
                  '[@media(hover:hover)]:opacity-0',
                  '[@media(hover:hover)]:group-hover/menu-item:opacity-100',
                  'group-focus-within/menu-item:opacity-100',
                  'data-[state=open]:opacity-100',
                  'peer-data-[active=true]/menu-button:text-sidebar-accent-foreground'
                )}
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
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
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
            <AlertDialogAction onClick={handleConfirmDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
