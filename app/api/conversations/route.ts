import { NextRequest } from 'next/server';
import { conversationService } from '@/lib/server/services';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/server/auth-helpers';

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const body = await request.json();
  const { title } = body as { title?: string };
  const conversation = await conversationService.create(userId, title);
  return Response.json(conversation, { status: 201 });
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const conversations = await conversationService.listByUser(userId);
  return Response.json(conversations);
}
