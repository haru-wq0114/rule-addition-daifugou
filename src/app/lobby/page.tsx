'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/app/components/providers/SocketProvider';
import { useGameStore } from '@/app/stores/gameStore';

export default function LobbyPage() {
  const socket = useSocket();
  const router = useRouter();
  const roomList = useGameStore((s) => s.roomList);
  const currentRoomId = useGameStore((s) => s.currentRoomId);
  const error = useGameStore((s) => s.error);
  const isConnected = useGameStore((s) => s.isConnected);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const name = sessionStorage.getItem('playerName');
    if (!name) {
      router.push('/');
      return;
    }
    useGameStore.getState().setPlayerInfo('', name);
    // ロビーに来たらエラーとルームIDをクリア
    useGameStore.getState().setError(null);
    useGameStore.getState().setRoomId('');
  }, [router]);

  useEffect(() => {
    if (currentRoomId) {
      router.push(`/room/${currentRoomId}`);
    }
  }, [currentRoomId, router]);

  // エラーが来たらjoining状態を解除
  useEffect(() => {
    if (error) {
      setIsJoining(false);
    }
  }, [error]);

  const handleCreateRoom = () => {
    if (!socket) return;
    useGameStore.getState().setError(null);
    const name = sessionStorage.getItem('playerName') || 'Player';
    socket.emit('lobby:create_room', { playerName: name });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket) return;
    useGameStore.getState().setError(null);
    setIsJoining(true);
    const name = sessionStorage.getItem('playerName') || 'Player';
    socket.emit('lobby:join_room', { roomId, playerName: name });
  };

  const handleJoinById = () => {
    const trimmed = joinRoomId.trim().toUpperCase();
    if (!trimmed) return;
    handleJoinRoom(trimmed);
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 gap-5 sm:gap-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--accent-gold)]">ロビー</h1>

      {!isConnected && (
        <div className="text-[var(--accent-red)] text-sm sm:text-base">サーバーに接続中...</div>
      )}

      {error && (
        <div className="bg-red-900/50 text-[var(--accent-red)] px-4 py-2 rounded text-sm sm:text-base border border-red-700/50">
          {error}
        </div>
      )}

      <button
        onClick={handleCreateRoom}
        disabled={!isConnected}
        className="px-6 py-3 rounded-lg bg-[var(--accent-green)] text-[var(--bg-primary)] font-bold text-base sm:text-lg hover:brightness-110 disabled:opacity-40 transition-all"
      >
        ルームを作成
      </button>

      {/* ルームIDで参加 */}
      <div className="w-full max-w-lg">
        <h2 className="text-lg sm:text-xl font-bold mb-3 text-[var(--text-secondary)]">
          ルームIDで参加
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => {
              setJoinRoomId(e.target.value.toUpperCase());
              useGameStore.getState().setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinById()}
            placeholder="ルームIDを入力"
            maxLength={6}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--bg-card)] text-[var(--text-primary)] text-center text-lg sm:text-xl font-mono tracking-widest placeholder:text-[var(--text-secondary)]/50 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
          />
          <button
            onClick={handleJoinById}
            disabled={!isConnected || !joinRoomId.trim() || isJoining}
            className="px-5 py-2.5 rounded-lg bg-[var(--accent-blue)] text-white font-bold hover:brightness-110 disabled:opacity-40 transition-all whitespace-nowrap"
          >
            {isJoining ? '参加中...' : '参加'}
          </button>
        </div>
      </div>

      {/* ルーム一覧 */}
      <div className="w-full max-w-lg">
        <h2 className="text-lg sm:text-xl font-bold mb-3 text-[var(--text-secondary)]">
          ルーム一覧
        </h2>

        {roomList.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-center py-6 text-sm sm:text-base">
            現在利用可能なルームはありません
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {roomList.map((room) => (
              <div
                key={room.roomId}
                className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--bg-card)]"
              >
                <div>
                  <div className="font-bold text-sm sm:text-base">{room.hostName} のルーム</div>
                  <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    ID: <span className="font-mono">{room.roomId}</span> | {room.playerCount}/{room.maxPlayers}人
                  </div>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.roomId)}
                  disabled={room.status !== 'waiting'}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-[var(--accent-blue)] text-white font-bold text-sm sm:text-base hover:brightness-110 disabled:opacity-40 transition-all"
                >
                  参加
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push('/')}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        戻る
      </button>
    </div>
  );
}
