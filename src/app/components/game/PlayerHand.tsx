'use client';

import type { AnyCard } from '@/shared/types/card';
import { CardComponent } from './CardComponent';
import { useGameStore } from '@/app/stores/gameStore';

interface PlayerHandProps {
  hand: AnyCard[];
  isMyTurn: boolean;
}

export function PlayerHand({ hand, isMyTurn }: PlayerHandProps) {
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const stagedCardIds = useGameStore((s) => s.stagedCardIds);
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection);

  return (
    <div className="overflow-x-auto hide-scrollbar">
      <div className="flex justify-center items-end py-1.5 sm:py-4 px-2 sm:px-4 min-w-fit">
        {hand.map((card, index) => (
          <div
            key={card.id}
            className="relative shrink-0"
            style={{ marginLeft: index > 0 ? '-8px' : '0' }}
          >
            <CardComponent
              card={card}
              selected={selectedCardIds.has(card.id)}
              staged={stagedCardIds.has(card.id)}
              onClick={isMyTurn ? () => toggleCardSelection(card.id) : undefined}
            />
          </div>
        ))}
        {hand.length === 0 && (
          <div className="text-[var(--text-secondary)] py-4 sm:py-8 text-sm sm:text-base">あがり!</div>
        )}
      </div>
    </div>
  );
}
