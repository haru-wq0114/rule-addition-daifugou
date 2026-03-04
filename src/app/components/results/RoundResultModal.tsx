'use client';

import { useGameStore, type RoundResult } from '@/app/stores/gameStore';
import { useSocket } from '@/app/components/providers/SocketProvider';
import { RANKING_LABELS } from '@/shared/types/game';

interface RoundResultModalProps {
  result: RoundResult;
  roundNumber: number;
  playerNames: Record<string, string>;
}

export function RoundResultModal({ result, roundNumber, playerNames }: RoundResultModalProps) {
  const socket = useSocket();
  const setRoundResult = useGameStore((s) => s.setRoundResult);

  const sortedPlayers = Object.entries(result.totalScores)
    .sort(([, a], [, b]) => b - a);

  const handleContinue = () => {
    setRoundResult(null);
    socket?.emit('game:proceed_from_round' as any);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-8 max-w-md w-full border border-[var(--bg-card)] max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-2xl font-bold text-[var(--accent-gold)] text-center mb-3 sm:mb-6">
          第{roundNumber}回戦 結果
        </h2>

        <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-6">
          {Object.entries(result.rankings).map(([playerId, ranking]) => (
            <div
              key={playerId}
              className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-[var(--bg-card)]"
            >
              <div>
                <span className="font-bold text-xs sm:text-base">{playerNames[playerId] || playerId}</span>
                <span className="ml-1 sm:ml-2 text-[10px] sm:text-sm text-[var(--accent-gold)]">
                  {RANKING_LABELS[ranking]}
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] sm:text-sm text-[var(--text-secondary)]">
                  +{result.roundScores[playerId] || 0}
                </div>
                <div className="font-bold text-xs sm:text-base">
                  合計: {result.totalScores[playerId] || 0}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:gap-3">
          <h3 className="text-center text-[var(--text-secondary)] text-xs sm:text-base">
            総合順位
          </h3>
          {sortedPlayers.map(([playerId, score], idx) => (
            <div key={playerId} className="flex justify-between text-xs sm:text-sm">
              <span>{idx + 1}位: {playerNames[playerId]}</span>
              <span className="font-bold">{score}点</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleContinue}
          className="w-full mt-4 sm:mt-6 px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-sm sm:text-lg hover:brightness-110 transition-all"
        >
          {roundNumber >= 3 ? '最終結果へ' : 'ルール選択へ'}
        </button>
      </div>
    </div>
  );
}
