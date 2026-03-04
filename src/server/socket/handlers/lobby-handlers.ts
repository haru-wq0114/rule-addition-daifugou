import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/events';
import type { RoomManager } from '../../room/RoomManager';
import { GameEngine } from '../../game-engine/GameEngine';
import { emitGameEvents, processCpuTurns, processCpuRuleSelection } from './shared-utils';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerLobbyHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {
  socket.on('lobby:create_room', ({ playerName }) => {
    const { room, playerId } = roomManager.createRoom(socket.id, playerName);
    socket.join(room.roomId);
    socket.emit('lobby:room_created', { roomId: room.roomId });
    socket.data = { playerId, roomId: room.roomId };

    io.emit('lobby:room_list', {
      rooms: roomManager.getWaitingRooms().map(r => r.toSummary()),
    });
    io.to(room.roomId).emit('lobby:room_updated', { room: room.toDetail() });
  });

  socket.on('lobby:join_room', ({ roomId, playerName }) => {
    console.log(`Join room attempt: roomId=${roomId}, player=${playerName}`);
    const result = roomManager.joinRoom(roomId, socket.id, playerName);

    if (!result.room) {
      console.log(`Join room failed: ${result.error}`);
      socket.emit('lobby:error', { message: result.error });
      return;
    }

    const { room, playerId } = result;
    socket.join(room.roomId);
    socket.data = { playerId, roomId: room.roomId };
    console.log(`Join room success: roomId=${room.roomId}, playerId=${playerId}`);

    // 参加したプレイヤーにroomIdを通知してルームページへ遷移させる
    socket.emit('lobby:room_created', { roomId: room.roomId });

    io.emit('lobby:room_list', {
      rooms: roomManager.getWaitingRooms().map(r => r.toSummary()),
    });
    io.to(room.roomId).emit('lobby:room_updated', { room: room.toDetail() });
  });

  socket.on('lobby:leave_room', () => {
    const room = roomManager.leaveRoom(socket.id);
    if (socket.data?.roomId) {
      socket.leave(socket.data.roomId);
    }
    socket.data = {};

    io.emit('lobby:room_list', {
      rooms: roomManager.getWaitingRooms().map(r => r.toSummary()),
    });

    if (room) {
      io.to(room.roomId).emit('lobby:room_updated', { room: room.toDetail() });
    }
  });

  socket.on('lobby:toggle_ready', () => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;

    const { room, playerId } = result;
    const player = room.findPlayerById(playerId);
    if (!player || player.isHost) return;

    player.isReady = !player.isReady;
    io.to(room.roomId).emit('lobby:room_updated', { room: room.toDetail() });
  });

  socket.on('lobby:add_cpu', () => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;

    const { room, playerId } = result;
    const player = room.findPlayerById(playerId);
    if (!player?.isHost) return;
    if (room.totalCount >= room.maxPlayers) return;

    room.addCpuPlayer();
    io.to(room.roomId).emit('lobby:room_updated', { room: room.toDetail() });
    io.emit('lobby:room_list', {
      rooms: roomManager.getWaitingRooms().map(r => r.toSummary()),
    });
  });

  socket.on('lobby:remove_cpu', ({ cpuId }) => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;

    const { room, playerId } = result;
    const player = room.findPlayerById(playerId);
    if (!player?.isHost) return;

    room.removeCpu(cpuId);
    io.to(room.roomId).emit('lobby:room_updated', { room: room.toDetail() });
    io.emit('lobby:room_list', {
      rooms: roomManager.getWaitingRooms().map(r => r.toSummary()),
    });
  });

  socket.on('lobby:start_game', () => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;

    const { room, playerId } = result;
    const player = room.findPlayerById(playerId);
    if (!player?.isHost) return;

    while (room.totalCount < room.maxPlayers) {
      room.addCpuPlayer();
    }

    if (!room.allReady) {
      socket.emit('lobby:error', { message: '全員の準備が完了していません。' });
      return;
    }

    room.status = 'playing';

    io.to(room.roomId).emit('lobby:room_updated', { room: room.toDetail() });
    io.emit('lobby:room_list', {
      rooms: roomManager.getWaitingRooms().map(r => r.toSummary()),
    });

    const playerIds = room.players.map((p: any) => p.id);
    const playerNames: Record<string, string> = {};
    const cpuFlags: Record<string, boolean> = {};
    for (const p of room.players) {
      playerNames[p.id] = p.name;
      cpuFlags[p.id] = p.isCpu;
    }

    const engine = new GameEngine(room.roomId, playerIds, playerNames, cpuFlags);
    room.gameEngine = engine;

    const events = engine.initializeGame();
    emitGameEvents(io, room, events);

    // If rule selection phase, handle CPU rule selection
    if (engine.gameState.phase === 'RULE_SELECTION') {
      processCpuRuleSelection(io, room, engine);
    } else {
      processCpuTurns(io, room, engine);
    }
  });
}
