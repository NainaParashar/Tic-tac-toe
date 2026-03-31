import { MatchState, OP_GAME_START, OP_PLAYER_DISCONNECTED, OP_GAME_OVER, OP_MAKE_MOVE, OP_STATE_UPDATE, OP_TIMER_UPDATE } from './types';
import { checkWinner, buildStatePayload } from './game_logic';
import { updateLeaderboard } from './leaderboard';

const matchInit: nkruntime.MatchInitFunction = (ctx, logger, nk, params) => {
  const state: MatchState = {
    board: Array(9).fill('') as any,
    players: {},
    currentTurn: '',
    moveCount: 0,
    status: 'waiting',
    winner: null,
    mode: (params['mode'] === 'timed') ? 'timed' : (params['mode'] === 'computer' ? 'computer' : 'classic'),
    turnDeadline: 0,
    turnDurationSec: 30,
  };
  return { state, tickRate: 5, label: JSON.stringify({ mode: state.mode }) };
};

const matchJoin: nkruntime.MatchJoinFunction = (ctx, logger, nk, dispatcher, tick, state, presences) => {
  presences.forEach(p => {
    const symbol = Object.keys(state.players).length === 0 ? 'X' : 'O';
    state.players[p.userId] = { symbol, displayName: p.username, presence: p };
  });

  if (state.mode === 'computer' && Object.keys(state.players).length === 1 && state.status === 'waiting') {
    const symbol = state.players[presences[0].userId].symbol === 'X' ? 'O' : 'X';
    // Use 'computer_id' as the internal userId for the bot
    state.players['computer_id'] = { symbol, displayName: 'Computer', presence: null as any };
  }

  if (Object.keys(state.players).length === 2 && state.status === 'waiting') {
    state.status = 'playing';
    state.currentTurn = Object.keys(state.players).find(id => id !== 'computer_id') || Object.keys(state.players)[0]; // Human goes first
    if (state.mode === 'timed') {
      state.turnDeadline = Date.now() + state.turnDurationSec * 1000;
    }
    dispatcher.broadcastMessage(OP_GAME_START, JSON.stringify(buildStatePayload(state)));
  }
  return { state };
};

const matchLeave: nkruntime.MatchLeaveFunction = (ctx, logger, nk, dispatcher, tick, state, presences) => {
  if (state.status === 'playing') {
    // If someone leaves during a game, they forfeit
    const leaver = presences[0];
    const winnerId = Object.keys(state.players).find(id => id !== leaver.userId);
    if (winnerId) {
      state.status = 'finished';
      state.winner = winnerId;
      try { updateLeaderboard(nk, state); } catch(e) {}
      dispatcher.broadcastMessage(OP_PLAYER_DISCONNECTED, JSON.stringify({ leaverId: leaver.userId }));
      dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
    }
  }
  return { state };
};

const matchLoop: nkruntime.MatchLoopFunction = (ctx, logger, nk, dispatcher, tick, state, messages) => {
  if (state.status === 'finished' || Object.keys(state.players).length === 0) {
    return null; // Signals match termination
  }

  // 1. Process moves
  for (const msg of messages) {
    if (msg.opCode === OP_MAKE_MOVE) {
      try {
        const data = JSON.parse(nk.binaryToString(msg.data));
        const cellIndex = data.cellIndex;

        // Validation
        if (state.status !== 'playing') continue;
        if (msg.sender.userId !== state.currentTurn) continue;
        if (cellIndex < 0 || cellIndex > 8) continue;
        if (state.board[cellIndex] !== '') continue;

        // Apply move
        const symbol = state.players[msg.sender.userId].symbol;
        state.board[cellIndex] = symbol;
        state.moveCount++;

        // Check for finish
        const winnerSymbol = checkWinner(state.board);
        if (winnerSymbol || state.moveCount === 9) {
          state.status = 'finished';
          state.winner = winnerSymbol ? msg.sender.userId : null;
          try { updateLeaderboard(nk, state); } catch(e) {}
          dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
        } else {
          // Next turn
          state.currentTurn = Object.keys(state.players).find(id => id !== msg.sender.userId)!;
          if (state.mode === 'timed') {
            state.turnDeadline = Date.now() + state.turnDurationSec * 1000;
          }
          dispatcher.broadcastMessage(OP_STATE_UPDATE, JSON.stringify(buildStatePayload(state)));
        }
      } catch (e) {
        logger.error(`Error processing move: ${e}`);
      }
    }
  }

  // 2. Timer enforcement (timed mode)
  if (state.mode === 'timed' && state.status === 'playing') {
    if (Date.now() > state.turnDeadline) {
      // Current player forfeits due to timeout
      const winnerId = Object.keys(state.players).find(id => id !== state.currentTurn);
      if (winnerId) {
        state.status = 'finished';
        state.winner = winnerId;
        try { updateLeaderboard(nk, state); } catch(e) {}
        dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
      }
    } else if (tick % 5 === 0) {
      // Broadcast timer update every second (since tickrate is 5)
      const remaining = Math.max(0, Math.ceil((state.turnDeadline - Date.now()) / 1000));
      dispatcher.broadcastMessage(OP_TIMER_UPDATE, JSON.stringify({ remaining }));
    }
  }

  // 3. Computer move execution
  if (state.mode === 'computer' && state.status === 'playing' && state.currentTurn === 'computer_id') {
    // Basic AI: Pick a random empty cell
    const emptyCells = state.board.map((v, i) => v === '' ? i : -1).filter(i => i !== -1);
    if (emptyCells.length > 0) {
      const cellIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      
      const symbol = state.players['computer_id'].symbol;
      state.board[cellIndex] = symbol;
      state.moveCount++;
      
      const winnerSymbol = checkWinner(state.board);
      if (winnerSymbol || state.moveCount === 9) {
        state.status = 'finished';
        state.winner = winnerSymbol ? 'computer_id' : null;
        try { updateLeaderboard(nk, state); } catch(e) { logger.error('Leaderboard error: ' + e); }
        dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
      } else {
        state.currentTurn = Object.keys(state.players).find(id => id !== 'computer_id')!;
        dispatcher.broadcastMessage(OP_STATE_UPDATE, JSON.stringify(buildStatePayload(state)));
      }
    }
  }

  return { state };
};

const matchTerminate: nkruntime.MatchTerminateFunction = (ctx, logger, nk, dispatcher, tick, state, graceful) => {
  return { state };
};

const matchSignal: nkruntime.MatchSignalFunction = (ctx, logger, nk, dispatcher, tick, state, data) => {
  return { state, data: "Received" };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = (ctx, logger, nk, dispatcher, tick, state, presence, metadata) => {
  return { state, accept: true };
};

export { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal };
