import type { RoomDetail, RoomPlayer, RoomSummary } from '../../shared/types/room';
import type { GameState } from '../../shared/types/game';
import type { GameEngine } from '../game-engine/GameEngine';

export class Room {
  public roomId: string;
  public players: RoomPlayer[] = [];
  public maxPlayers: number = 4;
  public status: 'waiting' | 'playing' | 'finished' = 'waiting';
  public gameState: GameState | null = null;
  public gameEngine: GameEngine | null = null;

  private cpuCounter = 0;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  addPlayer(id: string, socketId: string, name: string, isHost: boolean): RoomPlayer {
    const player: RoomPlayer = {
      id,
      socketId,
      name,
      isReady: isHost, // host is always ready
      isHost,
      isCpu: false,
    };
    this.players.push(player);
    return player;
  }

  addCpuPlayer(): RoomPlayer {
    this.cpuCounter++;
    const cpuId = `cpu_${this.roomId}_${this.cpuCounter}`;
    const cpuNames = ['CPU-A', 'CPU-B', 'CPU-C'];
    const cpuName = cpuNames[(this.cpuCounter - 1) % cpuNames.length];

    const player: RoomPlayer = {
      id: cpuId,
      socketId: null,
      name: cpuName,
      isReady: true,
      isHost: false,
      isCpu: true,
    };
    this.players.push(player);
    return player;
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  removeCpu(cpuId: string): void {
    this.players = this.players.filter(p => !(p.id === cpuId && p.isCpu));
  }

  resetForNewGame(): void {
    this.status = 'waiting';
    this.gameState = null;
    this.gameEngine = null;
    // CPUプレイヤーを除去
    this.players = this.players.filter(p => !p.isCpu);
    // 全員のready状態をリセット（ホストは常にready）
    for (const p of this.players) {
      p.isReady = p.isHost;
    }
  }

  findPlayerBySocketId(socketId: string): RoomPlayer | undefined {
    return this.players.find(p => p.socketId === socketId);
  }

  findPlayerById(playerId: string): RoomPlayer | undefined {
    return this.players.find(p => p.id === playerId);
  }

  get humanCount(): number {
    return this.players.filter(p => !p.isCpu).length;
  }

  get totalCount(): number {
    return this.players.length;
  }

  get allReady(): boolean {
    return this.players.length === this.maxPlayers &&
      this.players.every(p => p.isReady);
  }

  toSummary(): RoomSummary {
    const host = this.players.find(p => p.isHost);
    return {
      roomId: this.roomId,
      hostName: host?.name ?? 'Unknown',
      playerCount: this.totalCount,
      maxPlayers: this.maxPlayers,
      status: this.status,
    };
  }

  toDetail(): RoomDetail {
    return {
      roomId: this.roomId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        isHost: p.isHost,
        isCpu: p.isCpu,
      })),
      maxPlayers: this.maxPlayers,
      status: this.status,
    };
  }
}
