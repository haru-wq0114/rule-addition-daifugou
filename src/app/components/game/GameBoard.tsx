'use client';

import { useGameStore } from '@/app/stores/gameStore';
import { PlayerHand } from './PlayerHand';
import { PlayField } from './PlayField';
import { OpponentDisplay } from './OpponentDisplay';
import { ActionButtons } from './ActionButtons';
import { ScoreBoard } from './ScoreBoard';
import { ActiveRulesPanel } from './ActiveRulesPanel';
import { SpecialActionPrompt } from './SpecialActionPrompt';
import { RoundResultModal } from '@/app/components/results/RoundResultModal';
import { FinalResultScreen } from '@/app/components/results/FinalResultScreen';
import { CardExchangeModal } from '@/app/components/exchange/CardExchangeModal';
import { RuleSelectionModal } from '@/app/components/rules/RuleSelectionModal';

function TurnTimer() {
  const turnTimer = useGameStore((s) => s.turnTimer);
  const isMyTurn = useGameStore((s) => s.gameState?.isMyTurn);

  if (!turnTimer) return null;

  const { remainingSeconds, totalSeconds } = turnTimer;
  const isUrgent = remainingSeconds <= 10;
  const percentage = (remainingSeconds / totalSeconds) * 100;

  return (
    <div className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full ${
      isUrgent ? 'bg-red-500/20' : 'bg-[var(--bg-card)]'
    }`}>
      <div className="relative w-6 h-6 sm:w-8 sm:h-8">
        <svg className="w-6 h-6 sm:w-8 sm:h-8 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-[var(--bg-card)]"
          />
          <circle
            cx="18" cy="18" r="14"
            fill="none"
            strokeWidth="3"
            strokeDasharray={`${percentage * 0.88} 88`}
            strokeLinecap="round"
            className={`${isUrgent ? 'text-red-500' : 'text-[var(--accent-gold)]'} transition-all duration-1000`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold ${
          isUrgent ? 'text-red-500 animate-pulse' : 'text-[var(--text-primary)]'
        }`}>
          {remainingSeconds}
        </span>
      </div>
      {isMyTurn && isUrgent && (
        <span className="text-[10px] sm:text-xs text-red-400 animate-pulse font-bold">急いで!</span>
      )}
    </div>
  );
}

export function GameBoard() {
  const gameState = useGameStore((s) => s.gameState);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const specialPrompt = useGameStore((s) => s.specialPrompt);
  const roundResult = useGameStore((s) => s.roundResult);
  const gameOverData = useGameStore((s) => s.gameOverData);
  const exchangeState = useGameStore((s) => s.exchangeState);
  const ruleSelectionOptions = useGameStore((s) => s.ruleSelectionOptions);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)] text-xl">
          ゲームを準備中...
        </div>
      </div>
    );
  }

  const { myHand, myId, players, field, scores, isMyTurn, activeRules } = gameState;

  // Find opponents (everyone except me)
  const opponents = players.filter((p) => p.id !== myId);

  // Build player names map
  const playerNames: Record<string, string> = {};
  players.forEach((p) => {
    playerNames[p.id] = p.name;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar: scores and rules */}
      <div className="flex justify-between items-start p-1.5 sm:p-2 md:p-3 gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        <ScoreBoard
          players={players}
          scores={scores}
          roundNumber={roundNumber}
        />
        <ActiveRulesPanel activeRules={activeRules} />
      </div>

      {/* === モバイル用レイアウト (< sm) === */}
      <div className="flex flex-col flex-1 min-h-0 sm:hidden">
        {/* 対戦相手: 横一列 */}
        <div className="flex justify-center gap-1 px-1 shrink-0">
          {opponents.map((opp) => (
            <OpponentDisplay
              key={opp.id}
              player={opp}
              isCurrentTurn={field.currentTurnPlayerId === opp.id}
              position="top"
              compact
            />
          ))}
        </div>

        {/* PlayField: 中央 */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <PlayField
            currentPlay={field.currentPlay}
            recentHistory={field.recentHistory ?? []}
            isRevolution={field.isRevolution}
            isElevenBack={field.isElevenBack}
          />
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <div className={`text-center text-xs font-bold ${isMyTurn ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`}>
              {isMyTurn ? 'あなたのターン' : `${playerNames[field.currentTurnPlayerId || ''] || '...'} のターン`}
            </div>
            <TurnTimer />
          </div>
        </div>
      </div>

      {/* === デスクトップ用レイアウト (>= sm) === */}
      <div className="hidden sm:block flex-1 relative min-h-0">
        {/* Top opponent - centered at top */}
        {opponents[0] && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
            <OpponentDisplay
              player={opponents[0]}
              isCurrentTurn={field.currentTurnPlayerId === opponents[0].id}
              position="top"
            />
          </div>
        )}

        {/* Left opponent */}
        {opponents[1] && (
          <div className="absolute top-1/2 -translate-y-1/2 left-3 z-10">
            <OpponentDisplay
              player={opponents[1]}
              isCurrentTurn={field.currentTurnPlayerId === opponents[1].id}
              position="left"
            />
          </div>
        )}

        {/* Right opponent */}
        {opponents[2] && (
          <div className="absolute top-1/2 -translate-y-1/2 right-3 z-10">
            <OpponentDisplay
              player={opponents[2]}
              isCurrentTurn={field.currentTurnPlayerId === opponents[2].id}
              position="right"
            />
          </div>
        )}

        {/* PlayField - fixed center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
          <PlayField
            currentPlay={field.currentPlay}
            recentHistory={field.recentHistory ?? []}
            isRevolution={field.isRevolution}
            isElevenBack={field.isElevenBack}
          />
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className={`text-center text-sm font-bold ${isMyTurn ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`}>
              {isMyTurn ? 'あなたのターン' : `${playerNames[field.currentTurnPlayerId || ''] || '...'} のターン`}
            </div>
            <TurnTimer />
          </div>
        </div>
      </div>

      {/* Bottom: my hand + action buttons */}
      <div className="bg-[var(--bg-secondary)]/30 border-t border-[var(--bg-card)] shrink-0 pb-[env(safe-area-inset-bottom,8px)] sm:pb-0">
        <ActionButtons isMyTurn={isMyTurn} />
        <PlayerHand hand={myHand} isMyTurn={isMyTurn} />
      </div>

      {/* Modals */}
      {specialPrompt && (
        <SpecialActionPrompt prompt={specialPrompt} hand={myHand} />
      )}

      {roundResult && (
        <RoundResultModal
          result={roundResult}
          roundNumber={roundNumber}
          playerNames={playerNames}
        />
      )}

      {gameOverData && (
        <FinalResultScreen data={gameOverData} />
      )}

      {exchangeState && (
        <CardExchangeModal exchange={exchangeState} hand={myHand} />
      )}

      {ruleSelectionOptions && (
        <RuleSelectionModal />
      )}
    </div>
  );
}
