'use client';

import type { AnyCard } from '@/shared/types/card';
import { isJoker } from '@/shared/types/card';
import { SUIT_SYMBOLS, RANK_DISPLAY } from '@/shared/constants/cards';
import type { Suit, Rank } from '@/shared/types/card';

interface CardComponentProps {
  card: AnyCard;
  faceDown?: boolean;
  selected?: boolean;
  staged?: boolean;
  onClick?: () => void;
  small?: boolean;
}

const SUIT_COLORS: Record<Suit, string> = {
  spades: 'text-gray-800',
  clubs: 'text-gray-800',
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
};

export function CardComponent({ card, faceDown, selected, staged, onClick, small }: CardComponentProps) {
  if (faceDown) {
    return (
      <div
        className={`${small ? 'w-7 h-10 sm:w-10 sm:h-14' : 'w-10 h-14 sm:w-14 sm:h-20'} rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 border-2 border-blue-600 shadow-md flex items-center justify-center`}
      >
        <div className={`${small ? 'text-[8px] sm:text-xs' : 'text-xs sm:text-lg'} text-blue-400`}>?</div>
      </div>
    );
  }

  const joker = isJoker(card);
  const suitSymbol = joker ? '★' : SUIT_SYMBOLS[card.suit as Suit];
  const rankDisplay = joker ? 'JKR' : RANK_DISPLAY[card.rank as Rank];
  const colorClass = joker ? 'text-purple-500' : SUIT_COLORS[card.suit as Suit];

  const stateClass = staged
    ? 'card-in-hand staged'
    : selected
    ? 'card-in-hand selected'
    : onClick
    ? 'card-in-hand'
    : '';

  return (
    <div
      onClick={onClick}
      className={`
        ${small ? 'w-7 h-10 sm:w-10 sm:h-14 text-[8px] sm:text-xs' : 'w-10 h-14 sm:w-14 sm:h-20 text-[10px] sm:text-sm'}
        rounded-lg bg-white border-2 border-gray-300 shadow-md
        flex flex-col items-center justify-between p-0.5 sm:p-1
        ${stateClass}
        ${onClick ? 'cursor-pointer' : ''}
        select-none
      `}
    >
      <div className={`self-start font-bold ${colorClass}`}>
        {rankDisplay}
      </div>
      <div className={`${small ? 'text-sm sm:text-lg' : 'text-lg sm:text-2xl'} ${colorClass}`}>
        {suitSymbol}
      </div>
      <div className={`self-end font-bold ${colorClass} rotate-180`}>
        {rankDisplay}
      </div>
    </div>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  return (
    <div
      className={`${small ? 'w-7 h-10 sm:w-10 sm:h-14' : 'w-10 h-14 sm:w-14 sm:h-20'} rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 border-2 border-blue-600 shadow-md flex items-center justify-center`}
    >
      <div className="text-blue-400 text-xs sm:text-lg">&#9824;</div>
    </div>
  );
}
