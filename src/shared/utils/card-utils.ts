import type { AnyCard, Card, Rank, Suit } from '../types/card';
import { isJoker, isRegularCard } from '../types/card';
import { getBaseStrength } from '../constants/cards';

/**
 * Sort cards by strength (weakest first by default)
 */
export function sortCards(cards: AnyCard[], revolution: boolean = false): AnyCard[] {
  return [...cards].sort((a, b) => {
    const strengthA = getEffectiveStrength(a.rank as Rank | 0, revolution);
    const strengthB = getEffectiveStrength(b.rank as Rank | 0, revolution);
    if (strengthA !== strengthB) return strengthA - strengthB;
    // Secondary sort by suit
    if (isJoker(a) || isJoker(b)) return 0;
    const suitOrder: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
    return suitOrder[(a as Card).suit] - suitOrder[(b as Card).suit];
  });
}

/**
 * Get effective strength considering revolution (but not eleven back, which is temporary)
 */
export function getEffectiveStrength(rank: Rank | 0, revolution: boolean): number {
  if (rank === 0) return 14; // Joker always strongest
  const base = getBaseStrength(rank);
  return revolution ? (12 - base) : base;
}

/**
 * Get the strongest N cards from a hand (for card exchange - daihinmin/hinmin must give strongest)
 */
export function getStrongestCards(hand: AnyCard[], count: number, revolution: boolean): AnyCard[] {
  const sorted = sortCards(hand, revolution);
  return sorted.slice(-count);
}

/**
 * Get non-joker rank from a set of cards (for lock detection)
 */
export function getNonJokerRank(cards: AnyCard[]): Rank | null {
  for (const card of cards) {
    if (isRegularCard(card)) return card.rank;
  }
  return null;
}

/**
 * Get suits from a set of cards (for suit lock detection)
 */
export function getSuitPattern(cards: AnyCard[]): Suit[] {
  return cards
    .filter(isRegularCard)
    .map(c => c.suit)
    .sort();
}

/**
 * Check if a number is even or odd
 */
export function getParity(rank: Rank): 'even' | 'odd' {
  return rank % 2 === 0 ? 'even' : 'odd';
}

/**
 * Find card by ID in a hand
 */
export function findCardById(hand: AnyCard[], id: string): AnyCard | undefined {
  return hand.find(c => c.id === id);
}

/**
 * Remove cards by IDs from a hand (returns new array)
 */
export function removeCardsById(hand: AnyCard[], ids: string[]): AnyCard[] {
  const idSet = new Set(ids);
  return hand.filter(c => !idSet.has(c.id));
}
