import { create } from 'zustand';
import type { AnyCard } from '@/shared/types/card';
import type { ClientGameState, PlayerRanking } from '@/shared/types/game';
import type { AdditionalRuleId } from '@/shared/types/rules';
import type { PlayEffect } from '@/shared/types/events';
import type { RoomDetail, RoomSummary } from '@/shared/types/room';

export interface LogEntry {
  type: string;
  playerId?: string;
  cards?: AnyCard[];
  effects?: PlayEffect[];
  reason?: string;
  penalty?: number;
  isRevolution?: boolean;
  ranking?: PlayerRanking;
  nextPlayerId?: string;
  timestamp?: number;
}

export interface SpecialPrompt {
  type: 'ten_discard' | 'twelve_bomber' | 'seven_pass';
  count: number;
}

export interface ExchangeState {
  role: PlayerRanking;
  receivedCards: AnyCard[];
  cardsToGive: number;
}

export interface RoundResult {
  rankings: Record<string, PlayerRanking>;
  roundScores: Record<string, number>;
  totalScores: Record<string, number>;
}

export interface GameOverData {
  finalScores: Record<string, number>;
  finalRankings: { playerId: string; name: string; score: number; rank: number }[];
}

interface GameStore {
  // Connection
  isConnected: boolean;
  myPlayerId: string | null;
  myPlayerName: string | null;
  currentRoomId: string | null;

  // Lobby
  currentRoom: RoomDetail | null;
  roomList: RoomSummary[];
  error: string | null;

  // Game state
  gameState: ClientGameState | null;
  roundNumber: number;

  // UI state
  selectedCardIds: Set<string>;
  stagedCardIds: Set<string>;
  gameLog: LogEntry[];
  specialPrompt: SpecialPrompt | null;
  exchangeState: ExchangeState | null;
  roundResult: RoundResult | null;
  gameOverData: GameOverData | null;
  ruleSelectionOptions: {
    options: [AdditionalRuleId, AdditionalRuleId];
    rerollsRemaining: number;
  } | null;
  turnTimer: {
    playerId: string;
    remainingSeconds: number;
    totalSeconds: number;
  } | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setPlayerInfo: (id: string, name: string) => void;
  setRoomId: (roomId: string) => void;
  updateGameState: (state: ClientGameState) => void;
  updateRoomList: (rooms: RoomSummary[]) => void;
  setCurrentRoom: (room: RoomDetail | null) => void;
  setError: (error: string | null) => void;
  setRoundNumber: (round: number) => void;

  // Card selection
  toggleCardSelection: (cardId: string) => void;
  clearSelection: () => void;
  stageSelectedCards: () => void;
  clearStaged: () => void;

  // Log
  addLogEntry: (entry: Omit<LogEntry, 'timestamp'>) => void;
  clearLog: () => void;

  // Special prompts
  setSpecialPrompt: (prompt: SpecialPrompt | null) => void;

  // Exchange
  setExchangeState: (state: ExchangeState | null) => void;
  setHandAfterExchange: (hand: AnyCard[]) => void;

  // Round result
  setRoundResult: (result: RoundResult | null) => void;

  // Game over
  setGameOver: (data: GameOverData | null) => void;

  // Rule selection
  setRuleSelectionOptions: (data: {
    options: [AdditionalRuleId, AdditionalRuleId];
    rerollsRemaining: number;
  } | null) => void;

  // Turn timer
  setTurnTimer: (data: { playerId: string; remainingSeconds: number; totalSeconds: number } | null) => void;

  // Reset
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  // Initial state
  isConnected: false,
  myPlayerId: null,
  myPlayerName: null,
  currentRoomId: null,
  currentRoom: null,
  roomList: [],
  error: null,
  gameState: null,
  roundNumber: 1,
  selectedCardIds: new Set(),
  stagedCardIds: new Set(),
  gameLog: [],
  specialPrompt: null,
  exchangeState: null,
  roundResult: null,
  gameOverData: null,
  ruleSelectionOptions: null,
  turnTimer: null,

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),

  setPlayerInfo: (id, name) => set({ myPlayerId: id, myPlayerName: name }),

  setRoomId: (roomId) => set({ currentRoomId: roomId }),

  updateGameState: (state) => {
    const updates: Partial<GameStore> = { gameState: state };
    // フェーズが変わったら不要なモーダル状態をクリア
    if (state.phase === 'PLAYING') {
      updates.ruleSelectionOptions = null;
      updates.exchangeState = null;
      updates.roundResult = null;
      updates.selectedCardIds = new Set();
      updates.stagedCardIds = new Set();
    } else if (state.phase === 'CARD_EXCHANGE') {
      updates.ruleSelectionOptions = null;
    } else if (state.phase === 'RULE_SELECTION') {
      updates.roundResult = null;
    }
    set(updates);
  },

  updateRoomList: (rooms) => set({ roomList: rooms }),

  setCurrentRoom: (room) => set({ currentRoom: room }),

  setError: (error) => set({ error }),

  setRoundNumber: (round) => set({ roundNumber: round }),

  toggleCardSelection: (cardId) => {
    const current = new Set(get().selectedCardIds);
    if (current.has(cardId)) {
      current.delete(cardId);
    } else {
      current.add(cardId);
    }
    set({ selectedCardIds: current });
  },

  clearSelection: () => set({ selectedCardIds: new Set() }),

  stageSelectedCards: () => {
    set({ stagedCardIds: new Set(get().selectedCardIds), selectedCardIds: new Set() });
  },

  clearStaged: () => set({ stagedCardIds: new Set() }),

  addLogEntry: (entry) => {
    const log = [...get().gameLog, { ...entry, timestamp: Date.now() }];
    // Keep last 100 entries
    if (log.length > 100) log.shift();
    set({ gameLog: log });
  },

  clearLog: () => set({ gameLog: [] }),

  setSpecialPrompt: (prompt) => set({ specialPrompt: prompt }),

  setExchangeState: (state) => set({ exchangeState: state }),

  setHandAfterExchange: (hand) => {
    const gameState = get().gameState;
    if (gameState) {
      set({
        gameState: { ...gameState, myHand: hand },
        exchangeState: null,
      });
    }
  },

  setRoundResult: (result) => set({ roundResult: result }),

  setGameOver: (data) => set({ gameOverData: data }),

  setRuleSelectionOptions: (data) => set({ ruleSelectionOptions: data }),

  setTurnTimer: (data) => set({ turnTimer: data }),

  resetGame: () => set({
    gameState: null,
    roundNumber: 1,
    selectedCardIds: new Set(),
    stagedCardIds: new Set(),
    gameLog: [],
    specialPrompt: null,
    exchangeState: null,
    roundResult: null,
    gameOverData: null,
    ruleSelectionOptions: null,
    turnTimer: null,
  }),
}));
