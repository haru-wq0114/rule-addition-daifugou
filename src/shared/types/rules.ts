import type { Rank } from './card';

export type AdditionalRuleId =
  // === 既存ルール (11個) ===
  | 'ten_discard'
  | 'twelve_bomber'
  | 'five_skip'
  | 'seven_pass'
  | 'four_revive'
  | 'capital_fall'
  | 'even_odd_alternate'
  | 'suit_ban'
  | 'sandstorm'
  | 'ambulance'
  | 'king_reverse'
  // === ランク発動型 (18個) ===
  | 'ace_declare'
  | 'two_reset'
  | 'three_tax'
  | 'six_peek'
  | 'nine_barrier'
  | 'jack_steal'
  | 'two_destroy'
  | 'three_gift'
  | 'six_freeze'
  | 'ace_monopoly'
  | 'nine_mirror'
  | 'two_double'
  | 'three_shield'
  | 'six_shuffle'
  | 'jack_reverse_rank'
  | 'ace_all_pass'
  | 'two_swap'
  | 'nine_copy'
  // === スート効果型 (8個) ===
  | 'spade_boost'
  | 'heart_heal'
  | 'diamond_draw'
  | 'club_crush'
  | 'spade_chain'
  | 'heart_protect'
  | 'diamond_bonus'
  | 'club_penalty'
  // === コンボ効果型 (8個) ===
  | 'double_pair_flush'
  | 'triple_power'
  | 'sequence_bonus'
  | 'full_house'
  | 'quad_destroy'
  | 'pair_swap'
  | 'sequence_steal'
  | 'same_suit_triple'
  // === パッシブ型 (7個) ===
  | 'speed_round'
  | 'joker_nerf'
  | 'transparency'
  | 'lucky_start'
  | 'escalation'
  | 'mercy_rule'
  | 'sudden_death'
  // === 場効果型 (5個) ===
  | 'field_tax'
  | 'lucky_seven'
  | 'chain_bonus'
  | 'poison_field'
  | 'echo_field'
  // === スコア型 (5個) ===
  | 'speed_bonus'
  | 'revolution_bonus'
  | 'pass_penalty'
  | 'empty_hand_bonus'
  | 'diversity_bonus';

export interface AdditionalRuleDefinition {
  id: AdditionalRuleId;
  nameJa: string;
  descriptionJa: string;
  triggerRank: Rank | null;
  triggerCount: number | null;
  type: 'on_play' | 'passive' | 'field_clear';
}

export interface RuleSelectionState {
  playerId: string;
  options: [AdditionalRuleId, AdditionalRuleId];
  rerollsRemaining: number;
  selectedRule: AdditionalRuleId | null;
}
