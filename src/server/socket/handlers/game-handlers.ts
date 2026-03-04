import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/events';
import type { RoomManager } from '../../room/RoomManager';
import type { GameEngine } from '../../game-engine/GameEngine';
import { emitGameEvents, processCpuTurns, processCpuRuleSelection, startPlayerTurnTimer } from './shared-utils';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerGameHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {
  socket.on('game:play_cards', ({ cardIds }) => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    const events = engine.handlePlayCards(playerId, cardIds);
    emitGameEvents(io, room, events);
  });

  socket.on('game:confirm_play', () => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    engine.clearTurnTimer();
    const events = engine.handleConfirmPlay(playerId);
    emitGameEvents(io, room, events);
    processCpuTurns(io, room, engine);
  });

  socket.on('game:cancel_play', () => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    const events = engine.handleCancelPlay(playerId);
    emitGameEvents(io, room, events);
  });

  socket.on('game:pass', () => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    engine.clearTurnTimer();
    const events = engine.handlePass(playerId);
    emitGameEvents(io, room, events);
    processCpuTurns(io, room, engine);
  });

  socket.on('game:ten_discard_select', ({ cardIds }) => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    const events = engine.handleTenDiscard(playerId, cardIds);
    emitGameEvents(io, room, events);
    processCpuTurns(io, room, engine);
  });

  socket.on('game:twelve_bomber_declare', ({ ranks }) => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    const events = engine.handleTwelveBomber(playerId, ranks);
    emitGameEvents(io, room, events);
    processCpuTurns(io, room, engine);
  });

  socket.on('game:seven_pass_select', ({ cardIds }) => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    const events = engine.handleSevenPass(playerId, cardIds);
    emitGameEvents(io, room, events);
    processCpuTurns(io, room, engine);
  });

  socket.on('game:exchange_select', ({ cardIds }) => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    const events = engine.handleExchangeSelect(playerId, cardIds);
    emitGameEvents(io, room, events);
    processCpuTurns(io, room, engine);
  });

  // Round result → proceed to rule selection
  socket.on('game:proceed_from_round', () => {
    const result = roomManager.getRoomBySocketId(socket.id);
    if (!result) return;
    const { room } = result;
    const engine = (room as any).gameEngine as GameEngine | null;
    if (!engine) return;
    engine.clearTurnTimer();
    const events = engine.proceedFromRoundResult();
    emitGameEvents(io, room, events);
    if (engine.gameState.phase === 'RULE_SELECTION') {
      processCpuRuleSelection(io, room, engine);
    }
  });
}
