import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { toNodeHandler } from 'better-auth/node';
import { config } from './config.js';
import { auth } from './auth.js';
import { WebSocketHandler } from './websocket/handler.js';
import { conversationsRouter } from './routes/conversations.js';
import { wsTicketRouter } from './routes/ws-ticket.js';
import { ticketService } from './services/ticket-service.js';
import { logger } from './utils/logger.js';

const wsUserMap = new WeakMap<WebSocket, string>();

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
  app.use('/api/ws', wsTicketRouter);

  app.get('/health', (_, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      provider: config.provider,
      model: config.model.name,
    });
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const ticket = url.searchParams.get('ticket');
    const userId = ticket ? ticketService.validate(ticket) : null;

    if (!userId) {
      logger.warn('WebSocket upgrade rejected: missing or invalid ticket');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wsUserMap.set(ws, userId);
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    const userId = wsUserMap.get(ws)!;
    new WebSocketHandler(ws, userId);
  });

  ticketService.startCleanup();

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
