export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "s03" for 3 of spades
}

export interface JokerCard {
  suit: 'joker';
  rank: 0;
  id: 'joker1' | 'joker2';
}

export type AnyCard = Card | JokerCard;

export type PlayType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'quad'
  | 'sequence';

export interface CardPlay {
  cards: AnyCard[];
  playType: PlayType;
  playerId: string;
}

export function isJoker(card: AnyCard): card is JokerCard {
  return card.suit === 'joker';
}

export function isRegularCard(card: AnyCard): card is Card {
  return card.suit !== 'joker';
}
