import type { AnyCard, CardPlay, PlayType, Rank } from '../../shared/types/card';
import { isJoker, isRegularCard } from '../../shared/types/card';
import type { GameEngine, GameEvent } from '../game-engine/GameEngine';
import type { PendingAction } from '../game-engine/RuleEngine';
import { PlayValidator } from '../game-engine/PlayValidator';
import { getBaseStrength } from '../../shared/constants/cards';
import { sortCards } from '../../shared/utils/card-utils';

interface PossiblePlay {
  cards: AnyCard[];
  playType: PlayType;
  strength: number;
}

export class CpuPlayer {
  private validator: PlayValidator;

  constructor() {
    this.validator = new PlayValidator();
  }

  /**
   * CPU takes its turn - finds a play or passes
   */
  takeTurn(engine: GameEngine): GameEvent[] {
    const state = engine.gameState;
    const playerId = engine.getCurrentPlayerId();
    if (!playerId) return [];

    const player = state.players[playerId];
    if (!player || !player.isCpu) return [];

    // Find all possible plays
    const possiblePlays = this.findPossiblePlays(
      player.hand, state.field, state.activeRules
    );

    if (possiblePlays.length === 0) {
      // Must pass
      return engine.handlePass(playerId);
    }

    // Strategy: play the weakest valid cards
    possiblePlays.sort((a, b) => a.strength - b.strength);
    const chosen = possiblePlays[0];

    // Execute play (combined play + confirm for CPU)
    const cardIds = chosen.cards.map(c => c.id);
    const playEvents = engine.handlePlayCards(playerId, cardIds);
    const confirmEvents = engine.handleConfirmPlay(playerId);

    return [...playEvents, ...confirmEvents];
  }

  /**
   * Handle a pending special action for CPU
   */
  handlePendingAction(engine: GameEngine, action: PendingAction): GameEvent[] {
    const state = engine.gameState;
    const player = state.players[action.playerId];
    if (!player) return [];

    switch (action.type) {
      case 'ten_discard': {
        // Discard weakest cards
        const sorted = sortCards(player.hand, state.field.isRevolution);
        const toDiscard = sorted.slice(0, Math.min(action.count, sorted.length));
        return engine.handleTenDiscard(action.playerId, toDiscard.map(c => c.id));
      }

      case 'twelve_bomber': {
        // Declare most common ranks among opponents
        const opponentRanks = this.getMostCommonOpponentRanks(state, action.playerId, action.count);
        return engine.handleTwelveBomber(action.playerId, opponentRanks);
      }

      case 'seven_pass': {
        // Pass weakest cards
        const sorted = sortCards(player.hand, state.field.isRevolution);
        const toPass = sorted.slice(0, Math.min(action.count, sorted.length));
        return engine.handleSevenPass(action.playerId, toPass.map(c => c.id));
      }
    }

    return [];
  }

  /**
   * CPU selects a rule (picks randomly)
   */
  selectRule(engine: GameEngine, playerId: string, options: [string, string]): GameEvent[] {
    const chosen = options[Math.floor(Math.random() * options.length)];
    return engine.handleSelectRule(playerId, chosen as any);
  }

  /**
   * Find all valid plays from a hand
   */
  private findPossiblePlays(
    hand: AnyCard[],
    field: any,
    activeRules: string[]
  ): PossiblePlay[] {
    const plays: PossiblePlay[] = [];

    if (hand.length === 0) return plays;

    // Single cards
    for (const card of hand) {
      const result = this.validator.validate([card], hand, field, activeRules as any);
      if (result.valid) {
        plays.push({
          cards: [card],
          playType: 'single',
          strength: this.getCardStrength(card, field.isRevolution),
        });
      }
    }

    // Pairs, triples, quads - group by rank
    const rankGroups = this.groupByRank(hand);
    for (const [rank, cards] of Object.entries(rankGroups)) {
      // Pairs
      if (cards.length >= 2) {
        const pair = cards.slice(0, 2);
        const result = this.validator.validate(pair, hand, field, activeRules as any);
        if (result.valid) {
          plays.push({
            cards: pair,
            playType: 'pair',
            strength: this.getCardStrength(pair[0], field.isRevolution),
          });
        }
      }

      // Triples
      if (cards.length >= 3) {
        const triple = cards.slice(0, 3);
        const result = this.validator.validate(triple, hand, field, activeRules as any);
        if (result.valid) {
          plays.push({
            cards: triple,
            playType: 'triple',
            strength: this.getCardStrength(triple[0], field.isRevolution),
          });
        }
      }

      // Quads
      if (cards.length >= 4) {
        const quad = cards.slice(0, 4);
        const result = this.validator.validate(quad, hand, field, activeRules as any);
        if (result.valid) {
          plays.push({
            cards: quad,
            playType: 'quad',
            strength: this.getCardStrength(quad[0], field.isRevolution),
          });
        }
      }
    }

    // Sequences - find consecutive same-suit cards
    const sequences = this.findSequences(hand);
    for (const seq of sequences) {
      const result = this.validator.validate(seq, hand, field, activeRules as any);
      if (result.valid) {
        plays.push({
          cards: seq,
          playType: 'sequence',
          strength: Math.max(...seq.map(c => this.getCardStrength(c, field.isRevolution))),
        });
      }
    }

    // Sandstorm / Ambulance: special override plays (can be played anytime)
    if (activeRules.includes('sandstorm')) {
      const threes = hand.filter(c => isRegularCard(c) && c.rank === 3);
      if (threes.length >= 3) {
        const sandstormCards = threes.slice(0, 3);
        const result = this.validator.validate(sandstormCards, hand, field, activeRules as any);
        if (result.valid) {
          plays.push({
            cards: sandstormCards,
            playType: 'triple',
            strength: this.getCardStrength(sandstormCards[0], field.isRevolution),
          });
        }
      }
    }

    if (activeRules.includes('ambulance')) {
      const nines = hand.filter(c => isRegularCard(c) && c.rank === 9);
      if (nines.length >= 2) {
        const ambulanceCards = nines.slice(0, 2);
        const result = this.validator.validate(ambulanceCards, hand, field, activeRules as any);
        if (result.valid) {
          plays.push({
            cards: ambulanceCards,
            playType: 'pair',
            strength: this.getCardStrength(ambulanceCards[0], field.isRevolution),
          });
        }
      }
    }

    return plays;
  }

  private groupByRank(hand: AnyCard[]): Record<number, AnyCard[]> {
    const groups: Record<number, AnyCard[]> = {};
    for (const card of hand) {
      if (isRegularCard(card)) {
        if (!groups[card.rank]) groups[card.rank] = [];
        groups[card.rank].push(card);
      }
    }
    return groups;
  }

  private findSequences(hand: AnyCard[]): AnyCard[][] {
    const sequences: AnyCard[][] = [];
    const regularCards = hand.filter(isRegularCard);

    // Group by suit
    const suitGroups: Record<string, AnyCard[]> = {};
    for (const card of regularCards) {
      if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
      suitGroups[card.suit].push(card);
    }

    for (const cards of Object.values(suitGroups)) {
      if (cards.length < 3) continue;

      // Sort by strength
      const sorted = cards.sort((a, b) =>
        getBaseStrength((a as any).rank) - getBaseStrength((b as any).rank)
      );

      // Find consecutive runs of 3+
      for (let start = 0; start < sorted.length - 2; start++) {
        const seq: AnyCard[] = [sorted[start]];
        for (let j = start + 1; j < sorted.length; j++) {
          const prevStrength = getBaseStrength((seq[seq.length - 1] as any).rank);
          const curStrength = getBaseStrength((sorted[j] as any).rank);
          if (curStrength === prevStrength + 1) {
            seq.push(sorted[j]);
          } else {
            break;
          }
        }
        if (seq.length >= 3) {
          sequences.push(seq);
        }
      }
    }

    return sequences;
  }

  private getCardStrength(card: AnyCard, isRevolution: boolean): number {
    if (isJoker(card)) return 14;
    const base = getBaseStrength(card.rank);
    return isRevolution ? (12 - base) : base;
  }

  private getMostCommonOpponentRanks(state: any, myId: string, count: number): Rank[] {
    // Since CPU doesn't know opponents' hands, pick random ranks
    // (in a real game this could be smarter based on card counting)
    const allRanks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const shuffled = allRanks.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
