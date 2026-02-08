import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { toNodeHandler } from 'better-auth/node';
import { config } from './config.js';
import { auth } from './auth.js';
import { WebSocketHandler } from './websocket/handler.js';
import { conversationsRouter } from './routes/conversations.js';
import { logger } from './utils/logger.js';

const wsUserMap = new WeakMap<WebSocket, string>();

export function createApp() {
  const app = express();
  const server = createServer(app);

  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
    })
  );

  // Better Auth routes — must be mounted before express.json()
  app.all('/api/auth/*', toNodeHandler(auth));

  app.use(express.json());

  app.use('/api/conversations', conversationsRouter);

  app.get('/health', (_, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      provider: config.provider,
      model: config.model.name,
    });
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get('token');
    if (!token) {
      logger.warn('WebSocket upgrade rejected: no token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const session = await auth.api.getSession({
        headers: new Headers({ authorization: `Bearer ${token}` }),
      });

      if (!session) {
        logger.warn('WebSocket upgrade rejected: invalid session');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wsUserMap.set(ws, session.user.id);
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      logger.error('WebSocket auth error', { error });
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    const userId = wsUserMap.get(ws)!;
    new WebSocketHandler(ws, userId);
  });

  return { app, server, wss };
}

export function startServer() {
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
