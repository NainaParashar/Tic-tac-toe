"use strict";
// Imports removed for Nakama module bundling
var matchInit = function (ctx, logger, nk, params) {
    var state = {
        board: Array(9).fill(''),
        players: {},
        currentTurn: '',
        moveCount: 0,
        status: 'waiting',
        winner: null,
        mode: params['mode'] === 'timed' ? 'timed' : 'classic',
        turnDeadline: 0,
        turnDurationSec: 30,
    };
    return { state: state, tickRate: 5, label: JSON.stringify({ mode: state.mode }) };
};
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach(function (p) {
        var symbol = Object.keys(state.players).length === 0 ? 'X' : 'O';
        state.players[p.userId] = { symbol: symbol, displayName: p.username, presence: p };
    });
    if (Object.keys(state.players).length === 2 && state.status === 'waiting') {
        state.status = 'playing';
        state.currentTurn = Object.keys(state.players)[0]; // First player goes first
        if (state.mode === 'timed') {
            state.turnDeadline = Date.now() + state.turnDurationSec * 1000;
        }
        dispatcher.broadcastMessage(OP_GAME_START, JSON.stringify(buildStatePayload(state)));
    }
    return { state: state };
};
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    if (state.status === 'playing') {
        // If someone leaves during a game, they forfeit
        var leaver_1 = presences[0];
        var winnerId = Object.keys(state.players).find(function (id) { return id !== leaver_1.userId; });
        if (winnerId) {
            state.status = 'finished';
            state.winner = winnerId;
            updateLeaderboard(nk, state);
            dispatcher.broadcastMessage(OP_PLAYER_DISCONNECTED, JSON.stringify({ leaverId: leaver_1.userId }));
            dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
        }
    }
    return { state: state };
};
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    if (state.status === 'finished' || Object.keys(state.players).length === 0) {
        return null; // Signals match termination
    }
    var _loop_1 = function (msg) {
        if (msg.opCode === OP_MAKE_MOVE) {
            try {
                var data = JSON.parse(nk.binaryToString(msg.data));
                var cellIndex = data.cellIndex;
                // Validation
                if (state.status !== 'playing')
                    return "continue";
                if (msg.sender.userId !== state.currentTurn)
                    return "continue";
                if (cellIndex < 0 || cellIndex > 8)
                    return "continue";
                if (state.board[cellIndex] !== '')
                    return "continue";
                // Apply move
                var symbol = state.players[msg.sender.userId].symbol;
                state.board[cellIndex] = symbol;
                state.moveCount++;
                // Check for finish
                var winnerSymbol = checkWinner(state.board);
                if (winnerSymbol || state.moveCount === 9) {
                    state.status = 'finished';
                    state.winner = winnerSymbol ? msg.sender.userId : null;
                    updateLeaderboard(nk, state);
                    dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
                }
                else {
                    // Next turn
                    state.currentTurn = Object.keys(state.players).find(function (id) { return id !== msg.sender.userId; });
                    if (state.mode === 'timed') {
                        state.turnDeadline = Date.now() + state.turnDurationSec * 1000;
                    }
                    dispatcher.broadcastMessage(OP_STATE_UPDATE, JSON.stringify(buildStatePayload(state)));
                }
            }
            catch (e) {
                logger.error("Error processing move: ".concat(e));
            }
        }
    };
    // 1. Process moves
    for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
        var msg = messages_1[_i];
        _loop_1(msg);
    }
    // 2. Timer enforcement (timed mode)
    if (state.mode === 'timed' && state.status === 'playing') {
        if (Date.now() > state.turnDeadline) {
            // Current player forfeits due to timeout
            var winnerId = Object.keys(state.players).find(function (id) { return id !== state.currentTurn; });
            if (winnerId) {
                state.status = 'finished';
                state.winner = winnerId;
                updateLeaderboard(nk, state);
                dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
            }
        }
        else if (tick % 5 === 0) {
            // Broadcast timer update every second (since tickrate is 5)
            var remaining = Math.max(0, Math.ceil((state.turnDeadline - Date.now()) / 1000));
            dispatcher.broadcastMessage(OP_TIMER_UPDATE, JSON.stringify({ remaining: remaining }));
        }
    }
    return { state: state };
};
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceful) {
    return { state: state };
};
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    return { state: state, data: "Received" };
};
