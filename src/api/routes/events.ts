import { Router } from 'express';
import { addClient, removeClient, clientCount } from '../sseManager';

export function createEventsRouter(): Router {
  const router = Router();

  // 5.23 — GET /api/events (SSE)
  router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const clientId = addClient(res);

    // Send initial connection confirmation
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, clients: clientCount() })}\n\n`);

    req.on('close', () => {
      removeClient(clientId);
    });
  });

  return router;
}
