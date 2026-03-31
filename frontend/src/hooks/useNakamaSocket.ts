import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { OP_GAME_START, OP_STATE_UPDATE, OP_GAME_OVER, OP_PLAYER_DISCONNECTED, OP_TIMER_UPDATE } from '../constants/opcodes';

export function useNakamaSocket() {
  const socket = useAuthStore(state => state.socket);
  const session = useAuthStore(state => state.session);
  
  useEffect(() => {
    if (!socket || !session) return;

    socket.onmatchmakerdata = async (matchmakerMatched) => {
      // Auto-join the match when found
      const match = await socket.joinMatch(matchmakerMatched.match_id);
      useGameStore.setState({ matchId: match.match_id });
    };

    socket.onmatchdata = (matchData) => {
      const state = useGameStore.getState();
      const payload = JSON.parse(new TextDecoder().decode(matchData.data));

      switch (matchData.op_code) {
        case OP_GAME_START:
          // Determine opponent and my symbol
          let opponentLabel = 'Opponent';
          let mySymbol = 'X';
          for (const [id, player] of Object.entries(payload.players as Record<string, any>)) {
            if (id !== session.user_id) {
              opponentLabel = player.displayName || 'Opponent';
            } else {
              mySymbol = player.symbol;
            }
          }
          
          useGameStore.setState({
            board: payload.board,
            currentTurn: payload.currentTurn,
            status: 'playing',
            myUserId: session.user_id,
            opponentName: opponentLabel,
            mySymbol: mySymbol as 'X' | 'O',
            timerRemaining: payload.turnDeadline ? Math.max(0, Math.ceil((payload.turnDeadline - Date.now()) / 1000)) : 0,
            mode: payload.mode
          });
          break;

        case OP_STATE_UPDATE:
          useGameStore.setState({
            board: payload.board,
            currentTurn: payload.currentTurn,
            timerRemaining: payload.turnDeadline ? Math.max(0, Math.ceil((payload.turnDeadline - Date.now()) / 1000)) : 0
          });
          break;

        case OP_GAME_OVER:
          let winnerLabel = 'draw';
          if (payload.winner) {
            winnerLabel = payload.winner === session.user_id ? 'me' : 'opponent';
          }
          useGameStore.setState({
            board: payload.board,
            status: 'finished',
            winner: winnerLabel as 'me' | 'opponent' | 'draw'
          });
          break;

        case OP_TIMER_UPDATE:
          useGameStore.setState({
            timerRemaining: payload.remaining
          });
          break;

        case OP_PLAYER_DISCONNECTED:
          // The game over opcode usually follows, so we can just update a banner if needed
          break;
      }
    };

  }, [socket, session]);
}
