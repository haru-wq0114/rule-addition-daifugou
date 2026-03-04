export interface RoomPlayer {
  id: string;
  socketId: string | null; // null for CPU players
  name: string;
  isReady: boolean;
  isHost: boolean;
  isCpu: boolean;
}

export interface RoomSummary {
  roomId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface RoomDetail {
  roomId: string;
  players: {
    id: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
    isCpu: boolean;
  }[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}
