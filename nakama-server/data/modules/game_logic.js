"use strict";
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
