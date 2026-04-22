import type { Response } from 'express';

interface SseClient {
  id: number;
  res: Response;
}

let nextId = 1;
const clients: SseClient[] = [];

export function addClient(res: Response): number {
  const id = nextId++;
  clients.push({ id, res });
  return id;
}

export function removeClient(id: number): void {
  const idx = clients.findIndex((c) => c.id === id);
  if (idx !== -1) clients.splice(idx, 1);
}

export function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      // dead connection — will be cleaned up on 'close'
    }
  }
}

export function clientCount(): number {
  return clients.length;
}
