'use client';

import { useState } from 'react';
import { useSocket } from '@/app/components/providers/SocketProvider';
import { useGameStore, type SpecialPrompt } from '@/app/stores/gameStore';
import type { AnyCard, Rank } from '@/shared/types/card';
import { CardComponent } from './CardComponent';
import { RANK_DISPLAY } from '@/shared/constants/cards';

interface SpecialActionPromptProps {
  prompt: SpecialPrompt;
  hand: AnyCard[];
}

export function SpecialActionPrompt({ prompt, hand }: SpecialActionPromptProps) {
  const socket = useSocket();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRanks, setSelectedRanks] = useState<Rank[]>([]);

  const toggleCard = (cardId: string) => {
    const next = new Set(selectedIds);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      if (next.size < prompt.count) {
        next.add(cardId);
      }
    }
    setSelectedIds(next);
  };

  const toggleRank = (rank: Rank) => {
    if (selectedRanks.includes(rank)) {
      setSelectedRanks(selectedRanks.filter(r => r !== rank));
    } else if (selectedRanks.length < prompt.count) {
      setSelectedRanks([...selectedRanks, rank]);
    }
  };

  const handleSubmit = () => {
    if (!socket) return;

    switch (prompt.type) {
      case 'ten_discard':
        socket.emit('game:ten_discard_select', { cardIds: Array.from(selectedIds) });
        break;
      case 'twelve_bomber':
        socket.emit('game:twelve_bomber_declare', { ranks: selectedRanks });
        break;
      case 'seven_pass':
        socket.emit('game:seven_pass_select', { cardIds: Array.from(selectedIds) });
        break;
    }

    useGameStore.getState().setSpecialPrompt(null);
  };

  const getTitle = () => {
    switch (prompt.type) {
      case 'ten_discard': return '10捨て';
      case 'twelve_bomber': return '12ボンバー';
      case 'seven_pass': return '7渡し';
    }
  };

  const getDescription = () => {
    switch (prompt.type) {
      case 'ten_discard': return `手札から${prompt.count}枚まで選んで捨てることができます。`;
      case 'twelve_bomber': return `${prompt.count}つの数字を宣言してください。その数字のカードを持つ全プレイヤーが捨てます。`;
      case 'seven_pass': return `手札から${prompt.count}枚選んで次の人に渡してください。`;
    }
  };

  const allRanks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-8 max-w-2xl w-full border border-[var(--accent-gold)] max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-2xl font-bold text-[var(--accent-gold)] text-center mb-1 sm:mb-2">
          {getTitle()}
        </h2>
        <p className="text-center text-[var(--text-secondary)] text-xs sm:text-base mb-3 sm:mb-6">
          {getDescription()}
        </p>

        {prompt.type === 'twelve_bomber' ? (
          <>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-1 sm:mb-2">
              数字を選択 ({selectedRanks.length}/{prompt.count})
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center mb-3 sm:mb-6">
              {allRanks.map(rank => (
                <button
                  key={rank}
                  onClick={() => toggleRank(rank)}
                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg font-bold text-sm sm:text-lg border-2 transition-all ${
                    selectedRanks.includes(rank)
                      ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)] border-[var(--accent-gold)]'
                      : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--bg-card)] hover:border-[var(--accent-gold)]'
                  }`}
                >
                  {RANK_DISPLAY[rank]}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-1 sm:mb-2">
              カードを選択 ({selectedIds.size}/{prompt.count})
            </p>
            <div className="flex gap-0.5 sm:gap-1 flex-wrap justify-center mb-3 sm:mb-6">
              {hand.map(card => (
                <CardComponent
                  key={card.id}
                  card={card}
                  selected={selectedIds.has(card.id)}
                  onClick={() => toggleCard(card.id)}
                />
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleSubmit}
            disabled={
              prompt.type === 'twelve_bomber'
                ? selectedRanks.length === 0
                : selectedIds.size === 0
            }
            className="flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-sm sm:text-lg hover:brightness-110 disabled:opacity-40 transition-all"
          >
            決定
          </button>
          {prompt.type === 'ten_discard' && (
            <button
              onClick={() => {
                if (!socket) return;
                socket.emit('game:ten_discard_select', { cardIds: [] });
                useGameStore.getState().setSpecialPrompt(null);
              }}
              className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-gray-600 text-white font-bold text-sm sm:text-base hover:brightness-110 transition-all"
            >
              スキップ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
