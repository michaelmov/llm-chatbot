import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { WebSocketHandler } from './websocket/handler.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  app.get('/health', (_, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      provider: config.provider,
      model: config.model.name,
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    new WebSocketHandler(ws);
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
