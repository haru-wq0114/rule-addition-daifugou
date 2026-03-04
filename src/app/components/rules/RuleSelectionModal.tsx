'use client';

import { useSocket } from '@/app/components/providers/SocketProvider';
import { useGameStore } from '@/app/stores/gameStore';
import { ADDITIONAL_RULES } from '@/shared/constants/rules';
import type { AdditionalRuleId } from '@/shared/types/rules';

export function RuleSelectionModal() {
  const socket = useSocket();
  const ruleOptions = useGameStore((s) => s.ruleSelectionOptions);

  if (!ruleOptions) return null;

  const { options, rerollsRemaining } = ruleOptions;

  const handleSelectRule = (ruleId: AdditionalRuleId) => {
    if (!socket) return;
    socket.emit('game:select_rule', { ruleId });
    useGameStore.getState().setRuleSelectionOptions(null);
  };

  const handleReroll = () => {
    if (!socket) return;
    socket.emit('game:reroll_rules');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-8 max-w-lg w-full border border-[var(--bg-card)]">
        <h2 className="text-lg sm:text-2xl font-bold text-[var(--accent-gold)] text-center mb-1 sm:mb-2">
          ルール追加
        </h2>
        <p className="text-center text-[var(--text-secondary)] text-xs sm:text-base mb-3 sm:mb-6">
          次の試合に追加するルールを1つ選んでください
        </p>

        <div className="flex flex-col gap-2 sm:gap-4 mb-3 sm:mb-6">
          {options.map((ruleId) => {
            const rule = ADDITIONAL_RULES[ruleId];
            return (
              <button
                key={ruleId}
                onClick={() => handleSelectRule(ruleId)}
                className="p-3 sm:p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--bg-card)] hover:border-[var(--accent-gold)] transition-all text-left"
              >
                <div className="font-bold text-[var(--accent-gold)] text-sm sm:text-base mb-0.5 sm:mb-1">
                  {rule.nameJa}
                </div>
                <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  {rule.descriptionJa}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleReroll}
          disabled={rerollsRemaining <= 0}
          className="w-full px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] font-bold text-sm sm:text-base hover:brightness-110 disabled:opacity-40 transition-all"
        >
          リロール ({rerollsRemaining}回残り)
        </button>
      </div>
    </div>
  );
}
