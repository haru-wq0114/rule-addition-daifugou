'use client';

import { useState } from 'react';
import { useSocket } from '@/app/components/providers/SocketProvider';
import { useGameStore, type ExchangeState } from '@/app/stores/gameStore';
import type { AnyCard } from '@/shared/types/card';
import { CardComponent } from '@/app/components/game/CardComponent';
import { RANKING_LABELS } from '@/shared/types/game';

interface CardExchangeModalProps {
  exchange: ExchangeState;
  hand: AnyCard[];
}

export function CardExchangeModal({ exchange, hand }: CardExchangeModalProps) {
  const socket = useSocket();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isGiver = exchange.role === 'daifugou' || exchange.role === 'fugou';

  const toggleCard = (cardId: string) => {
    const next = new Set(selectedIds);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      if (next.size < exchange.cardsToGive) {
        next.add(cardId);
      }
    }
    setSelectedIds(next);
  };

  const handleSubmit = () => {
    if (!socket) return;
    if (selectedIds.size !== exchange.cardsToGive) return;
    socket.emit('game:exchange_select', { cardIds: Array.from(selectedIds) });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-8 max-w-2xl w-full border border-[var(--bg-card)] max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-2xl font-bold text-[var(--accent-gold)] text-center mb-2 sm:mb-4">
          カード交換
        </h2>
        <p className="text-center text-[var(--text-secondary)] text-xs sm:text-base mb-3 sm:mb-6">
          あなたは <span className="text-[var(--accent-gold)] font-bold">{RANKING_LABELS[exchange.role]}</span> です。
          {isGiver
            ? `${exchange.cardsToGive}枚のカードを選んで渡してください。`
            : `自動的に最強の${exchange.cardsToGive}枚が渡されます。`
          }
        </p>

        {exchange.receivedCards.length > 0 && (
          <div className="mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-1 sm:mb-2">受け取ったカード:</p>
            <div className="flex gap-0.5 sm:gap-1 justify-center">
              {exchange.receivedCards.map(card => (
                <CardComponent key={card.id} card={card} small />
              ))}
            </div>
          </div>
        )}

        {isGiver && (
          <>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-1 sm:mb-2">
              渡すカードを{exchange.cardsToGive}枚選択: ({selectedIds.size}/{exchange.cardsToGive})
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

            <button
              onClick={handleSubmit}
              disabled={selectedIds.size !== exchange.cardsToGive}
              className="w-full px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-sm sm:text-lg hover:brightness-110 disabled:opacity-40 transition-all"
            >
              交換する
            </button>
          </>
        )}

        {!isGiver && (
          <div className="text-center text-[var(--text-secondary)] text-xs sm:text-base">
            相手の選択を待っています...
          </div>
        )}
      </div>
    </div>
  );
}
