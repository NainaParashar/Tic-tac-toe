// OpCodes for real-time messages
export const OP_MAKE_MOVE = 1;
export const OP_STATE_UPDATE = 2;
export const OP_GAME_START = 3;
export const OP_GAME_OVER = 4;
export const OP_PLAYER_DISCONNECTED = 5;
export const OP_TIMER_UPDATE = 6;

export type CellValue = '' | 'X' | 'O';
export type MatchStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerData {
  symbol: 'X' | 'O';
  displayName: string;
  presence: nkruntime.Presence;
}

export interface MatchState {
  board: CellValue[];
  players: Record<string, PlayerData>;
  currentTurn: string;
  moveCount: number;
  status: MatchStatus;
  winner: string | null;
  mode: 'classic' | 'timed' | 'computer';
  turnDeadline: number;
  turnDurationSec: number;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  totalGames: number;
}
