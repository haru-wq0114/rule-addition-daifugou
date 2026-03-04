'use client';

import { useState } from 'react';
import { useGameStore, type LogEntry } from '@/app/stores/gameStore';
import { RANKING_LABELS } from '@/shared/types/game';

function formatLogEntry(entry: LogEntry, playerNames: Record<string, string>): string {
  const name = entry.playerId ? (playerNames[entry.playerId] || entry.playerId) : '';

  switch (entry.type) {
    case 'play':
      return `${name} がカードを出しました`;
    case 'pass':
      return `${name} がパスしました`;
    case 'field_cleared':
      return '場が流れました';
    case 'invalid_play':
      return `不正なプレイ: ${entry.reason} (${entry.penalty}点)`;
    case 'revolution':
      return entry.isRevolution ? '革命!' : '革命解除!';
    case 'player_finished': {
      const ranking = entry.ranking ? RANKING_LABELS[entry.ranking] : '';
      return `${name} があがりました (${ranking})`;
    }
    case 'timeout':
      return `${name} が時間切れ(自動パス)`;
    default:
      return entry.type;
  }
}

interface GameLogProps {
  playerNames: Record<string, string>;
}

export function GameLog({ playerNames }: GameLogProps) {
  const gameLog = useGameStore((s) => s.gameLog);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="rounded-lg p-2 w-[160px] bg-black/40 backdrop-blur-sm cursor-pointer select-none"
      onClick={() => setCollapsed(!collapsed)}
    >
      <h3 className="text-[10px] font-bold text-[var(--accent-gold)] flex justify-between items-center">
        <span>ログ</span>
        <span className="text-[8px] text-[var(--text-secondary)]">{collapsed ? '▶' : '▼'}</span>
      </h3>
      {!collapsed && (
        <div className="flex flex-col gap-0.5 mt-1 max-h-[100px] overflow-y-auto">
          {gameLog.length === 0 ? (
            <span className="text-[10px] text-[var(--text-secondary)]">ログなし</span>
          ) : (
            [...gameLog].reverse().slice(0, 10).map((entry, i) => (
              <div key={i} className="text-[10px] text-[var(--text-secondary)] leading-tight">
                {formatLogEntry(entry, playerNames)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
