'use client';

import type { ClientPlayerInfo } from '@/shared/types/game';

interface ScoreBoardProps {
  players: ClientPlayerInfo[];
  scores: Record<string, number>;
  roundNumber: number;
}

export function ScoreBoard({ players, scores, roundNumber }: ScoreBoardProps) {
  const sortedPlayers = [...players].sort(
    (a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)
  );

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-2 sm:p-3 min-w-[100px] sm:min-w-[160px]">
      <h3 className="text-[10px] sm:text-sm font-bold text-[var(--accent-gold)] mb-1 sm:mb-2">
        第{roundNumber}回戦 スコア
      </h3>
      <div className="flex flex-col gap-0.5 sm:gap-1">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className="flex justify-between text-[10px] sm:text-sm gap-2"
          >
            <span className="text-[var(--text-secondary)] truncate">
              {index + 1}. {player.name}
            </span>
            <span className="font-bold shrink-0">{scores[player.id] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
