import type { AnyCard, Card, JokerCard, Rank, Suit } from '../types/card';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const SUIT_PREFIX: Record<Suit, string> = {
  spades: 's',
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const RANK_DISPLAY: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

// Standard strength order: 3(weakest) -> 2(strongest)
// 3=0, 4=1, 5=2, 6=3, 7=4, 8=5, 9=6, 10=7, J=8, Q=9, K=10, A=11, 2=12
export function getBaseStrength(rank: Rank | 0): number {
  if (rank === 0) return 14; // Joker always strongest
  const strengthMap: Record<Rank, number> = {
    3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
    10: 7, 11: 8, 12: 9, 13: 10, 1: 11, 2: 12,
  };
  return strengthMap[rank];
}

export function makeCardId(suit: Suit, rank: Rank): string {
  return `${SUIT_PREFIX[suit]}${rank.toString().padStart(2, '0')}`;
}

export function createDeck(): AnyCard[] {
  const cards: AnyCard[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        suit,
        rank,
        id: makeCardId(suit, rank),
      } as Card);
    }
  }

  // Add 2 jokers
  cards.push({ suit: 'joker', rank: 0, id: 'joker1' } as JokerCard);
  cards.push({ suit: 'joker', rank: 0, id: 'joker2' } as JokerCard);

  return cards;
}

export function shuffleDeck(deck: AnyCard[]): AnyCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
