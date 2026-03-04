import type { AnyCard, CardPlay, Rank } from '../../shared/types/card';
import { isRegularCard } from '../../shared/types/card';
import type {
  ClientGameState, ClientFieldState, ClientPlayerInfo,
  GameState, PlayerRanking,
} from '../../shared/types/game';
import type { AdditionalRuleId } from '../../shared/types/rules';
import type { PlayEffect } from '../../shared/types/events';
import { INVALID_PLAY_PENALTY, EXCHANGE_GIVE_COUNT } from '../../shared/constants/scoring';
import { ALL_RULE_IDS } from '../../shared/constants/rules';
import { sortCards, getStrongestCards, removeCardsById, findCardById } from '../../shared/utils/card-utils';
import { getNonJokerRank } from '../../shared/utils/card-utils';
import { DeckManager } from './DeckManager';
import { CardComparator } from './CardComparator';
import { PlayValidator } from './PlayValidator';
import { RuleEngine, type PendingAction } from './RuleEngine';
import { PhaseManager } from './PhaseManager';

export interface GameEvent {
  type: string;
  target?: 'all' | 'player';
  playerId?: string;
  data: any;
}

export class GameEngine {
  private state: GameState;
  private deckManager: DeckManager;
  private comparator: CardComparator;
  private validator: PlayValidator;
  private ruleEngine: RuleEngine;
  private phaseManager: PhaseManager;

  // Staged play (3-step flow: select -> stage -> confirm)
  private stagedPlay: { playerId: string; cardIds: string[] } | null = null;

  // Pending special actions
  private pendingActions: PendingAction[] = [];

  // Rule selection state
  private ruleSelections: Map<string, {
    options: [AdditionalRuleId, AdditionalRuleId];
    rerollsRemaining: number;
    selectedRule: AdditionalRuleId | null;
  }> = new Map();

  // Exchange state
  private exchangeSelections: Map<string, AnyCard[]> = new Map();

  // Turn timer
  private turnTimerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly TURN_DURATION = 30;

  constructor(
    roomId: string,
    playerIds: string[],
    playerNames: Record<string, string>,
    cpuFlags: Record<string, boolean>
  ) {
    this.deckManager = new DeckManager();
    this.comparator = new CardComparator();
    this.validator = new PlayValidator();
    this.ruleEngine = new RuleEngine();
    this.phaseManager = new PhaseManager();

    this.state = this.phaseManager.createInitialGameState(
      roomId, playerIds, playerNames, cpuFlags
    );
  }

  get gameState(): GameState {
    return this.state;
  }

  // ========== GAME INITIALIZATION ==========

  initializeGame(): GameEvent[] {
    const events: GameEvent[] = [];

    // Deal cards
    const hands = this.deckManager.deal(4);
    const playerIds = this.state.playerOrder;

    for (let i = 0; i < playerIds.length; i++) {
      const pid = playerIds[i];
      this.state.players[pid].hand = sortCards(hands[i], this.state.field.isRevolution);
    }

    events.push({
      type: 'game:round_start',
      target: 'all',
      data: { roundNumber: this.state.round.roundNumber },
    });

    // Start rule selection (round 1 also gets rule selection)
    const ruleEvents = this.startRuleSelection();
    events.push(...ruleEvents);

    // Send state to each player
    this.addStateUpdates(events);

    return events;
  }

  // ========== CARD PLAY (3-STEP FLOW) ==========

  handlePlayCards(playerId: string, cardIds: string[]): GameEvent[] {
    const events: GameEvent[] = [];

    if (this.state.phase !== 'PLAYING') return events;
    if (this.state.field.currentTurnPlayerId !== playerId) return events;
    if (this.pendingActions.length > 0) return events;

    // Validate cards exist in hand
    const player = this.state.players[playerId];
    const cards: AnyCard[] = [];
    for (const id of cardIds) {
      const card = findCardById(player.hand, id);
      if (!card) {
        events.push({
          type: 'game:invalid_play',
          target: 'player',
          playerId,
          data: { reason: '手札にないカードです。', penalty: 0 },
        });
        return events;
      }
      cards.push(card);
    }

    // Stage the play (step 2: "出す")
    this.stagedPlay = { playerId, cardIds };

    events.push({
      type: 'game:play_staged',
      target: 'all',
      data: {
        playerId,
        cards,
        playType: this.validator.detectPlayType(cards) || 'single',
      },
    });

    return events;
  }

  handleConfirmPlay(playerId: string): GameEvent[] {
    const events: GameEvent[] = [];

    if (!this.stagedPlay || this.stagedPlay.playerId !== playerId) {
      // No cards staged - penalty!
      const player = this.state.players[playerId];
      if (player) {
        this.state.scores[playerId] = (this.state.scores[playerId] || 0) + INVALID_PLAY_PENALTY;
        player.totalScore = this.state.scores[playerId];
        events.push({
          type: 'game:invalid_play',
          target: 'all',
          data: { reason: 'カードが出されていません。', penalty: INVALID_PLAY_PENALTY },
        });
        this.addStateUpdates(events);
      }
      return events;
    }

    const { cardIds } = this.stagedPlay;
    this.stagedPlay = null;

    const player = this.state.players[playerId];
    const cards: AnyCard[] = cardIds.map(id => findCardById(player.hand, id)!).filter(Boolean);

    // Full validation
    const validation = this.validator.validate(
      cards, player.hand, this.state.field, this.state.activeRules
    );

    if (!validation.valid) {
      this.state.scores[playerId] = (this.state.scores[playerId] || 0) + INVALID_PLAY_PENALTY;
      player.totalScore = this.state.scores[playerId];
      events.push({
        type: 'game:invalid_play',
        target: 'all',
        data: { reason: validation.reason, penalty: INVALID_PLAY_PENALTY },
      });
      this.addStateUpdates(events);
      return events;
    }

    // Execute the play
    const playType = validation.playType!;
    const play: CardPlay = { cards, playType, playerId };

    // Remove cards from hand
    player.hand = removeCardsById(player.hand, cardIds);

    // Place on field
    this.state.field.playHistory.push(play);
    this.state.field.currentPlay = play;
    this.state.field.lastPlayerId = playerId;
    this.state.field.consecutivePasses = 0;

    // Reset pass states
    for (const p of Object.values(this.state.players)) {
      p.hasPassedThisTurn = false;
    }

    // Apply rule effects
    const postPlay = this.ruleEngine.applyPostPlayEffects(play, this.state);

    // Apply effects to state
    for (const effect of postPlay.effects) {
      this.applyEffect(effect);
    }

    // Update parity tracking
    if (this.state.activeRules.includes('even_odd_alternate')) {
      this.state.field.lastPlayParity = this.ruleEngine.getPlayParity(play);
    }

    // Update number lock
    this.updateLocks();

    events.push({
      type: 'game:play_confirmed',
      target: 'all',
      data: { playerId, cards, playType, effects: postPlay.effects },
    });

    // Handle 4者蘇生 immediately
    if (postPlay.effects.some(e => e.type === 'four_revive')) {
      const count = (postPlay.effects.find(e => e.type === 'four_revive') as any)?.count || 0;
      const revived = this.deckManager.drawRandomFromDiscard(count);
      player.hand.push(...revived);
      player.hand = sortCards(player.hand, this.state.field.isRevolution);
      events.push({
        type: 'game:four_revive_result',
        target: 'all',
        data: { playerId, count: revived.length },
      });
    }

    // Check if player finished (hand empty)
    if (player.hand.length === 0) {
      const ranking = this.phaseManager.assignRanking(this.state, playerId);

      // Check capital fall
      const capitalFall = this.ruleEngine.checkCapitalFall(
        this.state, playerId, this.state.round.finishedPlayers.length - 1
      );
      if (capitalFall) {
        events.push({
          type: 'game:capital_fall',
          target: 'all',
          data: { playerId: (capitalFall as any).playerId },
        });
      }

      events.push({
        type: 'game:player_finished',
        target: 'all',
        data: { playerId, ranking },
      });

      // Check if round is over
      if (this.phaseManager.isRoundOver(this.state)) {
        const roundScores = this.phaseManager.endRound(this.state);
        events.push({
          type: 'game:round_end',
          target: 'all',
          data: {
            rankings: Object.fromEntries(
              Object.values(this.state.players).map(p => [p.id, p.roundRanking])
            ),
            roundScores,
            totalScores: { ...this.state.scores },
          },
        });

        if (this.phaseManager.isGameOver(this.state)) {
          this.state.phase = 'GAME_OVER';
          events.push({
            type: 'game:game_over',
            target: 'all',
            data: this.buildGameOverData(),
          });
        }

        this.addStateUpdates(events);
        return events;
      }
    }

    // Handle pending actions (ten_discard, twelve_bomber, seven_pass)
    if (postPlay.pendingActions.length > 0) {
      this.pendingActions = postPlay.pendingActions;
      const firstAction = this.pendingActions[0];
      events.push({
        type: `game:${firstAction.type}_prompt`,
        target: 'player',
        playerId: firstAction.playerId,
        data: { count: firstAction.count },
      });
      this.addStateUpdates(events);
      return events;
    }

    // Clear field if needed (8-cut, sandstorm, ambulance)
    if (postPlay.clearField) {
      this.phaseManager.clearField(this.state);
      this.state.field.currentTurnPlayerId = playerId;
      // If the player who cleared has finished, give turn to next
      if (this.state.players[playerId].finishOrder !== null) {
        const next = this.phaseManager.getNextPlayer(this.state, 0);
        this.state.field.currentTurnPlayerId = next;
      }
      events.push({
        type: 'game:field_cleared',
        target: 'all',
        data: { nextPlayerId: this.state.field.currentTurnPlayerId },
      });
    } else {
      // Reverse direction if king reverse
      if (postPlay.reverseDirection) {
        this.state.field.turnDirection *= -1;
      }

      // Advance to next player
      const nextPlayer = this.phaseManager.getNextPlayer(this.state, postPlay.skipCount);
      this.state.field.currentTurnPlayerId = nextPlayer;
    }

    this.addStateUpdates(events);
    return events;
  }

  handleCancelPlay(playerId: string): GameEvent[] {
    const events: GameEvent[] = [];
    if (this.stagedPlay && this.stagedPlay.playerId === playerId) {
      this.stagedPlay = null;
      events.push({
        type: 'game:play_cancelled',
        target: 'all',
        data: { playerId },
      });
    }
    return events;
  }

  // ========== PASS ==========

  handlePass(playerId: string): GameEvent[] {
    const events: GameEvent[] = [];

    if (this.state.phase !== 'PLAYING') return events;
    if (this.state.field.currentTurnPlayerId !== playerId) return events;

    const player = this.state.players[playerId];
    player.hasPassedThisTurn = true;
    this.state.field.consecutivePasses++;

    // Pass penalty
    const penalty = this.ruleEngine.applyPassPenalty(this.state.activeRules as any);
    if (penalty !== 0) {
      this.state.scores[playerId] = (this.state.scores[playerId] || 0) + penalty;
      player.totalScore = this.state.scores[playerId];
    }

    events.push({
      type: 'game:pass_result',
      target: 'all',
      data: { playerId },
    });

    // Check if all active (non-finished) players have passed
    const activePlayers = Object.values(this.state.players)
      .filter(p => p.finishOrder === null);
    const allPassed = activePlayers.every(p =>
      p.hasPassedThisTurn || p.id === this.state.field.lastPlayerId
    );

    if (allPassed && this.state.field.lastPlayerId) {
      // Field clears - last player who played gets the turn
      this.phaseManager.clearField(this.state);
      let nextPlayer = this.state.field.lastPlayerId;

      // If that player already finished, find next active player
      if (this.state.players[nextPlayer].finishOrder !== null) {
        const next = this.phaseManager.getNextPlayer(this.state, 0);
        nextPlayer = next || this.state.playerOrder[0];
      }

      this.state.field.currentTurnPlayerId = nextPlayer;
      events.push({
        type: 'game:field_cleared',
        target: 'all',
        data: { nextPlayerId: nextPlayer },
      });
    } else {
      // Next player's turn
      const nextPlayer = this.phaseManager.getNextPlayer(this.state, 0);
      this.state.field.currentTurnPlayerId = nextPlayer;
    }

    this.addStateUpdates(events);
    return events;
  }

  // ========== SPECIAL RULE ACTIONS ==========

  handleTenDiscard(playerId: string, cardIds: string[]): GameEvent[] {
    const events: GameEvent[] = [];
    const action = this.pendingActions.find(a => a.type === 'ten_discard' && a.playerId === playerId);
    if (!action) return events;

    const player = this.state.players[playerId];

    if (cardIds.length > action.count) {
      // Can only discard up to count
      cardIds = cardIds.slice(0, action.count);
    }

    const discardedCards = cardIds
      .map(id => findCardById(player.hand, id))
      .filter(Boolean) as AnyCard[];

    player.hand = removeCardsById(player.hand, cardIds);
    this.deckManager.addToDiscard(discardedCards);

    this.pendingActions = this.pendingActions.filter(a => a !== action);
    this.advanceAfterPendingAction(events);
    this.addStateUpdates(events);
    return events;
  }

  handleTwelveBomber(playerId: string, ranks: Rank[]): GameEvent[] {
    const events: GameEvent[] = [];
    const action = this.pendingActions.find(a => a.type === 'twelve_bomber' && a.playerId === playerId);
    if (!action) return events;

    // Limit to declared count
    const declaredRanks = ranks.slice(0, action.count);

    // Remove matching cards from ALL players
    for (const p of Object.values(this.state.players)) {
      const toRemove = p.hand.filter(
        c => isRegularCard(c) && declaredRanks.includes(c.rank)
      );
      if (toRemove.length > 0) {
        p.hand = p.hand.filter(
          c => !(isRegularCard(c) && declaredRanks.includes(c.rank))
        );
        this.deckManager.addToDiscard(toRemove);
      }
    }

    this.pendingActions = this.pendingActions.filter(a => a !== action);
    this.advanceAfterPendingAction(events);
    this.addStateUpdates(events);
    return events;
  }

  handleSevenPass(playerId: string, cardIds: string[]): GameEvent[] {
    const events: GameEvent[] = [];
    const action = this.pendingActions.find(a => a.type === 'seven_pass' && a.playerId === playerId);
    if (!action) return events;

    const player = this.state.players[playerId];
    const cardsToPass = cardIds.slice(0, action.count)
      .map(id => findCardById(player.hand, id))
      .filter(Boolean) as AnyCard[];

    // Remove from current player
    player.hand = removeCardsById(player.hand, cardsToPass.map(c => c.id));

    // Find next player to receive
    const nextPlayerId = this.phaseManager.getNextPlayer(this.state, 0);
    if (nextPlayerId) {
      const nextPlayer = this.state.players[nextPlayerId];
      nextPlayer.hand.push(...cardsToPass);
      nextPlayer.hand = sortCards(nextPlayer.hand, this.state.field.isRevolution);
    }

    this.pendingActions = this.pendingActions.filter(a => a !== action);
    this.advanceAfterPendingAction(events);
    this.addStateUpdates(events);
    return events;
  }

  // ========== CARD EXCHANGE ==========

  handleExchangeSelect(playerId: string, cardIds: string[]): GameEvent[] {
    const events: GameEvent[] = [];

    if (this.state.phase !== 'CARD_EXCHANGE') return events;

    const player = this.state.players[playerId];
    const ranking = this.state.previousRankings?.[playerId];
    if (!ranking) return events;

    const expectedCount = EXCHANGE_GIVE_COUNT[ranking];
    if (cardIds.length !== expectedCount) return events;

    const cards = cardIds
      .map(id => findCardById(player.hand, id))
      .filter(Boolean) as AnyCard[];

    this.exchangeSelections.set(playerId, cards);

    // Check if all exchanges are ready
    if (this.exchangeSelections.size === 4) {
      this.executeExchange(events);
    }

    return events;
  }

  private executeExchange(events: GameEvent[]): void {
    const rankings = this.state.previousRankings;
    if (!rankings) return;

    const daifugou = Object.entries(rankings).find(([, r]) => r === 'daifugou')?.[0];
    const fugou = Object.entries(rankings).find(([, r]) => r === 'fugou')?.[0];
    const hinmin = Object.entries(rankings).find(([, r]) => r === 'hinmin')?.[0];
    const daihinmin = Object.entries(rankings).find(([, r]) => r === 'daihinmin')?.[0];

    if (!daifugou || !fugou || !hinmin || !daihinmin) return;

    // daifugou <-> daihinmin (2 cards)
    this.swapCards(daifugou, daihinmin, events);

    // fugou <-> hinmin (1 card)
    this.swapCards(fugou, hinmin, events);

    // Clear exchange state
    this.exchangeSelections.clear();

    // Now deal and start playing
    this.phaseManager.startPlaying(this.state);
    this.addStateUpdates(events);
  }

  private swapCards(upperPlayerId: string, lowerPlayerId: string, events: GameEvent[]): void {
    const upperPlayer = this.state.players[upperPlayerId];
    const lowerPlayer = this.state.players[lowerPlayerId];

    // Upper gives chosen cards
    const upperGives = this.exchangeSelections.get(upperPlayerId) || [];
    // Lower gives strongest cards (auto-selected)
    const lowerGives = this.exchangeSelections.get(lowerPlayerId) || [];

    // Remove cards and swap
    upperPlayer.hand = removeCardsById(upperPlayer.hand, upperGives.map(c => c.id));
    lowerPlayer.hand = removeCardsById(lowerPlayer.hand, lowerGives.map(c => c.id));

    upperPlayer.hand.push(...lowerGives);
    lowerPlayer.hand.push(...upperGives);

    upperPlayer.hand = sortCards(upperPlayer.hand, this.state.field.isRevolution);
    lowerPlayer.hand = sortCards(lowerPlayer.hand, this.state.field.isRevolution);

    events.push({
      type: 'game:exchange_complete',
      target: 'player',
      playerId: upperPlayerId,
      data: { newHand: upperPlayer.hand },
    });
    events.push({
      type: 'game:exchange_complete',
      target: 'player',
      playerId: lowerPlayerId,
      data: { newHand: lowerPlayer.hand },
    });
  }

  // ========== RULE SELECTION ==========

  startRuleSelection(): GameEvent[] {
    const events: GameEvent[] = [];
    this.state.phase = 'RULE_SELECTION';

    for (const playerId of this.state.playerOrder) {
      const options = this.getRandomRuleOptions();
      this.ruleSelections.set(playerId, {
        options,
        rerollsRemaining: 1,
        selectedRule: null,
      });

      events.push({
        type: 'game:rule_selection_start',
        target: 'player',
        playerId,
        data: { options, rerollsRemaining: 1 },
      });
    }

    return events;
  }

  handleSelectRule(playerId: string, ruleId: AdditionalRuleId): GameEvent[] {
    const events: GameEvent[] = [];

    const selection = this.ruleSelections.get(playerId);
    if (!selection) return events;
    if (!selection.options.includes(ruleId)) return events;

    selection.selectedRule = ruleId;

    // Check if all players selected
    const allSelected = Array.from(this.ruleSelections.values())
      .every(s => s.selectedRule !== null);

    if (allSelected) {
      // Add all selected rules
      const newRules: AdditionalRuleId[] = [];
      for (const sel of this.ruleSelections.values()) {
        if (sel.selectedRule && !this.state.activeRules.includes(sel.selectedRule)) {
          this.state.activeRules.push(sel.selectedRule);
          newRules.push(sel.selectedRule);
        }
      }

      events.push({
        type: 'game:rule_selection_result',
        target: 'all',
        data: {
          newRules,
          allActiveRules: [...this.state.activeRules],
        },
      });

      this.ruleSelections.clear();

      // Round 1: cards already dealt in initializeGame(), no exchange needed
      if (this.state.round.roundNumber === 1) {
        // Just start playing with current hand
        this.phaseManager.startPlaying(this.state);
        this.addStateUpdates(events);
      } else {
        // Round 2+: deal new cards and exchange
        // (prepareNextRound was already called in proceedFromRoundResult)
        events.push({
          type: 'game:round_start',
          target: 'all',
          data: { roundNumber: this.state.round.roundNumber },
        });

        const hands = this.deckManager.deal(4);
        for (let i = 0; i < this.state.playerOrder.length; i++) {
          const pid = this.state.playerOrder[i];
          this.state.players[pid].hand = sortCards(hands[i], this.state.field.isRevolution);
        }

        // Start card exchange
        this.state.phase = 'CARD_EXCHANGE';

        // Auto-select for daihinmin and hinmin (they must give strongest)
        this.autoSelectExchangeForLower();

        // Notify players
        for (const pid of this.state.playerOrder) {
          const prevRanking = this.state.previousRankings?.[pid];
          if (prevRanking) {
            const cardsToGive = EXCHANGE_GIVE_COUNT[prevRanking];
            events.push({
              type: 'game:exchange_start',
              target: 'player',
              playerId: pid,
              data: {
                role: prevRanking,
                receivedCards: [],
                cardsToGive,
              },
            });
          }
        }

        this.addStateUpdates(events);
      }
    }

    return events;
  }

  handleRerollRules(playerId: string): GameEvent[] {
    const events: GameEvent[] = [];

    const selection = this.ruleSelections.get(playerId);
    if (!selection || selection.rerollsRemaining <= 0) return events;

    selection.rerollsRemaining--;
    selection.options = this.getRandomRuleOptions();

    events.push({
      type: 'game:reroll_result',
      target: 'player',
      playerId,
      data: {
        options: selection.options,
        rerollsRemaining: selection.rerollsRemaining,
      },
    });

    return events;
  }

  // ========== ROUND TRANSITION ==========

  proceedFromRoundResult(): GameEvent[] {
    const events: GameEvent[] = [];

    if (this.phaseManager.isGameOver(this.state)) {
      this.state.phase = 'GAME_OVER';
      events.push({
        type: 'game:game_over',
        target: 'all',
        data: this.buildGameOverData(),
      });
      return events;
    }

    // Prepare next round (increment round number, save rankings, reset state)
    this.phaseManager.prepareNextRound(this.state);
    this.deckManager.clearDiscard();

    // Start rule selection
    return this.startRuleSelection();
  }

  // ========== CLIENT STATE ==========

  getClientState(playerId: string): ClientGameState {
    const player = this.state.players[playerId];

    const players: ClientPlayerInfo[] = this.state.playerOrder.map(id => {
      const p = this.state.players[id];
      return {
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        totalScore: p.totalScore,
        roundRanking: p.roundRanking,
        isConnected: p.isConnected,
        isCpu: p.isCpu,
        hasPassedThisTurn: p.hasPassedThisTurn,
        finishOrder: p.finishOrder,
      };
    });

    // Build recent history: up to 2 plays before the current one
    const history = this.state.field.playHistory;
    const recentHistory: typeof history = [];
    if (history.length >= 2) {
      // last entry is currentPlay itself, so take the 2 before it
      recentHistory.push(history[history.length - 2]);
      if (history.length >= 3) {
        recentHistory.unshift(history[history.length - 3]);
      }
    } else if (history.length === 1 && !this.state.field.currentPlay) {
      // field was cleared but history has leftover
      recentHistory.push(history[history.length - 1]);
    }

    const field: ClientFieldState = {
      currentPlay: this.state.field.currentPlay,
      recentHistory,
      isRevolution: this.state.field.isRevolution,
      isElevenBack: this.state.field.isElevenBack,
      numberLock: this.state.field.numberLock,
      suitLock: this.state.field.suitLock,
      turnDirection: this.state.field.turnDirection,
      currentTurnPlayerId: this.state.field.currentTurnPlayerId,
      consecutivePasses: this.state.field.consecutivePasses,
      lastPlayerId: this.state.field.lastPlayerId,
    };

    return {
      roomId: this.state.roomId,
      phase: this.state.phase,
      myHand: player ? sortCards(player.hand, this.state.field.isRevolution) : [],
      myId: playerId,
      players,
      field,
      round: { roundNumber: this.state.round.roundNumber },
      activeRules: [...this.state.activeRules],
      scores: { ...this.state.scores },
      isMyTurn: this.state.field.currentTurnPlayerId === playerId,
      previousRankings: this.state.previousRankings,
    };
  }

  // ========== CPU SUPPORT ==========

  isCpuTurn(): boolean {
    const currentPlayer = this.state.field.currentTurnPlayerId;
    if (!currentPlayer) return false;
    return this.state.players[currentPlayer]?.isCpu ?? false;
  }

  getCurrentPlayerId(): string | null {
    return this.state.field.currentTurnPlayerId;
  }

  hasPendingAction(): boolean {
    return this.pendingActions.length > 0;
  }

  getPendingAction(): PendingAction | null {
    return this.pendingActions[0] || null;
  }

  getRuleSelectionOptions(playerId: string): { options: [AdditionalRuleId, AdditionalRuleId]; rerollsRemaining: number } | null {
    const selection = this.ruleSelections.get(playerId);
    if (!selection) return null;
    return { options: selection.options, rerollsRemaining: selection.rerollsRemaining };
  }

  // ========== TURN TIMER ==========

  getTurnDuration(): number {
    return this.state.activeRules.includes('speed_round')
      ? Math.floor(this.TURN_DURATION / 2)
      : this.TURN_DURATION;
  }

  startTurnTimer(
    onTick: (remaining: number, total: number) => void,
    onTimeout: () => void
  ): void {
    this.clearTurnTimer();
    const total = this.getTurnDuration();
    let remaining = total;

    this.turnTimerInterval = setInterval(() => {
      remaining--;
      onTick(remaining, total);
      if (remaining <= 0) {
        this.clearTurnTimer();
        onTimeout();
      }
    }, 1000);
  }

  clearTurnTimer(): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = null;
    }
  }

  // ========== HELPERS ==========

  private applyEffect(effect: PlayEffect): void {
    switch (effect.type) {
      case 'eleven_back':
        this.state.field.isElevenBack = !this.state.field.isElevenBack;
        break;
      case 'revolution':
        this.state.field.isRevolution = (effect as any).active;
        break;
      case 'number_lock':
        this.state.field.numberLock = (effect as any).rank;
        break;
      case 'suit_lock':
        this.state.field.suitLock = (effect as any).suits;
        break;
    }
  }

  private updateLocks(): void {
    const { playHistory } = this.state.field;
    if (playHistory.length < 2) {
      this.state.field.numberLock = null;
      this.state.field.suitLock = null;
      return;
    }

    const last = playHistory[playHistory.length - 1];
    const prev = playHistory[playHistory.length - 2];

    // Number lock
    const lastRank = getNonJokerRank(last.cards);
    const prevRank = getNonJokerRank(prev.cards);
    if (lastRank !== null && prevRank !== null && lastRank === prevRank) {
      this.state.field.numberLock = lastRank;
    } else {
      this.state.field.numberLock = null;
    }

    // Suit lock
    const lastSuits = last.cards.filter(isRegularCard).map(c => c.suit).sort();
    const prevSuits = prev.cards.filter(isRegularCard).map(c => c.suit).sort();
    if (
      lastSuits.length > 0 && prevSuits.length > 0 &&
      JSON.stringify(lastSuits) === JSON.stringify(prevSuits)
    ) {
      this.state.field.suitLock = lastSuits as any;
    } else {
      this.state.field.suitLock = null;
    }
  }

  private advanceAfterPendingAction(events: GameEvent[]): void {
    if (this.pendingActions.length > 0) {
      // Still have pending actions
      const nextAction = this.pendingActions[0];
      events.push({
        type: `game:${nextAction.type}_prompt`,
        target: 'player',
        playerId: nextAction.playerId,
        data: { count: nextAction.count },
      });
      return;
    }

    // Check if current player finished
    const currentPlayer = this.state.field.lastPlayerId;
    if (currentPlayer && this.state.players[currentPlayer].hand.length === 0 &&
      this.state.players[currentPlayer].finishOrder === null) {
      const ranking = this.phaseManager.assignRanking(this.state, currentPlayer);
      events.push({
        type: 'game:player_finished',
        target: 'all',
        data: { playerId: currentPlayer, ranking },
      });

      if (this.phaseManager.isRoundOver(this.state)) {
        const roundScores = this.phaseManager.endRound(this.state);
        events.push({
          type: 'game:round_end',
          target: 'all',
          data: {
            rankings: Object.fromEntries(
              Object.values(this.state.players).map(p => [p.id, p.roundRanking])
            ),
            roundScores,
            totalScores: { ...this.state.scores },
          },
        });
        return;
      }
    }

    // Advance turn
    const nextPlayer = this.phaseManager.getNextPlayer(this.state, 0);
    this.state.field.currentTurnPlayerId = nextPlayer;
  }

  private getRandomRuleOptions(): [AdditionalRuleId, AdditionalRuleId] {
    const available = ALL_RULE_IDS.filter(id => !this.state.activeRules.includes(id));

    if (available.length < 2) {
      return [available[0] || 'ten_discard', available[1] || 'twelve_bomber'];
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
  }

  private autoSelectExchangeForLower(): void {
    if (!this.state.previousRankings) return;

    for (const [playerId, ranking] of Object.entries(this.state.previousRankings)) {
      if (ranking === 'daihinmin' || ranking === 'hinmin') {
        const player = this.state.players[playerId];
        const count = EXCHANGE_GIVE_COUNT[ranking];
        const strongestCards = getStrongestCards(
          player.hand, count, this.state.field.isRevolution
        );
        this.exchangeSelections.set(playerId, strongestCards);
      }
    }
  }

  private buildGameOverData() {
    const finalRankings = Object.values(this.state.players)
      .map(p => ({
        playerId: p.id,
        name: p.name,
        score: this.state.scores[p.id] || 0,
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return {
      finalScores: { ...this.state.scores },
      finalRankings,
    };
  }

  private addStateUpdates(events: GameEvent[]): void {
    for (const playerId of this.state.playerOrder) {
      if (!this.state.players[playerId].isCpu) {
        events.push({
          type: 'game:state_update',
          target: 'player',
          playerId,
          data: this.getClientState(playerId),
        });
      }
    }
  }
}
