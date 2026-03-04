import type { PlayerRanking } from '../types/game';

export const ROUND_SCORES: Record<number, Record<PlayerRanking, number>> = {
  1: { daifugou: 40, fugou: 30, hinmin: 20, daihinmin: 10 },
  2: { daifugou: 60, fugou: 50, hinmin: 40, daihinmin: 30 },
  3: { daifugou: 80, fugou: 60, hinmin: 40, daihinmin: 20 },
};

export const INVALID_PLAY_PENALTY = -10;

// Rankings assigned by finish order (4 players)
export const FINISH_ORDER_TO_RANKING: PlayerRanking[] = [
  'daifugou',  // 1st to finish
  'fugou',     // 2nd to finish
  'hinmin',    // 3rd to finish
  'daihinmin', // last (or didn't finish)
];

// Card exchange counts by ranking
export const EXCHANGE_GIVE_COUNT: Record<PlayerRanking, number> = {
  daifugou: 2,   // gives 2 cards of choice
  fugou: 1,      // gives 1 card of choice
  hinmin: 1,     // gives 1 strongest card
  daihinmin: 2,  // gives 2 strongest cards
};
