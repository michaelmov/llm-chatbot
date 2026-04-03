import { NextRequest } from 'next/server';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/server/auth-helpers';
import { apiKeyService } from '@/lib/server/services';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const hasKey = await apiKeyService.hasKey(userId);
  return Response.json({ hasKey });
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const body = await request.json();
  const { apiKey } = body;

  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return Response.json({ error: 'API key is required' }, { status: 400 });
  }

  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith('sk-ant-')) {
    return Response.json(
      { error: 'Invalid API key format. Anthropic keys start with sk-ant-' },
      { status: 400 }
    );
  }

  try {
    await apiKeyService.upsert(userId, trimmedKey);
    logger.info('User API key stored', { userId });
    return Response.json({ success: true });
  } catch (error) {
    logger.error('Failed to store API key', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    return Response.json({ error: 'Failed to store API key' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const deleted = await apiKeyService.delete(userId);
    if (!deleted) {
      return Response.json({ error: 'No API key found' }, { status: 404 });
    }
    logger.info('User API key deleted', { userId });
    return Response.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete API key', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    return Response.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
