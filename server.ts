import { createServer } from 'http';
import { networkInterfaces } from 'os';
import next from 'next';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from './src/shared/types/events';
import { RoomManager } from './src/server/room/RoomManager';
import { registerLobbyHandlers } from './src/server/socket/handlers/lobby-handlers';
import { registerGameHandlers } from './src/server/socket/handlers/game-handlers';
import { registerRuleHandlers } from './src/server/socket/handlers/rule-handlers';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

function getLocalIpAddresses(): string[] {
  const nets = networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*' },
  });

  const roomManager = new RoomManager();

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    registerLobbyHandlers(io, socket, roomManager);
    registerGameHandlers(io, socket, roomManager);
    registerRuleHandlers(io, socket, roomManager);

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      roomManager.handleDisconnect(socket.id);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://localhost:${port}`);
    const ips = getLocalIpAddresses();
    if (ips.length > 0) {
      console.log(`> スマホからアクセス:`);
      ips.forEach((ip) => {
        console.log(`  http://${ip}:${port}`);
      });
    }
  });
});
