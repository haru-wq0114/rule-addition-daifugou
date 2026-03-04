'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const router = useRouter();

  const handleStart = () => {
    if (playerName.trim().length === 0) return;
    sessionStorage.setItem('playerName', playerName.trim());
    router.push('/lobby');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-5xl font-bold text-[var(--accent-gold)]">
        ルール追加大富豪
      </h1>
      <p className="text-[var(--text-secondary)] text-lg">
        毎ラウンド新しいルールが追加される大富豪
      </p>

      <div className="flex flex-col gap-4 w-80">
        <input
          type="text"
          placeholder="プレイヤー名を入力"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          maxLength={12}
          className="px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--bg-card)] text-[var(--text-primary)] text-center text-lg focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
        />
        <button
          onClick={handleStart}
          disabled={playerName.trim().length === 0}
          className="px-6 py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          ロビーへ
        </button>
      </div>
    </div>
  );
}
