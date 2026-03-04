import type { AnyCard, PlayType, Rank } from './card';
import type { ClientGameState, PlayerRanking } from './game';
import type { AdditionalRuleId } from './rules';
import type { RoomDetail, RoomSummary } from './room';

// Client -> Server Events
export interface ClientToServerEvents {
  // Lobby
  'lobby:create_room': (data: { playerName: string }) => void;
  'lobby:join_room': (data: { roomId: string; playerName: string }) => void;
  'lobby:leave_room': () => void;
  'lobby:toggle_ready': () => void;
  'lobby:add_cpu': () => void;
  'lobby:remove_cpu': (data: { cpuId: string }) => void;
  'lobby:start_game': () => void;

  // Gameplay
  'game:play_cards': (data: { cardIds: string[] }) => void;
  'game:confirm_play': () => void;
  'game:cancel_play': () => void;
  'game:pass': () => void;

  // Special rule actions
  'game:ten_discard_select': (data: { cardIds: string[] }) => void;
  'game:twelve_bomber_declare': (data: { ranks: Rank[] }) => void;
  'game:seven_pass_select': (data: { cardIds: string[] }) => void;

  // Card exchange
  'game:exchange_select': (data: { cardIds: string[] }) => void;

  // Rule selection
  'game:select_rule': (data: { ruleId: AdditionalRuleId }) => void;
  'game:reroll_rules': () => void;

  // Round progression
  'game:proceed_from_round': () => void;

  // Connection
  'player:reconnect': (data: { roomId: string; playerId: string }) => void;
}

// Server -> Client Events
export interface ServerToClientEvents {
  // Lobby
  'lobby:room_created': (data: { roomId: string }) => void;
  'lobby:room_list': (data: { rooms: RoomSummary[] }) => void;
  'lobby:room_updated': (data: { room: RoomDetail }) => void;
  'lobby:error': (data: { message: string }) => void;

  // Game state
  'game:state_update': (data: ClientGameState) => void;
  'game:round_start': (data: { roundNumber: number }) => void;

  // Play results
  'game:play_staged': (data: {
    playerId: string;
    cards: AnyCard[];
    playType: PlayType;
  }) => void;
  'game:play_confirmed': (data: {
    playerId: string;
    cards: AnyCard[];
    playType: PlayType;
    effects: PlayEffect[];
  }) => void;
  'game:play_cancelled': (data: { playerId: string }) => void;
  'game:pass_result': (data: { playerId: string }) => void;
  'game:field_cleared': (data: { nextPlayerId: string }) => void;
  'game:invalid_play': (data: { reason: string; penalty: number }) => void;

  // Special effects
  'game:revolution': (data: { playerId: string; isRevolution: boolean }) => void;
  'game:eleven_back': (data: { playerId: string }) => void;
  'game:eight_cut': (data: { playerId: string }) => void;

  // Special rule prompts
  'game:ten_discard_prompt': (data: { count: number }) => void;
  'game:twelve_bomber_prompt': (data: { count: number }) => void;
  'game:seven_pass_prompt': (data: { count: number }) => void;
  'game:four_revive_result': (data: { playerId: string; count: number }) => void;
  'game:king_reverse': () => void;
  'game:capital_fall': (data: { playerId: string }) => void;

  // Player finished
  'game:player_finished': (data: { playerId: string; ranking: PlayerRanking }) => void;

  // Round end
  'game:round_end': (data: {
    rankings: Record<string, PlayerRanking>;
    roundScores: Record<string, number>;
    totalScores: Record<string, number>;
  }) => void;

  // Card exchange
  'game:exchange_start': (data: {
    role: PlayerRanking;
    receivedCards: AnyCard[];
    cardsToGive: number;
  }) => void;
  'game:exchange_complete': (data: { newHand: AnyCard[] }) => void;

  // Rule selection
  'game:rule_selection_start': (data: {
    options: [AdditionalRuleId, AdditionalRuleId];
    rerollsRemaining: number;
  }) => void;
  'game:reroll_result': (data: {
    options: [AdditionalRuleId, AdditionalRuleId];
    rerollsRemaining: number;
  }) => void;
  'game:rule_selection_result': (data: {
    newRules: AdditionalRuleId[];
    allActiveRules: AdditionalRuleId[];
  }) => void;

  // Game end
  'game:game_over': (data: {
    finalScores: Record<string, number>;
    finalRankings: { playerId: string; name: string; score: number; rank: number }[];
  }) => void;

  // Turn timer
  'game:turn_timer': (data: { playerId: string; remainingSeconds: number; totalSeconds: number }) => void;
  'game:turn_timeout': (data: { playerId: string }) => void;

  // Connection
  'player:disconnected': (data: { playerId: string }) => void;
  'player:reconnected': (data: { playerId: string }) => void;
}

export type PlayEffect =
  | { type: 'eight_cut' }
  | { type: 'eleven_back' }
  | { type: 'revolution'; active: boolean }
  | { type: 'number_lock'; rank: Rank }
  | { type: 'suit_lock'; suits: string[] }
  | { type: 'spade_three_return' }
  | { type: 'sandstorm' }
  | { type: 'ambulance' }
  | { type: 'five_skip'; count: number }
  | { type: 'king_reverse' }
  | { type: 'ten_discard'; count: number }
  | { type: 'twelve_bomber'; count: number }
  | { type: 'seven_pass'; count: number }
  | { type: 'four_revive'; count: number }
  | { type: 'capital_fall'; playerId: string }
  | { type: 'even_odd_violation' }
  | { type: 'suit_ban_violation' };
