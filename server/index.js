import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 3001);
const clients = new Map();
const colors = ['#4dc9ff', '#ff8c42', '#9fffee', '#ff6b9d', '#c98cff', '#ffe08a'];

function broadcast(message, exceptId) {
  const payload = JSON.stringify(message);
  for (const [id, client] of clients) {
    if (id !== exceptId && client.readyState === 1) client.send(payload);
  }
}

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, players: clients.size }));
    return;
  }
  response.writeHead(404);
  response.end();
});

const webSocketServer = new WebSocketServer({ server: httpServer });

webSocketServer.on('connection', (socket) => {
  const id = crypto.randomUUID();
  const player = { id, name: `Adventurer ${clients.size + 1}`, color: colors[clients.size % colors.length], x: 20, y: 0, z: 130, yaw: 0 };
  clients.set(id, { socket, player });

  socket.send(JSON.stringify({ type: 'welcome', self: player, players: [...clients.values()].map(({ player: other }) => other) }));
  broadcast({ type: 'player-joined', player }, id);

  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type !== 'state') return;
      const current = clients.get(id);
      if (!current) return;
      current.player.x = Number(message.x) || 0;
      current.player.y = Number(message.y) || 0;
      current.player.z = Number(message.z) || 0;
      current.player.yaw = Number(message.yaw) || 0;
      broadcast({ type: 'player-state', player: current.player }, id);
    } catch {
      // Ignore malformed client messages.
    }
  });

  socket.on('close', () => {
    clients.delete(id);
    broadcast({ type: 'player-left', id });
  });
});

httpServer.listen(port, () => {
  console.log(`Skyfall multiplayer server listening on http://localhost:${port}`);
});