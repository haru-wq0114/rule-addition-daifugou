'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/shared/types/events';
import { useGameStore } from '@/app/stores/gameStore';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SocketContext = createContext<TypedSocket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const socket: TypedSocket = io({
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      useGameStore.getState().setConnected(true);
      setIsReady(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      useGameStore.getState().setConnected(false);
    });

    // Lobby events
    socket.on('lobby:room_list', ({ rooms }) => {
      useGameStore.getState().updateRoomList(rooms);
    });

    socket.on('lobby:room_updated', ({ room }) => {
      useGameStore.getState().setCurrentRoom(room);
    });

    socket.on('lobby:room_created', ({ roomId }) => {
      useGameStore.getState().setRoomId(roomId);
    });

    socket.on('lobby:error', ({ message }) => {
      useGameStore.getState().setError(message);
    });

    // Game events
    socket.on('game:state_update', (state) => {
      useGameStore.getState().updateGameState(state);
    });

    socket.on('game:round_start', ({ roundNumber }) => {
      useGameStore.getState().setRoundNumber(roundNumber);
    });

    socket.on('game:play_confirmed', (data) => {
      useGameStore.getState().addLogEntry({
        type: 'play',
        playerId: data.playerId,
        cards: data.cards,
        effects: data.effects,
      });
    });

    socket.on('game:pass_result', ({ playerId }) => {
      useGameStore.getState().addLogEntry({
        type: 'pass',
        playerId,
      });
    });

    socket.on('game:field_cleared', ({ nextPlayerId }) => {
      useGameStore.getState().addLogEntry({
        type: 'field_cleared',
        nextPlayerId,
      });
    });

    socket.on('game:invalid_play', ({ reason, penalty }) => {
      useGameStore.getState().addLogEntry({
        type: 'invalid_play',
        reason,
        penalty,
      });
    });

    socket.on('game:revolution', ({ playerId, isRevolution }) => {
      useGameStore.getState().addLogEntry({
        type: 'revolution',
        playerId,
        isRevolution,
      });
    });

    socket.on('game:player_finished', ({ playerId, ranking }) => {
      useGameStore.getState().addLogEntry({
        type: 'player_finished',
        playerId,
        ranking,
      });
    });

    socket.on('game:round_end', (data) => {
      useGameStore.getState().setRoundResult(data);
    });

    socket.on('game:game_over', (data) => {
      useGameStore.getState().setGameOver(data);
    });

    // Rule selection
    socket.on('game:rule_selection_start', (data) => {
      useGameStore.getState().setRuleSelectionOptions(data);
    });

    socket.on('game:reroll_result', (data) => {
      useGameStore.getState().setRuleSelectionOptions(data);
    });

    socket.on('game:rule_selection_result', (data) => {
      console.log('Rule selection result received:', data);
      useGameStore.getState().setRuleSelectionOptions(null);
    });

    // Card exchange
    socket.on('game:exchange_start', (data) => {
      useGameStore.getState().setExchangeState(data);
    });

    socket.on('game:exchange_complete', ({ newHand }) => {
      useGameStore.getState().setHandAfterExchange(newHand);
    });

    // Special rule prompts
    socket.on('game:ten_discard_prompt', ({ count }) => {
      useGameStore.getState().setSpecialPrompt({ type: 'ten_discard', count });
    });

    socket.on('game:twelve_bomber_prompt', ({ count }) => {
      useGameStore.getState().setSpecialPrompt({ type: 'twelve_bomber', count });
    });

    socket.on('game:seven_pass_prompt', ({ count }) => {
      useGameStore.getState().setSpecialPrompt({ type: 'seven_pass', count });
    });

    // Turn timer
    socket.on('game:turn_timer', (data) => {
      useGameStore.getState().setTurnTimer(data);
    });

    socket.on('game:turn_timeout', ({ playerId }) => {
      useGameStore.getState().setTurnTimer(null);
      useGameStore.getState().addLogEntry({
        type: 'timeout',
        playerId,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): TypedSocket | null {
  return useContext(SocketContext);
}
