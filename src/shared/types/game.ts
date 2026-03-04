import type { AnyCard, CardPlay, PlayType, Rank, Suit } from './card';
import type { AdditionalRuleId } from './rules';

export type GamePhase =
  | 'WAITING'
  | 'DEALING'
  | 'CARD_EXCHANGE'
  | 'PLAYING'
  | 'ROUND_RESULT'
  | 'RULE_SELECTION'
  | 'GAME_OVER';

export type PlayerRanking = 'daifugou' | 'fugou' | 'hinmin' | 'daihinmin';

export const RANKING_LABELS: Record<PlayerRanking, string> = {
  daifugou: '大富豪',
  fugou: '富豪',
  hinmin: '貧民',
  daihinmin: '大貧民',
};

export interface PlayerState {
  id: string;
  name: string;
  hand: AnyCard[];
  totalScore: number;
  roundRanking: PlayerRanking | null;
  isConnected: boolean;
  isCpu: boolean;
  hasPassedThisTurn: boolean;
  finishOrder: number | null;
}

export interface FieldState {
  currentPlay: CardPlay | null;
  playHistory: CardPlay[];
  isRevolution: boolean;
  isElevenBack: boolean;
  numberLock: Rank | null;
  suitLock: Suit[] | null;
  turnDirection: 1 | -1; // 1 = normal, -1 = reversed (king reverse)
  currentTurnPlayerId: string | null;
  consecutivePasses: number;
  lastPlayerId: string | null;
  lastClearedSuit: Suit | null; // for suit ban rule
  lastPlayParity: 'even' | 'odd' | null; // for even/odd alternate rule
}

export interface RoundState {
  roundNumber: 1 | 2 | 3;
  finishedPlayers: string[];
  discardPile: AnyCard[];
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Record<string, PlayerState>;
  playerOrder: string[]; // seating order
  field: FieldState;
  round: RoundState;
  activeRules: AdditionalRuleId[];
  scores: Record<string, number>;
  previousRankings: Record<string, PlayerRanking> | null; // from last round
}

// What the client receives (sanitized)
export interface ClientGameState {
  roomId: string;
  phase: GamePhase;
  myHand: AnyCard[];
  myId: string;
  players: ClientPlayerInfo[];
  field: ClientFieldState;
  round: { roundNumber: number };
  activeRules: AdditionalRuleId[];
  scores: Record<string, number>;
  isMyTurn: boolean;
  previousRankings: Record<string, PlayerRanking> | null;
}

export interface ClientPlayerInfo {
  id: string;
  name: string;
  handCount: number;
  totalScore: number;
  roundRanking: PlayerRanking | null;
  isConnected: boolean;
  isCpu: boolean;
  hasPassedThisTurn: boolean;
  finishOrder: number | null;
}

export interface ClientFieldState {
  currentPlay: CardPlay | null;
  recentHistory: CardPlay[]; // last 1-2 plays before currentPlay
  isRevolution: boolean;
  isElevenBack: boolean;
  numberLock: Rank | null;
  suitLock: Suit[] | null;
  turnDirection: 1 | -1;
  currentTurnPlayerId: string | null;
  consecutivePasses: number;
  lastPlayerId: string | null;
}
