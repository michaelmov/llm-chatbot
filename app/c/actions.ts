'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/server/auth-helpers';
import { conversationService } from '@/lib/server/services';

export async function deleteConversation(conversationId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  await conversationService.delete(conversationId, user.id);
  revalidatePath('/c');
}
