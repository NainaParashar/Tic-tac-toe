export type CellValue = '' | 'X' | 'O';
export type MatchStatus = 'idle' | 'waiting' | 'playing' | 'finished';

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  totalGames: number;
}
