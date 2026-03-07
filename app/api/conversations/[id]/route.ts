import { NextRequest } from 'next/server';
import { conversationService } from '@/lib/server/services';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/server/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  const result = await conversationService.getWithMessages(id, userId);
  if (!result) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  return Response.json(result);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  const deleted = await conversationService.delete(id, userId);
  if (!deleted) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
