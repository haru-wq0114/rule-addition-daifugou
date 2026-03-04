import type { AnyCard, CardPlay, Rank } from '../../shared/types/card';
import { isRegularCard, isJoker } from '../../shared/types/card';
import type { FieldState, GameState } from '../../shared/types/game';
import type { AdditionalRuleId } from '../../shared/types/rules';
import type { PlayEffect } from '../../shared/types/events';
import { getNonJokerRank, getSuitPattern, getParity } from '../../shared/utils/card-utils';

export interface PendingAction {
  type: 'ten_discard' | 'twelve_bomber' | 'seven_pass';
  playerId: string;
  count: number;
}

export interface PostPlayResult {
  effects: PlayEffect[];
  pendingActions: PendingAction[];
  clearField: boolean;
  skipCount: number;
  reverseDirection: boolean;
}

export class RuleEngine {
  applyPostPlayEffects(
    play: CardPlay,
    gameState: GameState
  ): PostPlayResult {
    const effects: PlayEffect[] = [];
    const pendingActions: PendingAction[] = [];
    let clearField = false;
    let skipCount = 0;
    let reverseDirection = false;

    const { field, activeRules } = gameState;
    const playRank = getNonJokerRank(play.cards);
    const regularCount = play.cards.filter(isRegularCard).length;

    // Helper: get suits of played regular cards
    const playedSuits = play.cards.filter(isRegularCard).map(c => c.suit);

    // === Base Rules (always active) ===

    // 8切り: playing an 8 clears the field
    if (playRank === 8) {
      clearField = true;
      effects.push({ type: 'eight_cut' });
    }

    // 11バック: playing a J (11) toggles eleven back
    if (playRank === 11) {
      effects.push({ type: 'eleven_back' });
    }

    // 革命: playing 4 of a kind toggles revolution
    if (play.playType === 'quad') {
      effects.push({ type: 'revolution', active: !field.isRevolution });
    }

    // 数縛り check
    this.updateNumberLock(play, field, effects);

    // 色縛り check
    this.updateSuitLock(play, field, effects);

    // === 既存追加ルール ===

    // 10捨て
    if (activeRules.includes('ten_discard') && playRank === 10) {
      const count = play.cards.filter(c => isRegularCard(c) && c.rank === 10).length;
      effects.push({ type: 'ten_discard', count });
      pendingActions.push({ type: 'ten_discard', playerId: play.playerId, count });
    }

    // 12ボンバー
    if (activeRules.includes('twelve_bomber') && playRank === 12) {
      const count = play.cards.filter(c => isRegularCard(c) && c.rank === 12).length;
      effects.push({ type: 'twelve_bomber', count });
      pendingActions.push({ type: 'twelve_bomber', playerId: play.playerId, count });
    }

    // 5スキップ
    if (activeRules.includes('five_skip') && playRank === 5) {
      skipCount += play.cards.filter(c => isRegularCard(c) && c.rank === 5).length;
      effects.push({ type: 'five_skip', count: skipCount });
    }

    // 7渡し
    if (activeRules.includes('seven_pass') && playRank === 7) {
      const count = play.cards.filter(c => isRegularCard(c) && c.rank === 7).length;
      effects.push({ type: 'seven_pass', count });
      pendingActions.push({ type: 'seven_pass', playerId: play.playerId, count });
    }

    // 4者蘇生
    if (activeRules.includes('four_revive') && playRank === 4) {
      const count = play.cards.filter(c => isRegularCard(c) && c.rank === 4).length;
      effects.push({ type: 'four_revive', count });
    }

    // 砂嵐
    if (activeRules.includes('sandstorm') && playRank === 3) {
      const threeCount = play.cards.filter(c => isRegularCard(c) && c.rank === 3).length;
      if (threeCount >= 3) {
        clearField = true;
        effects.push({ type: 'sandstorm' });
      }
    }

    // 救急車
    if (activeRules.includes('ambulance') && playRank === 9) {
      const nineCount = play.cards.filter(c => isRegularCard(c) && c.rank === 9).length;
      if (nineCount >= 2) {
        clearField = true;
        effects.push({ type: 'ambulance' });
      }
    }

    // キングリバース
    if (activeRules.includes('king_reverse') && playRank === 13) {
      reverseDirection = true;
      effects.push({ type: 'king_reverse' });
    }

    // === 新規ランク発動型ルール ===

    // 2リセット: 場流し
    if (activeRules.includes('two_reset') && playRank === 2) {
      clearField = true;
    }

    // 6凍結: 次のプレイヤーをスキップ
    if (activeRules.includes('six_freeze') && playRank === 6) {
      skipCount += 1;
    }

    // A全流し: Aを2枚以上→場流し
    if (activeRules.includes('ace_all_pass') && playRank === 1) {
      const aceCount = play.cards.filter(c => isRegularCard(c) && c.rank === 1).length;
      if (aceCount >= 2) {
        clearField = true;
      }
    }

    // Aモノポリー: A→場流し
    if (activeRules.includes('ace_monopoly') && playRank === 1) {
      clearField = true;
    }

    // J逆転: 11バックと同様に強弱逆転
    if (activeRules.includes('jack_reverse_rank') && playRank === 11) {
      // eleven_backはBase Ruleで既に処理されるが、追加効果として扱う
    }

    // 3贈与: 3を出すと最弱カードを次プレイヤーに(seven_passと同じ処理で1枚)
    if (activeRules.includes('three_gift') && playRank === 3) {
      effects.push({ type: 'seven_pass', count: 1 });
      pendingActions.push({ type: 'seven_pass', playerId: play.playerId, count: 1 });
    }

    // J泥棒: J出しで次プレイヤーから1枚奪う(heart_healと同系の処理で対応)
    if (activeRules.includes('jack_steal') && playRank === 11) {
      effects.push({ type: 'four_revive', count: 1 });
    }

    // 2スワップ: 2出しで次プレイヤーと1枚交換(seven_pass 1枚で代替)
    if (activeRules.includes('two_swap') && playRank === 2) {
      effects.push({ type: 'seven_pass', count: 1 });
      pendingActions.push({ type: 'seven_pass', playerId: play.playerId, count: 1 });
    }

    // 2破壊: 2出しで場のカードを除外
    if (activeRules.includes('two_destroy') && playRank === 2) {
      clearField = true;
    }

    // === 新規スート効果型ルール ===

    // スペードブースト: スペード出し→スキップ
    if (activeRules.includes('spade_boost') && playedSuits.includes('spades')) {
      skipCount += 1;
    }

    // ハート回復: ハート出し→捨て札から1枚回収
    if (activeRules.includes('heart_heal') && playedSuits.includes('hearts')) {
      effects.push({ type: 'four_revive', count: 1 });
    }

    // クラブクラッシュ: クラブ3枚以上→場流し
    if (activeRules.includes('club_crush')) {
      const clubCount = playedSuits.filter(s => s === 'clubs').length;
      if (clubCount >= 3) {
        clearField = true;
      }
    }

    // === 新規コンボ効果型ルール ===

    // 階段ボーナス: 階段出し→場流し+追加ターン
    if (activeRules.includes('sequence_bonus') && play.playType === 'sequence') {
      clearField = true;
    }

    // 毒の場: 場に5枚以上→場流し
    if (activeRules.includes('poison_field') && field.playHistory.length >= 4) {
      clearField = true;
    }

    // 4枚大掃除: 4枚出し(革命)→場流し追加効果
    if (activeRules.includes('quad_destroy') && play.playType === 'quad') {
      clearField = true;
    }

    // 同色トリプル: 同スート3枚→2ターンスキップ
    if (activeRules.includes('same_suit_triple') && regularCount >= 3) {
      const suitCounts: Record<string, number> = {};
      for (const s of playedSuits) {
        suitCounts[s] = (suitCounts[s] || 0) + 1;
      }
      if (Object.values(suitCounts).some(c => c >= 3)) {
        skipCount += 2;
      }
    }

    return { effects, pendingActions, clearField, skipCount, reverseDirection };
  }

  /**
   * Check 都落ち (capital fall): if previous round's daifugou doesn't finish first
   */
  checkCapitalFall(
    gameState: GameState,
    finishedPlayerId: string,
    finishOrder: number
  ): PlayEffect | null {
    if (!gameState.activeRules.includes('capital_fall')) return null;
    if (!gameState.previousRankings) return null;

    const prevDaifugou = Object.entries(gameState.previousRankings)
      .find(([, ranking]) => ranking === 'daifugou');

    if (!prevDaifugou) return null;
    const [daifugouId] = prevDaifugou;

    if (finishOrder === 0 && finishedPlayerId !== daifugouId) {
      return { type: 'capital_fall', playerId: daifugouId };
    }

    return null;
  }

  /**
   * Apply pass penalty if active
   */
  applyPassPenalty(activeRules: AdditionalRuleId[]): number {
    if (activeRules.includes('pass_penalty')) {
      return -1;
    }
    return 0;
  }

  /**
   * Check joker nerf: can't finish with joker as last card
   */
  isJokerNerfActive(activeRules: AdditionalRuleId[]): boolean {
    return activeRules.includes('joker_nerf');
  }

  /**
   * Check no_single rule
   */
  isNoSingleActive(activeRules: AdditionalRuleId[]): boolean {
    return activeRules.includes('no_single');
  }

  /**
   * Update number lock based on play history
   */
  private updateNumberLock(play: CardPlay, field: FieldState, effects: PlayEffect[]): void {
    if (field.playHistory.length === 0) return;

    const lastPlay = field.playHistory[field.playHistory.length - 1];
    const lastRank = getNonJokerRank(lastPlay.cards);
    const currentRank = getNonJokerRank(play.cards);

    if (lastRank !== null && currentRank !== null && lastRank === currentRank) {
      effects.push({ type: 'number_lock', rank: currentRank });
    }
  }

  /**
   * Update suit lock based on play history
   */
  private updateSuitLock(play: CardPlay, field: FieldState, effects: PlayEffect[]): void {
    if (field.playHistory.length === 0) return;

    const lastPlay = field.playHistory[field.playHistory.length - 1];
    const lastSuits = getSuitPattern(lastPlay.cards);
    const currentSuits = getSuitPattern(play.cards);

    if (
      lastSuits.length > 0 &&
      currentSuits.length > 0 &&
      JSON.stringify(lastSuits) === JSON.stringify(currentSuits)
    ) {
      effects.push({ type: 'suit_lock', suits: currentSuits });
    }
  }

  /**
   * Update parity tracking for even/odd alternate rule
   */
  getPlayParity(play: CardPlay): 'even' | 'odd' | null {
    const rank = getNonJokerRank(play.cards);
    if (rank === null) return null;
    return getParity(rank);
  }
}
