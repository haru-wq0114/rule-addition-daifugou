'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/app/components/providers/SocketProvider';
import { useGameStore } from '@/app/stores/gameStore';
import { WaitingRoom } from '@/app/components/room/WaitingRoom';
import { GameBoard } from '@/app/components/game/GameBoard';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const socket = useSocket();
  const currentRoom = useGameStore((s) => s.currentRoom);
  const gameState = useGameStore((s) => s.gameState);

  const roomId = params.roomId as string;

  useEffect(() => {
    const name = sessionStorage.getItem('playerName');
    if (!name) {
      router.push('/');
    }
  }, [router]);

  const handleLeave = () => {
    if (!socket) return;
    socket.emit('lobby:leave_room');
    useGameStore.getState().setCurrentRoom(null);
    useGameStore.getState().setRoomId('');
    router.push('/lobby');
  };

  // If game is active, show game board
  if (currentRoom?.status === 'playing' || gameState) {
    return <GameBoard />;
  }

  // Otherwise show waiting room
  return (
    <div className="flex flex-col items-center min-h-screen p-8 gap-8">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-[var(--accent-gold)]">
          ルーム: {roomId}
        </h1>
      </div>

      {currentRoom ? (
        <WaitingRoom room={currentRoom} onLeave={handleLeave} />
      ) : (
        <div className="text-[var(--text-secondary)]">ルーム情報を読み込み中...</div>
      )}
    </div>
  );
}
