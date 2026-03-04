'use client';

import { useSocket } from '@/app/components/providers/SocketProvider';
import { useGameStore } from '@/app/stores/gameStore';

interface ActionButtonsProps {
  isMyTurn: boolean;
}

export function ActionButtons({ isMyTurn }: ActionButtonsProps) {
  const socket = useSocket();
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const stagedCardIds = useGameStore((s) => s.stagedCardIds);
  const stageSelectedCards = useGameStore((s) => s.stageSelectedCards);
  const clearStaged = useGameStore((s) => s.clearStaged);
  const clearSelection = useGameStore((s) => s.clearSelection);

  const hasSelected = selectedCardIds.size > 0;
  const hasStaged = stagedCardIds.size > 0;

  const handlePlay = () => {
    if (!hasSelected) return;
    stageSelectedCards();
  };

  const handleConfirm = () => {
    if (!socket) return;
    const cardIds = Array.from(stagedCardIds);
    socket.emit('game:play_cards', { cardIds });
    socket.emit('game:confirm_play');
    clearStaged();
    clearSelection();
  };

  const handleCancel = () => {
    if (!socket) return;
    socket.emit('game:cancel_play');
    clearStaged();
  };

  const handlePass = () => {
    if (!socket) return;
    socket.emit('game:pass');
    clearSelection();
    clearStaged();
  };

  if (!isMyTurn) {
    return (
      <div className="flex justify-center py-2 sm:py-4">
        <span className="text-[var(--text-secondary)] text-xs sm:text-base">相手のターンです...</span>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3 py-2 sm:py-4">
      {!hasStaged ? (
        <>
          <button
            onClick={handlePlay}
            disabled={!hasSelected}
            className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg bg-[var(--accent-green)] text-[var(--bg-primary)] font-bold text-sm sm:text-base hover:brightness-110 disabled:opacity-40 transition-all"
          >
            出す
          </button>
          <button
            onClick={handlePass}
            className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg bg-gray-600 text-white font-bold text-sm sm:text-base hover:brightness-110 transition-all"
          >
            パス
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleConfirm}
            className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-sm sm:text-base hover:brightness-110 transition-all"
          >
            確定
          </button>
          <button
            onClick={handleCancel}
            className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg bg-[var(--accent-red)] text-white font-bold text-sm sm:text-base hover:brightness-110 transition-all"
          >
            取り消し
          </button>
        </>
      )}
    </div>
  );
}
