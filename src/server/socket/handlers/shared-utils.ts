import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/events';
import type { GameEngine, GameEvent } from '../../game-engine/GameEngine';
import { CpuPlayer } from '../../ai/CpuPlayer';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function emitGameEvents(io: IOServer, room: any, events: GameEvent[]): void {
  for (const event of events) {
    if (event.target === 'all') {
      io.to(room.roomId).emit(event.type as any, event.data);
    } else if (event.target === 'player' && event.playerId) {
      const roomPlayer = room.players.find((p: any) => p.id === event.playerId);
      if (roomPlayer?.socketId) {
        io.to(roomPlayer.socketId).emit(event.type as any, event.data);
      }
    }
  }
}

export function processCpuTurns(io: IOServer, room: any, engine: GameEngine): void {
  const cpuPlayer = new CpuPlayer();
  let safetyCounter = 0;

  const processTurn = () => {
    if (safetyCounter++ > 100) return;

    if (engine.hasPendingAction()) {
      const action = engine.getPendingAction();
      if (action && engine.gameState.players[action.playerId]?.isCpu) {
        const events = cpuPlayer.handlePendingAction(engine, action);
        emitGameEvents(io, room, events);
        setTimeout(processTurn, 2000);
      }
      return;
    }

    if (!engine.isCpuTurn()) {
      // Not CPU's turn - start timer for human player
      startPlayerTurnTimer(io, room, engine);
      return;
    }
    if (engine.gameState.phase !== 'PLAYING') return;

    const events = cpuPlayer.takeTurn(engine);
    emitGameEvents(io, room, events);

    setTimeout(processTurn, 5000);
  };

  setTimeout(processTurn, 5000);
}

export function processCpuRuleSelection(io: IOServer, room: any, engine: GameEngine): void {
  const cpuPlayer = new CpuPlayer();
  const state = engine.gameState;

  setTimeout(() => {
    for (const playerId of state.playerOrder) {
      const player = state.players[playerId];
      if (player.isCpu) {
        const options = engine.getRuleSelectionOptions(playerId);
        if (options) {
          const events = cpuPlayer.selectRule(engine, playerId, options.options);
          emitGameEvents(io, room, events);
        }
      }
    }

    // After CPU rule selection, check if exchange phase needs CPU handling
    if (engine.gameState.phase === 'CARD_EXCHANGE') {
      processCpuExchange(io, room, engine);
    } else if (engine.gameState.phase === 'PLAYING') {
      processCpuTurns(io, room, engine);
    }
  }, 2000);
}

export function processCpuExchange(io: IOServer, room: any, engine: GameEngine): void {
  const state = engine.gameState;

  setTimeout(() => {
    for (const playerId of state.playerOrder) {
      const player = state.players[playerId];
      if (player.isCpu && state.previousRankings) {
        const ranking = state.previousRankings[playerId];
        if (ranking === 'daifugou' || ranking === 'fugou') {
          const hand = player.hand;
          const count = ranking === 'daifugou' ? 2 : 1;
          const cardIds = hand.slice(0, count).map(c => c.id);
          const events = engine.handleExchangeSelect(playerId, cardIds);
          emitGameEvents(io, room, events);
        }
      }
    }

    // After exchange, start playing
    if (engine.gameState.phase === 'PLAYING') {
      processCpuTurns(io, room, engine);
    }
  }, 2000);
}

export function startPlayerTurnTimer(io: IOServer, room: any, engine: GameEngine): void {
  const playerId = engine.getCurrentPlayerId();
  if (!playerId) return;

  // Don't start timer for CPU
  if (engine.gameState.players[playerId]?.isCpu) return;

  // Don't start timer if not in PLAYING phase
  if (engine.gameState.phase !== 'PLAYING') return;

  const totalSeconds = engine.getTurnDuration();

  engine.startTurnTimer(
    // onTick: send remaining time to all players
    (remaining, total) => {
      io.to(room.roomId).emit('game:turn_timer', {
        playerId,
        remainingSeconds: remaining,
        totalSeconds: total,
      });
    },
    // onTimeout: auto-pass
    () => {
      io.to(room.roomId).emit('game:turn_timeout', { playerId });
      const events = engine.handlePass(playerId);
      emitGameEvents(io, room, events);
      processCpuTurns(io, room, engine);
    }
  );
}
