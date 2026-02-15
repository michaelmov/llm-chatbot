import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { toNodeHandler } from 'better-auth/node';
import { config } from './config.js';
import { auth } from './auth.js';
import { conversationsRouter } from './routes/conversations.js';
import { chatRouter } from './routes/chat.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();
  const server = createServer(app);

  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );

  // Better Auth routes — must be mounted before express.json()
  app.all('/api/auth/*', toNodeHandler(auth));

  app.use(express.json());

  app.use('/api/conversations', conversationsRouter);
  app.use('/api', chatRouter);

  app.get('/health', (_, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      provider: config.provider,
      model: config.model.name,
    });
  });

  return { app, server };
}

export async function startServer() {
  const { server } = createApp();

  server.listen(config.port, () => {
    logger.info('Server started', {
      port: config.port,
      provider: config.provider,
      model: config.model.name,
    });
  });

  return server;
}
