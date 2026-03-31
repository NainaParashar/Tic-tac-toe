import { create } from 'zustand';
import type { CellValue, MatchStatus } from '../types';
import { useAuthStore } from './authStore';
import { OP_MAKE_MOVE } from '../constants/opcodes';

interface GameState {
  matchId: string | null;
  board: CellValue[];
  mySymbol: 'X' | 'O' | null;
  currentTurn: string;
  myUserId: string;
  opponentName: string;
  status: MatchStatus;
  winner: 'me' | 'opponent' | 'draw' | null;
  timerRemaining: number;
  mode: 'classic' | 'timed' | 'computer';

  resetGame: () => void;
  joinMatchmaker: (mode: 'classic' | 'timed' | 'computer') => Promise<void>;
  cancelMatchmaker: () => Promise<void>;
  makeMove: (cellIndex: number) => void;
  leaveMatch: () => void;
  
  // Internal actions from socket
  setBoard: (board: CellValue[]) => void;
  setTurn: (userId: string) => void;
  setStatus: (status: MatchStatus) => void;
  setTimer: (timer: number) => void;
  setMatchDetails: (details: Partial<GameState>) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  matchId: null,
  board: Array(9).fill(''),
  mySymbol: null,
  currentTurn: '',
  myUserId: '',
  opponentName: '',
  status: 'idle',
  winner: null,
  timerRemaining: 0,
  mode: 'classic',

  resetGame: () => set({ 
    matchId: null, board: Array(9).fill(''), mySymbol: null, currentTurn: '', 
    opponentName: '', status: 'idle', winner: null, timerRemaining: 0 
  }),

  // Actions wrapped over Nakama matchmaker
  joinMatchmaker: async (mode) => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;
    set({ status: 'waiting', mode });

    if (mode === 'computer') {
      try {
        const response = await socket.rpc('createPrivateRoom', JSON.stringify({ mode: 'computer' }));
        if (response.payload) {
          const { matchId } = JSON.parse(response.payload);
          const match = await socket.joinMatch(matchId);
          set({ matchId: match.match_id });
        }
      } catch (e) {
        set({ status: 'idle' });
      }
    } else {
      await socket.addMatchmaker(`+properties.mode:${mode}`, 2, 2, { mode: mode });
    }
  },

  cancelMatchmaker: async () => {
    // Basic cancel logic, we omit exact ticket removal for simplicity here
    set({ status: 'idle' });
  },

  makeMove: (cellIndex: number) => {
    const { matchId, currentTurn, board, status } = get();
    const { socket, session } = useAuthStore.getState();
    const myUserId = session?.user_id;

    if (!myUserId || status !== 'playing' || currentTurn !== myUserId || board[cellIndex] !== '') {
      return;
    }

    const payload = new TextEncoder().encode(JSON.stringify({ cellIndex }));
    socket?.sendMatchState(matchId!, OP_MAKE_MOVE, payload);
  },

  leaveMatch: () => {
    const { socket } = useAuthStore.getState();
    const { matchId } = get();
    if (socket && matchId) socket.leaveMatch(matchId);
    get().resetGame();
  },

  setBoard: (board) => set({ board }),
  setTurn: (currentTurn) => set({ currentTurn }),
  setStatus: (status) => set({ status }),
  setTimer: (timerRemaining) => set({ timerRemaining }),
  setMatchDetails: (details) => set({ ...details })
}));
