'use strict';

var module = { exports: {} }; var exports = module.exports;

// OpCodes for real-time messages
var OP_MAKE_MOVE = 1;
var OP_STATE_UPDATE = 2;
var OP_GAME_START = 3;
var OP_GAME_OVER = 4;
var OP_PLAYER_DISCONNECTED = 5;
var OP_TIMER_UPDATE = 6;

function checkWinner(board) {
    var lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6] // diagonals
    ];
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var _a = lines_1[_i], a = _a[0], b = _a[1], c = _a[2];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}
function buildStatePayload(state) {
    var playersForPayload = {};
    for (var _i = 0, _a = Object.entries(state.players); _i < _a.length; _i++) {
        var _b = _a[_i], id = _b[0], p = _b[1];
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

function updateLeaderboard(nk, state) {
    var winnerId = state.winner;
    var players = Object.entries(state.players);
    players.forEach(function (_a) {
        var userId = _a[0], playerData = _a[1];
        if (userId === 'computer_id')
            return;
        var isWinner = userId === winnerId;
        var isDraw = state.winner === null;
        // Read current stats
        var records = nk.storageRead([{
                collection: 'player_stats', key: 'stats',
                userId: userId
            }]);
        var stats = { wins: 0, losses: 0, draws: 0, winStreak: 0, totalGames: 0 };
        if (records.length > 0) {
            try {
                stats = JSON.parse(records[0].value);
            }
            catch (e) {
                // use default stats if parse fails
            }
        }
        stats.totalGames++;
        if (isWinner) {
            stats.wins++;
            stats.winStreak++;
        }
        else if (isDraw) {
            stats.draws++;
            stats.winStreak = 0;
        }
        else {
            stats.losses++;
            stats.winStreak = 0;
        }
        // Write back
        nk.storageWrite([{
                collection: 'player_stats', key: 'stats',
                userId: userId,
                value: JSON.stringify(stats), permissionRead: 2, permissionWrite: 1
            }]);
        // Calculate score and update leaderboard
        var score = (stats.wins * 100) + (Math.min(stats.winStreak, 5) * 50) - (stats.losses * 10);
        nk.leaderboardRecordWrite('tictactoe_global', userId, playerData.displayName, score);
    });
}

var matchInit = function (ctx, logger, nk, params) {
    var state = {
        board: Array(9).fill(''),
        players: {},
        currentTurn: '',
        moveCount: 0,
        status: 'waiting',
        winner: null,
        mode: (params['mode'] === 'timed') ? 'timed' : (params['mode'] === 'computer' ? 'computer' : 'classic'),
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
    if (state.mode === 'computer' && Object.keys(state.players).length === 1 && state.status === 'waiting') {
        var symbol = state.players[presences[0].userId].symbol === 'X' ? 'O' : 'X';
        // Use 'computer_id' as the internal userId for the bot
        state.players['computer_id'] = { symbol: symbol, displayName: 'Computer', presence: null };
    }
    if (Object.keys(state.players).length === 2 && state.status === 'waiting') {
        state.status = 'playing';
        state.currentTurn = Object.keys(state.players).find(function (id) { return id !== 'computer_id'; }) || Object.keys(state.players)[0]; // Human goes first
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
            try {
                updateLeaderboard(nk, state);
            }
            catch (e) { }
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
                    try {
                        updateLeaderboard(nk, state);
                    }
                    catch (e) { }
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
                try {
                    updateLeaderboard(nk, state);
                }
                catch (e) { }
                dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
            }
        }
        else if (tick % 5 === 0) {
            // Broadcast timer update every second (since tickrate is 5)
            var remaining = Math.max(0, Math.ceil((state.turnDeadline - Date.now()) / 1000));
            dispatcher.broadcastMessage(OP_TIMER_UPDATE, JSON.stringify({ remaining: remaining }));
        }
    }
    // 3. Computer move execution
    if (state.mode === 'computer' && state.status === 'playing' && state.currentTurn === 'computer_id') {
        // Basic AI: Pick a random empty cell
        var emptyCells = state.board.map(function (v, i) { return v === '' ? i : -1; }).filter(function (i) { return i !== -1; });
        if (emptyCells.length > 0) {
            var cellIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            var symbol = state.players['computer_id'].symbol;
            state.board[cellIndex] = symbol;
            state.moveCount++;
            var winnerSymbol = checkWinner(state.board);
            if (winnerSymbol || state.moveCount === 9) {
                state.status = 'finished';
                state.winner = winnerSymbol ? 'computer_id' : null;
                try {
                    updateLeaderboard(nk, state);
                }
                catch (e) {
                    logger.error('Leaderboard error: ' + e);
                }
                dispatcher.broadcastMessage(OP_GAME_OVER, JSON.stringify(buildStatePayload(state)));
            }
            else {
                state.currentTurn = Object.keys(state.players).find(function (id) { return id !== 'computer_id'; });
                dispatcher.broadcastMessage(OP_STATE_UPDATE, JSON.stringify(buildStatePayload(state)));
            }
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
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    return { state: state, accept: true };
};

function afterAuthenticateDevice(ctx, logger, nk, out, inUser) {
    // Basic init if needed, though Nakama creates the account
}
function rpcCreatePrivateRoom(ctx, logger, nk, payload) {
    try {
        var mode = 'classic';
        if (payload) {
            var parsed = JSON.parse(payload);
            if (parsed.mode === 'timed')
                mode = 'timed';
            else if (parsed.mode === 'computer')
                mode = 'computer';
        }
        var matchId = nk.matchCreate('tictactoe', { mode: mode, private: true });
        return JSON.stringify({ matchId: matchId });
    }
    catch (e) {
        return JSON.stringify({ error: 'Failed to create private room' });
    }
}
function rpcSetDisplayName(ctx, logger, nk, payload) {
    try {
        var parsed = JSON.parse(payload);
        if (parsed.name && ctx.userId) {
            nk.accountUpdateId(ctx.userId, null, parsed.name);
            return JSON.stringify({ success: true });
        }
    }
    catch (e) { }
    return JSON.stringify({ success: false });
}
function matchmakerMatched(ctx, logger, nk, matches) {
    var mode = matches[0].properties ? (matches[0].properties['mode'] || 'classic') : 'classic';
    var matchId = nk.matchCreate('tictactoe', { mode: mode });
    return matchId;
}
function InitModule(ctx, logger, nk, initializer) {
    logger.info("Initializing Tic-Tac-Toe Nakama Module");
    initializer.registerMatch('tictactoe', {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });
    initializer.registerMatchmakerMatched(matchmakerMatched);
    initializer.registerAfterAuthenticateDevice(afterAuthenticateDevice);
    initializer.registerRpc('createPrivateRoom', rpcCreatePrivateRoom);
    initializer.registerRpc('setDisplayName', rpcSetDisplayName);
    // Setup Leaderboard on module load
    try {
        nk.leaderboardCreate('tictactoe_global', true, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.BEST, null, null);
        logger.info("Leaderboard tictactoe_global created or verified.");
    }
    catch (e) {
        logger.error("Error creating leaderboard: " + e);
    }
}

exports.InitModule = InitModule;
exports.afterAuthenticateDevice = afterAuthenticateDevice;
exports.matchInit = matchInit;
exports.matchJoin = matchJoin;
exports.matchJoinAttempt = matchJoinAttempt;
exports.matchLeave = matchLeave;
exports.matchLoop = matchLoop;
exports.matchSignal = matchSignal;
exports.matchTerminate = matchTerminate;
exports.matchmakerMatched = matchmakerMatched;
exports.rpcCreatePrivateRoom = rpcCreatePrivateRoom;
exports.rpcSetDisplayName = rpcSetDisplayName;
