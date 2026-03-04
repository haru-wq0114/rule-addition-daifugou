import { Room } from './Room';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  // Map socket ID -> { roomId, playerId }
  private socketToRoom: Map<string, { roomId: string; playerId: string }> = new Map();

  private generateRoomId(): string {
    // 紛らわしい文字(0,O,I,L,1)を除外
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Avoid collision
    if (this.rooms.has(id)) return this.generateRoomId();
    return id;
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  createRoom(socketId: string, playerName: string): { room: Room; playerId: string } {
    const roomId = this.generateRoomId();
    const playerId = this.generatePlayerId();
    const room = new Room(roomId);
    room.addPlayer(playerId, socketId, playerName, true);

    this.rooms.set(roomId, room);
    this.socketToRoom.set(socketId, { roomId, playerId });

    return { room, playerId };
  }

  joinRoom(roomId: string, socketId: string, playerName: string): { room: Room; playerId: string } | { room?: undefined; playerId?: undefined; error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'ルームが見つかりません。IDを確認してください。' };
    if (room.status !== 'waiting') return { error: 'このルームは既にゲーム中です。' };

    // 満席の場合、CPUがいれば1人削除して空きを作る
    if (room.totalCount >= room.maxPlayers) {
      const cpuPlayer = room.players.find(p => p.isCpu);
      if (cpuPlayer) {
        room.removeCpu(cpuPlayer.id);
      } else {
        return { error: 'ルームが満員です。' };
      }
    }

    const playerId = this.generatePlayerId();
    room.addPlayer(playerId, socketId, playerName, false);
    this.socketToRoom.set(socketId, { roomId, playerId });

    return { room, playerId };
  }

  leaveRoom(socketId: string): Room | null {
    const info = this.socketToRoom.get(socketId);
    if (!info) return null;

    const room = this.rooms.get(info.roomId);
    if (!room) return null;

    room.removePlayer(info.playerId);
    this.socketToRoom.delete(socketId);

    // If room is empty, delete it
    if (room.humanCount === 0) {
      this.rooms.delete(info.roomId);
      return null;
    }

    // If host left, assign new host
    if (!room.players.some(p => p.isHost)) {
      const newHost = room.players.find(p => !p.isCpu);
      if (newHost) {
        newHost.isHost = true;
        newHost.isReady = true;
      }
    }

    return room;
  }

  handleDisconnect(socketId: string): void {
    const info = this.socketToRoom.get(socketId);
    if (!info) return;

    const room = this.rooms.get(info.roomId);
    if (!room) return;

    if (room.status === 'waiting') {
      this.leaveRoom(socketId);
    } else {
      // During game: mark as disconnected but don't remove
      const player = room.findPlayerById(info.playerId);
      if (player) {
        // Keep the player in the room for reconnection
        // The game engine will handle their turns (auto-pass after timeout)
      }
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocketId(socketId: string): { room: Room; playerId: string } | null {
    const info = this.socketToRoom.get(socketId);
    if (!info) return null;
    const room = this.rooms.get(info.roomId);
    if (!room) return null;
    return { room, playerId: info.playerId };
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getWaitingRooms(): Room[] {
    return this.getAllRooms().filter(r => r.status === 'waiting');
  }
}
