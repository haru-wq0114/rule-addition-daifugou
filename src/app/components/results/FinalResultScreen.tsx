'use client';

import { useRouter } from 'next/navigation';
import type { GameOverData } from '@/app/stores/gameStore';

interface FinalResultScreenProps {
  data: GameOverData;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉', ''];

export function FinalResultScreen({ data }: FinalResultScreenProps) {
  const router = useRouter();

  const handleReturnToLobby = () => {
    router.push('/lobby');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-8 max-w-md w-full border border-[var(--accent-gold)]">
        <h2 className="text-xl sm:text-3xl font-bold text-[var(--accent-gold)] text-center mb-1 sm:mb-2">
          ゲーム終了
        </h2>
        <p className="text-center text-[var(--text-secondary)] text-xs sm:text-base mb-4 sm:mb-8">最終結果</p>

        <div className="flex flex-col gap-2 sm:gap-4 mb-4 sm:mb-8">
          {data.finalRankings.map((entry, idx) => (
            <div
              key={entry.playerId}
              className={`flex justify-between items-center p-2 sm:p-4 rounded-lg ${
                idx === 0
                  ? 'bg-yellow-900/30 border-2 border-[var(--accent-gold)]'
                  : 'bg-[var(--bg-card)]'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-lg sm:text-2xl">{RANK_MEDALS[idx] || `${idx + 1}位`}</span>
                <span className={`font-bold text-sm sm:text-xl ${idx === 0 ? 'text-[var(--accent-gold)]' : ''}`}>
                  {entry.name}
                </span>
              </div>
              <span className={`font-bold text-sm sm:text-xl ${idx === 0 ? 'text-[var(--accent-gold)]' : ''}`}>
                {entry.score}点
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleReturnToLobby}
          className="w-full px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-sm sm:text-lg hover:brightness-110 transition-all"
        >
          ロビーに戻る
        </button>
      </div>
    </div>
  );
}
