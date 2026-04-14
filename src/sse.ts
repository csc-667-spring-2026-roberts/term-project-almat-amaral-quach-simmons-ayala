import type { Response } from "express";

interface Client {
  id: number;
  response: Response;
  userId?: number;
  gameId?: number;
}

const clients = new Map<number, Client>();
let nextClientId = 0;

function addClient(response: Response, userId?: number, gameId?: number): number {
  const id = nextClientId++;

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  response.write("\n");

  clients.set(id, {
    id,
    response,
    userId,
    gameId,
  });

  return id;
}

function removeClient(id: number): void {
  clients.delete(id);
}

function broadcast(payload: unknown): void {
  const message = `data: ${JSON.stringify(payload)}\n\n`;

  for (const client of clients.values()) {
    client.response.write(message);
  }
}

export default {
  addClient,
  removeClient,
  broadcast,
};
