'use client';

import { useState } from 'react';
import type { AdditionalRuleId } from '@/shared/types/rules';
import { ADDITIONAL_RULES } from '@/shared/constants/rules';

interface ActiveRulesPanelProps {
  activeRules: AdditionalRuleId[];
}

const BASE_RULES = [
  { name: '8切り', description: '8を出すと場が流れ、出した人が次のターンを始める。' },
  { name: '11バック', description: 'Jを出すと一時的にカードの強さが逆転する（場が流れるまで）。' },
  { name: '革命', description: '同じ数字を4枚同時に出すとカードの強弱が逆転する。' },
  { name: '数縛り', description: '同じ数字が2連続で出ると、その数字しか出せなくなる。' },
  { name: '色縛り', description: '同じスートが2連続で出ると、そのスートしか出せなくなる。' },
];

function RuleBadge({ ruleId }: { ruleId: AdditionalRuleId }) {
  const [expanded, setExpanded] = useState(false);
  const rule = ADDITIONAL_RULES[ruleId];

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="px-2 py-0.5 rounded bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] text-[10px] sm:text-xs border border-[var(--accent-gold)]/30 hover:bg-[var(--accent-gold)]/30 transition-colors cursor-pointer whitespace-nowrap"
      >
        {rule.nameJa}
      </button>
      {expanded && (
        <div className="absolute z-50 top-full right-0 sm:left-0 sm:right-auto mt-1 p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--accent-gold)]/40 shadow-lg w-44 sm:w-56">
          <div className="font-bold text-[var(--accent-gold)] text-xs mb-1">{rule.nameJa}</div>
          <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">{rule.descriptionJa}</div>
        </div>
      )}
    </div>
  );
}

export function ActiveRulesPanel({ activeRules }: ActiveRulesPanelProps) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-1.5 sm:p-3 max-w-[180px] sm:max-w-[280px] overflow-visible">
      {/* 基本ルール */}
      <h3 className="text-[9px] sm:text-xs font-bold text-[var(--text-secondary)] mb-1">基本ルール</h3>
      <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-1.5 sm:mb-2">
        {BASE_RULES.map((rule) => (
          <span
            key={rule.name}
            className="px-1 sm:px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[8px] sm:text-[10px] text-[var(--text-secondary)]"
            title={rule.description}
          >
            {rule.name}
          </span>
        ))}
      </div>

      {/* 追加ルール */}
      {activeRules.length > 0 && (
        <>
          <h3 className="text-[9px] sm:text-xs font-bold text-[var(--accent-gold)] mb-1">
            追加ルール ({activeRules.length})
          </h3>
          <div className="flex flex-wrap gap-0.5 sm:gap-1">
            {activeRules.map((ruleId) => (
              <RuleBadge key={ruleId} ruleId={ruleId} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
