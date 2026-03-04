'use client';

import type { ClientPlayerInfo } from '@/shared/types/game';
import { RANKING_LABELS } from '@/shared/types/game';
import { CardBack } from './CardComponent';

interface OpponentDisplayProps {
  player: ClientPlayerInfo;
  isCurrentTurn: boolean;
  position: 'top' | 'left' | 'right';
  compact?: boolean;
}

export function OpponentDisplay({ player, isCurrentTurn, position, compact }: OpponentDisplayProps) {
  const positionClasses = {
    top: 'flex-col items-center',
    left: 'flex-row items-center',
    right: 'flex-row-reverse items-center',
  };

  const maxCards = 5;

  // モバイル用コンパクト表示
  if (compact) {
    return (
      <div
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${
          isCurrentTurn
            ? 'bg-[var(--accent-gold)]/20 border border-[var(--accent-gold)]'
            : 'bg-[var(--bg-secondary)]/50'
        }`}
      >
        <div className="font-bold text-[10px] leading-tight truncate max-w-[70px]">
          {player.name}
          {player.isCpu && (
            <span className="text-[8px] text-gray-400 ml-0.5">(CPU)</span>
          )}
        </div>
        <div className="text-[9px] text-[var(--text-secondary)]">
          {player.finishOrder !== null
            ? player.roundRanking
              ? RANKING_LABELS[player.roundRanking]
              : 'あがり'
            : `${player.handCount}枚`}
        </div>
      </div>
    );
  }

  // デスクトップ用通常表示
  return (
    <div
      className={`flex ${positionClasses[position]} gap-1 sm:gap-2 p-1.5 sm:p-3 rounded-lg ${
        isCurrentTurn
          ? 'bg-[var(--accent-gold)]/20 border border-[var(--accent-gold)]'
          : 'bg-[var(--bg-secondary)]/50'
      }`}
    >
      <div className="text-center">
        <div className="font-bold text-sm">
          {player.name}
          {player.isCpu && (
            <span className="text-xs text-gray-400 ml-1">(CPU)</span>
          )}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          {player.finishOrder !== null
            ? player.roundRanking
              ? RANKING_LABELS[player.roundRanking]
              : 'あがり'
            : `${player.handCount}枚`}
        </div>
        <div className="text-xs text-[var(--accent-gold)]">
          {player.totalScore}点
        </div>
      </div>

      {player.finishOrder === null && (
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(player.handCount, maxCards) }).map((_, i) => (
            <CardBack key={i} small />
          ))}
          {player.handCount > maxCards && (
            <span className="text-xs text-[var(--text-secondary)] self-center ml-1">
              +{player.handCount - maxCards}
            </span>
          )}
        </div>
      )}

      {player.hasPassedThisTurn && (
        <span className="text-xs text-[var(--accent-red)]">パス</span>
      )}
    </div>
  );
}
