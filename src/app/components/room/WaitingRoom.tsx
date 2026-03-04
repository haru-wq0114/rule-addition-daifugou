'use client';

import { useState } from 'react';
import { useSocket } from '@/app/components/providers/SocketProvider';
import type { RoomDetail } from '@/shared/types/room';

interface WaitingRoomProps {
  room: RoomDetail;
  onLeave: () => void;
}

export function WaitingRoom({ room, onLeave }: WaitingRoomProps) {
  const socket = useSocket();
  const [copied, setCopied] = useState(false);

  const mySocketId = socket?.id;
  // Find if I am host (the player whose socket matches)
  // For now, use the first non-CPU player as a proxy
  const isHost = room.players.some(p => p.isHost);

  const handleToggleReady = () => {
    if (!socket) return;
    socket.emit('lobby:toggle_ready');
  };

  const handleAddCpu = () => {
    if (!socket) return;
    socket.emit('lobby:add_cpu');
  };

  const handleRemoveCpu = (cpuId: string) => {
    if (!socket) return;
    socket.emit('lobby:remove_cpu', { cpuId });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('lobby:start_game');
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(room.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック: clipboard API非対応の場合
      const textArea = document.createElement('textarea');
      textArea.value = room.roomId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-md">
      {/* ルームID表示 */}
      <div className="w-full text-center">
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-1">ルームID</p>
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span className="text-2xl sm:text-4xl font-mono font-bold text-[var(--accent-gold)] tracking-[0.3em] select-all">
            {room.roomId}
          </span>
          <button
            onClick={handleCopyRoomId}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all text-xs sm:text-sm"
            title="コピー"
          >
            {copied ? '✓' : 'コピー'}
          </button>
        </div>
        <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-1.5">
          このIDを他のプレイヤーに共有して招待しよう
        </p>
      </div>

      <div className="w-full">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-center">プレイヤー</h2>
        <div className="flex flex-col gap-3">
          {room.players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--bg-card)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    player.isReady ? 'bg-[var(--accent-green)]' : 'bg-gray-500'
                  }`}
                />
                <span className="font-bold">{player.name}</span>
                {player.isHost && (
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-gold)] text-[var(--bg-primary)]">
                    ホスト
                  </span>
                )}
                {player.isCpu && (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300">
                    CPU
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {player.isCpu && (
                  <button
                    onClick={() => handleRemoveCpu(player.id)}
                    className="text-xs px-2 py-1 rounded bg-[var(--accent-red)] text-white hover:brightness-110"
                  >
                    削除
                  </button>
                )}
                <span className="text-sm text-[var(--text-secondary)]">
                  {player.isReady ? '準備完了' : '待機中'}
                </span>
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center p-3 rounded-lg border border-dashed border-[var(--bg-card)] text-[var(--text-secondary)]"
            >
              空席
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleToggleReady}
          className="px-5 py-2 rounded-lg bg-[var(--accent-blue)] text-white font-bold hover:brightness-110 transition-all"
        >
          準備完了
        </button>

        <button
          onClick={handleAddCpu}
          disabled={room.players.length >= room.maxPlayers}
          className="px-5 py-2 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] font-bold hover:brightness-110 disabled:opacity-40 transition-all"
        >
          CPU追加
        </button>
      </div>

      <button
        onClick={handleStartGame}
        disabled={!room.players.every(p => p.isReady) || room.players.length < room.maxPlayers}
        className="px-8 py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-lg hover:brightness-110 disabled:opacity-40 transition-all"
      >
        ゲーム開始
      </button>

      <button
        onClick={onLeave}
        className="text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-colors"
      >
        ルームを退出
      </button>
    </div>
  );
}
