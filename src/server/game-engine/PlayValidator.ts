import type { AnyCard, CardPlay, PlayType, Rank, Suit } from '../../shared/types/card';
import { isJoker, isRegularCard } from '../../shared/types/card';
import { getBaseStrength } from '../../shared/constants/cards';
import type { FieldState } from '../../shared/types/game';
import type { AdditionalRuleId } from '../../shared/types/rules';
import { CardComparator } from './CardComparator';
import { getNonJokerRank, getSuitPattern, getParity } from '../../shared/utils/card-utils';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  playType?: PlayType;
}

export class PlayValidator {
  private comparator: CardComparator;

  constructor() {
    this.comparator = new CardComparator();
  }

  validate(
    cards: AnyCard[],
    playerHand: AnyCard[],
    field: FieldState,
    activeRules: AdditionalRuleId[]
  ): ValidationResult {
    // 1. Check cards are in player's hand
    const handIds = new Set(playerHand.map(c => c.id));
    for (const card of cards) {
      if (!handIds.has(card.id)) {
        return { valid: false, reason: '手札にないカードが含まれています。' };
      }
    }

    if (cards.length === 0) {
      return { valid: false, reason: 'カードが選択されていません。' };
    }

    // 2. Determine play type
    const playType = this.detectPlayType(cards);
    if (!playType) {
      return { valid: false, reason: '無効なカードの組み合わせです。' };
    }

    // 2.5. Sandstorm / Ambulance: special override plays that bypass all field rules
    if (activeRules.includes('sandstorm') && this.checkSandstorm(cards)) {
      return { valid: true, playType: 'triple' };
    }
    if (activeRules.includes('ambulance') && this.checkAmbulance(cards)) {
      return { valid: true, playType: 'pair' };
    }

    // 3. If field is empty, almost any valid combination is allowed
    if (!field.currentPlay) {
      // Check suit ban (同種禁止制) if active
      if (activeRules.includes('suit_ban') && field.lastClearedSuit) {
        const playSuits = cards.filter(isRegularCard).map(c => c.suit);
        if (playSuits.length > 0 && playSuits.every(s => s === field.lastClearedSuit)) {
          return { valid: false, reason: `同種禁止制: ${field.lastClearedSuit}は出せません。` };
        }
      }

      return { valid: true, playType };
    }

    // 4. Field is not empty - must match play type and card count and be stronger
    const fieldPlay = field.currentPlay;

    if (playType !== fieldPlay.playType) {
      return { valid: false, reason: `場と同じ出し方（${fieldPlay.playType}）でなければなりません。` };
    }

    if (cards.length !== fieldPlay.cards.length) {
      return { valid: false, reason: `場と同じ枚数（${fieldPlay.cards.length}枚）でなければなりません。` };
    }

    // Build a temporary CardPlay for comparison
    const newPlay: CardPlay = { cards, playType, playerId: '' };

    if (!this.comparator.isStronger(newPlay, fieldPlay, field.isRevolution, field.isElevenBack)) {
      return { valid: false, reason: '場のカードより強いカードを出す必要があります。' };
    }

    // 5. Check number lock (数縛り)
    if (field.numberLock !== null) {
      const playRank = getNonJokerRank(cards);
      if (playRank !== null && playRank !== field.numberLock) {
        return { valid: false, reason: `数縛り: ${field.numberLock}しか出せません。` };
      }
    }

    // 6. Check suit lock (色縛り)
    if (field.suitLock !== null) {
      const playSuits = getSuitPattern(cards);
      const lockedSuits = [...field.suitLock].sort();
      if (playSuits.length > 0 && JSON.stringify(playSuits) !== JSON.stringify(lockedSuits)) {
        return { valid: false, reason: '色縛り: 同じスートで出す必要があります。' };
      }
    }

    // 7. Check even/odd alternate (偶奇交互制)
    if (activeRules.includes('even_odd_alternate') && field.lastPlayParity !== null) {
      const playRank = getNonJokerRank(cards);
      if (playRank !== null) {
        const requiredParity = field.lastPlayParity === 'even' ? 'odd' : 'even';
        if (getParity(playRank) !== requiredParity) {
          return {
            valid: false,
            reason: `偶奇交互制: ${requiredParity === 'even' ? '偶数' : '奇数'}を出す必要があります。`,
          };
        }
      }
    }

    return { valid: true, playType };
  }

  /**
   * Detect the play type from a set of cards.
   * Returns null if the cards don't form a valid play.
   */
  detectPlayType(cards: AnyCard[]): PlayType | null {
    if (cards.length === 0) return null;

    const jokerCount = cards.filter(isJoker).length;
    const regularCards = cards.filter(isRegularCard);

    // Single card
    if (cards.length === 1) return 'single';

    // Check for sequence (階段): 3+ consecutive cards of the same suit
    if (cards.length >= 3 && this.isSequence(cards)) {
      return 'sequence';
    }

    // Check for same-rank groups (pair, triple, quad)
    if (regularCards.length === 0) {
      // All jokers
      if (cards.length === 2) return 'pair';
      if (cards.length === 3) return 'triple';
      if (cards.length === 4) return 'quad';
      return null;
    }

    // All regular cards must be the same rank
    const ranks = new Set(regularCards.map(c => c.rank));
    if (ranks.size !== 1) {
      // Not same rank and not a sequence
      return null;
    }

    const totalCount = regularCards.length + jokerCount;
    if (totalCount === 2) return 'pair';
    if (totalCount === 3) return 'triple';
    if (totalCount === 4) return 'quad';

    return null;
  }

  /**
   * Check if cards form a valid sequence (階段).
   * 3+ consecutive cards of the same suit. Joker can fill gaps.
   */
  private isSequence(cards: AnyCard[]): boolean {
    if (cards.length < 3) return false;

    const jokerCount = cards.filter(isJoker).length;
    const regularCards = cards.filter(isRegularCard);

    if (regularCards.length === 0) return false;

    // All regular cards must be the same suit
    const suits = new Set(regularCards.map(c => c.suit));
    if (suits.size !== 1) return false;

    // Get base strengths and sort
    const strengths = regularCards
      .map(c => getBaseStrength(c.rank))
      .sort((a, b) => a - b);

    // Check if cards form a consecutive sequence with jokers filling gaps
    let jokersNeeded = 0;
    for (let i = 1; i < strengths.length; i++) {
      const gap = strengths[i] - strengths[i - 1];
      if (gap === 0) return false; // duplicate rank
      jokersNeeded += gap - 1;
    }

    return jokersNeeded <= jokerCount;
  }

  /**
   * Check if a sandstorm (砂嵐) condition is met: three 3s
   */
  checkSandstorm(cards: AnyCard[]): boolean {
    const threes = cards.filter(c => isRegularCard(c) && c.rank === 3);
    return threes.length === 3;
  }

  /**
   * Check if an ambulance (救急車) condition is met: two 9s
   */
  checkAmbulance(cards: AnyCard[]): boolean {
    const nines = cards.filter(c => isRegularCard(c) && c.rank === 9);
    return nines.length === 2;
  }
}
