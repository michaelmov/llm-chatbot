'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { Spinner } from '@/components/ui/spinner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '../components/AppSidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: sessionData, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !sessionData) {
      router.push('/sign-in');
    }
  }, [isPending, sessionData, router]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
