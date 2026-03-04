'use client';

import type { CardPlay } from '@/shared/types/card';
import { CardComponent } from './CardComponent';

interface PlayFieldProps {
  currentPlay: CardPlay | null;
  recentHistory: CardPlay[];
  isRevolution: boolean;
  isElevenBack: boolean;
}

export function PlayField({ currentPlay, recentHistory, isRevolution, isElevenBack }: PlayFieldProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-3">
      {/* Status indicators */}
      <div className="flex gap-1 sm:gap-2">
        {isRevolution && (
          <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-purple-600 text-white text-[10px] sm:text-sm font-bold">
            革命
          </span>
        )}
        {isElevenBack && (
          <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-orange-600 text-white text-[10px] sm:text-sm font-bold">
            11バック
          </span>
        )}
      </div>

      {/* Recent history (previous 1-2 plays) */}
      {recentHistory.length > 0 && (
        <div className="flex items-end gap-2 sm:gap-3 opacity-40">
          {recentHistory.map((play, idx) => (
            <div
              key={`history-${idx}`}
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-[8px] sm:text-[10px] text-[var(--text-secondary)]">
                {recentHistory.length === 2 && idx === 0 ? '2つ前' : '1つ前'}
              </span>
              <div className="flex gap-0.5 scale-75 sm:scale-80 origin-bottom">
                {play.cards.map((card) => (
                  <CardComponent key={card.id} card={card} small />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current play area */}
      <div className="min-h-[60px] sm:min-h-[90px] min-w-[120px] sm:min-w-[180px] flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--bg-card)] bg-[var(--bg-secondary)]/50 p-2 sm:p-4">
        {currentPlay ? (
          <div className="flex gap-0.5 sm:gap-1">
            {currentPlay.cards.map((card) => (
              <CardComponent key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <span className="text-[var(--text-secondary)] text-xs sm:text-base">場にカードがありません</span>
        )}
      </div>
    </div>
  );
}
