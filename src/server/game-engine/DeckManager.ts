import type { AnyCard } from '../../shared/types/card';
import { createDeck, shuffleDeck } from '../../shared/constants/cards';

export class DeckManager {
  private discardPile: AnyCard[] = [];

  createAndShuffle(): AnyCard[] {
    return shuffleDeck(createDeck());
  }

  deal(playerCount: number): AnyCard[][] {
    const deck = this.createAndShuffle();
    const hands: AnyCard[][] = Array.from({ length: playerCount }, () => []);

    for (let i = 0; i < deck.length; i++) {
      hands[i % playerCount].push(deck[i]);
    }

    return hands;
  }

  addToDiscard(cards: AnyCard[]): void {
    this.discardPile.push(...cards);
  }

  getDiscardPile(): AnyCard[] {
    return [...this.discardPile];
  }

  drawRandomFromDiscard(count: number): AnyCard[] {
    if (this.discardPile.length === 0) return [];

    const drawn: AnyCard[] = [];
    const available = [...this.discardPile];

    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      drawn.push(available[idx]);
      // Remove from discard pile
      const discardIdx = this.discardPile.findIndex(c => c.id === available[idx].id);
      if (discardIdx !== -1) {
        this.discardPile.splice(discardIdx, 1);
      }
      available.splice(idx, 1);
    }

    return drawn;
  }

  clearDiscard(): void {
    this.discardPile = [];
  }
}
