import type { AnyCard, CardPlay, PlayType, Rank, Suit } from '../../shared/types/card';
import { isJoker, isRegularCard } from '../../shared/types/card';
import { getBaseStrength } from '../../shared/constants/cards';
import type { FieldState } from '../../shared/types/game';
import { getNonJokerRank } from '../../shared/utils/card-utils';

export class CardComparator {
  /**
   * Get effective strength of a rank considering revolution and eleven back.
   * Revolution and ElevenBack XOR: if both active, they cancel each other.
   */
  getStrength(rank: Rank | 0, isRevolution: boolean, isElevenBack: boolean): number {
    if (rank === 0) return 14; // Joker is always strongest
    const base = getBaseStrength(rank);
    const reversed = isRevolution !== isElevenBack; // XOR
    return reversed ? (12 - base) : base;
  }

  /**
   * Check if a new play is stronger than the current field play.
   */
  isStronger(
    newPlay: CardPlay,
    fieldPlay: CardPlay,
    isRevolution: boolean,
    isElevenBack: boolean
  ): boolean {
    // Must match play type
    if (newPlay.playType !== fieldPlay.playType) return false;

    // Must match card count
    if (newPlay.cards.length !== fieldPlay.cards.length) return false;

    // Special case: Spade 3 beats single Joker (base rule always active)
    if (
      newPlay.playType === 'single' &&
      fieldPlay.cards.length === 1 &&
      isJoker(fieldPlay.cards[0]) &&
      this.isSpadeThree(newPlay.cards[0])
    ) {
      return true;
    }

    if (newPlay.playType === 'sequence') {
      return this.isStrongerSequence(newPlay, fieldPlay, isRevolution, isElevenBack);
    }

    // For single, pair, triple, quad: compare by rank strength
    const newRank = this.getPlayRank(newPlay);
    const fieldRank = this.getPlayRank(fieldPlay);

    if (newRank === null || fieldRank === null) {
      // If new play contains joker(s) only, it beats anything (highest)
      if (newPlay.cards.every(isJoker)) return true;
      if (fieldPlay.cards.every(isJoker)) return false;
      return false;
    }

    const newStrength = this.getStrength(newRank, isRevolution, isElevenBack);
    const fieldStrength = this.getStrength(fieldRank, isRevolution, isElevenBack);

    return newStrength > fieldStrength;
  }

  /**
   * Compare sequences: compare by the highest card in the sequence
   */
  private isStrongerSequence(
    newPlay: CardPlay,
    fieldPlay: CardPlay,
    isRevolution: boolean,
    isElevenBack: boolean
  ): boolean {
    const newHighest = this.getSequenceHighestRank(newPlay.cards);
    const fieldHighest = this.getSequenceHighestRank(fieldPlay.cards);

    if (newHighest === null || fieldHighest === null) return false;

    const newStrength = this.getStrength(newHighest, isRevolution, isElevenBack);
    const fieldStrength = this.getStrength(fieldHighest, isRevolution, isElevenBack);

    return newStrength > fieldStrength;
  }

  /**
   * Get the non-joker rank of a play (for pairs, triples, quads)
   */
  private getPlayRank(play: CardPlay): Rank | null {
    return getNonJokerRank(play.cards);
  }

  /**
   * Get the highest rank in a sequence
   */
  private getSequenceHighestRank(cards: AnyCard[]): Rank | null {
    const ranks = cards.filter(isRegularCard).map(c => c.rank);
    if (ranks.length === 0) return null;

    // Sort by base strength to find highest
    ranks.sort((a, b) => getBaseStrength(a) - getBaseStrength(b));
    return ranks[ranks.length - 1];
  }

  /**
   * Check if a card is the Spade 3
   */
  private isSpadeThree(card: AnyCard): boolean {
    return isRegularCard(card) && card.suit === 'spades' && card.rank === 3;
  }
}
