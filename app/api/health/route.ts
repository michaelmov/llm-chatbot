import { config } from '@/lib/server/config';

export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider: config.provider,
    model: config.model.name,
  });
}
