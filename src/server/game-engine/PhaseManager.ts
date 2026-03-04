import type { GamePhase, GameState, PlayerRanking, PlayerState } from '../../shared/types/game';
import { FINISH_ORDER_TO_RANKING, ROUND_SCORES } from '../../shared/constants/scoring';

export class PhaseManager {
  /**
   * Initialize a new game state for a room
   */
  createInitialGameState(
    roomId: string,
    playerIds: string[],
    playerNames: Record<string, string>,
    cpuFlags: Record<string, boolean>
  ): GameState {
    const players: Record<string, PlayerState> = {};
    const scores: Record<string, number> = {};

    for (const id of playerIds) {
      players[id] = {
        id,
        name: playerNames[id],
        hand: [],
        totalScore: 0,
        roundRanking: null,
        isConnected: true,
        isCpu: cpuFlags[id] || false,
        hasPassedThisTurn: false,
        finishOrder: null,
      };
      scores[id] = 0;
    }

    return {
      roomId,
      phase: 'DEALING',
      players,
      playerOrder: [...playerIds],
      field: {
        currentPlay: null,
        playHistory: [],
        isRevolution: false,
        isElevenBack: false,
        numberLock: null,
        suitLock: null,
        turnDirection: 1,
        currentTurnPlayerId: null,
        consecutivePasses: 0,
        lastPlayerId: null,
        lastClearedSuit: null,
        lastPlayParity: null,
      },
      round: {
        roundNumber: 1,
        finishedPlayers: [],
        discardPile: [],
      },
      activeRules: [],
      scores,
      previousRankings: null,
    };
  }

  /**
   * Transition to PLAYING phase after dealing
   */
  startPlaying(state: GameState): void {
    state.phase = 'PLAYING';

    // First player is determined by who has the 3 of diamonds
    // (or first player in order for simplicity)
    const firstPlayer = this.findFirstPlayer(state);
    state.field.currentTurnPlayerId = firstPlayer;

    // Reset pass states
    for (const player of Object.values(state.players)) {
      player.hasPassedThisTurn = false;
    }
  }

  /**
   * Find the first player (who has diamond 3)
   */
  private findFirstPlayer(state: GameState): string {
    for (const id of state.playerOrder) {
      const player = state.players[id];
      if (player.hand.some(c => c.id === 'd03')) {
        return id;
      }
    }
    return state.playerOrder[0];
  }

  /**
   * Get the next player's ID in turn order
   */
  getNextPlayer(state: GameState, skipCount: number = 0): string | null {
    const { playerOrder, field } = state;
    const currentIdx = playerOrder.indexOf(field.currentTurnPlayerId || playerOrder[0]);

    let checked = 0;
    let skipped = 0;
    let idx = currentIdx;

    while (checked < playerOrder.length) {
      idx = (idx + field.turnDirection + playerOrder.length) % playerOrder.length;
      checked++;

      const playerId = playerOrder[idx];
      const player = state.players[playerId];

      // Skip finished players
      if (player.finishOrder !== null) continue;

      // Skip if we still need to skip more players
      if (skipped < skipCount) {
        skipped++;
        continue;
      }

      return playerId;
    }

    return null; // No players left
  }

  /**
   * Assign rankings based on finish order
   */
  assignRanking(state: GameState, playerId: string): PlayerRanking {
    const finishOrder = state.round.finishedPlayers.length;
    const ranking = FINISH_ORDER_TO_RANKING[finishOrder] || 'daihinmin';

    state.players[playerId].finishOrder = finishOrder;
    state.players[playerId].roundRanking = ranking;
    state.round.finishedPlayers.push(playerId);

    return ranking;
  }

  /**
   * Check if the round is over (only 1 player remaining)
   */
  isRoundOver(state: GameState): boolean {
    const activePlayers = Object.values(state.players)
      .filter(p => p.finishOrder === null);
    return activePlayers.length <= 1;
  }

  /**
   * End the current round: assign last player as daihinmin, calculate scores
   */
  endRound(state: GameState): Record<string, number> {
    // Assign remaining player(s) as last
    const remaining = Object.values(state.players)
      .filter(p => p.finishOrder === null);

    for (const player of remaining) {
      this.assignRanking(state, player.id);
    }

    // Calculate scores
    const roundScores: Record<string, number> = {};
    const roundNum = state.round.roundNumber;

    for (const player of Object.values(state.players)) {
      if (player.roundRanking) {
        const score = ROUND_SCORES[roundNum]?.[player.roundRanking] || 0;
        roundScores[player.id] = score;
        state.scores[player.id] = (state.scores[player.id] || 0) + score;
        player.totalScore = state.scores[player.id];
      }
    }

    state.phase = 'ROUND_RESULT';
    return roundScores;
  }

  /**
   * Prepare for next round
   */
  prepareNextRound(state: GameState): void {
    const nextRound = (state.round.roundNumber + 1) as 1 | 2 | 3;

    // Save current rankings for capital fall check
    state.previousRankings = {};
    for (const player of Object.values(state.players)) {
      if (player.roundRanking) {
        state.previousRankings[player.id] = player.roundRanking;
      }
    }

    // Reset round state
    state.round = {
      roundNumber: nextRound,
      finishedPlayers: [],
      discardPile: [],
    };

    // Reset field
    state.field = {
      currentPlay: null,
      playHistory: [],
      isRevolution: false,
      isElevenBack: false,
      numberLock: null,
      suitLock: null,
      turnDirection: 1,
      currentTurnPlayerId: null,
      consecutivePasses: 0,
      lastPlayerId: null,
      lastClearedSuit: null,
      lastPlayParity: null,
    };

    // Reset player states
    for (const player of Object.values(state.players)) {
      player.hand = [];
      player.roundRanking = null;
      player.hasPassedThisTurn = false;
      player.finishOrder = null;
    }
  }

  /**
   * Check if the entire game is over (3 rounds complete)
   */
  isGameOver(state: GameState): boolean {
    return state.round.roundNumber >= 3 && state.phase === 'ROUND_RESULT';
  }

  /**
   * Clear the field
   */
  clearField(state: GameState): void {
    // Track suit of last play for suit_ban rule
    if (state.field.currentPlay) {
      const lastCards = state.field.currentPlay.cards;
      const regularCards = lastCards.filter(c => c.suit !== 'joker');
      if (regularCards.length > 0) {
        state.field.lastClearedSuit = regularCards[0].suit as any;
      }
    }

    state.field.currentPlay = null;
    state.field.playHistory = [];
    state.field.isElevenBack = false;
    state.field.numberLock = null;
    state.field.suitLock = null;
    state.field.consecutivePasses = 0;
    state.field.lastPlayParity = null;

    // Reset pass states
    for (const player of Object.values(state.players)) {
      player.hasPassedThisTurn = false;
    }
  }
}
