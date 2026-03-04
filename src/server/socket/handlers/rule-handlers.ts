import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/events';
import type { RoomManager } from '../../room/RoomManager';
import type { GameEngine } from '../../game-engine/GameEngine';
import { emitGameEvents, processCpuTurns, processCpuExchange } from './shared-utils';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerRuleHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {
  socket.on('game:select_rule', ({ ruleId }) => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    const events = engine.handleSelectRule(playerId, ruleId);
    emitGameEvents(io, room, events);

    // After rule selection completes, handle next phase
    if (engine.gameState.phase === 'PLAYING') {
      processCpuTurns(io, room, engine);
    } else if (engine.gameState.phase === 'CARD_EXCHANGE') {
      processCpuExchange(io, room, engine);
    }
  });

  socket.on('game:reroll_rules', () => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    const events = engine.handleRerollRules(playerId);
    emitGameEvents(io, room, events);
  });
}
