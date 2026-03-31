import { MatchState, CellValue } from './types';

export function checkWinner(board: CellValue[]): CellValue | null {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diagonals
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as CellValue;
    }
  }
  return null;
}

export function buildStatePayload(state: MatchState) {
  const playersForPayload: Record<string, {symbol: string, displayName: string}> = {};
  for (const [id, p] of Object.entries(state.players)) {
    playersForPayload[id] = {
      symbol: p.symbol,
      displayName: p.displayName
    };
  }

  return {
    board: state.board,
    currentTurn: state.currentTurn,
    moveCount: state.moveCount,
    status: state.status,
    winner: state.winner,
    mode: state.mode,
    players: playersForPayload,
    turnDeadline: state.turnDeadline
  };
}
