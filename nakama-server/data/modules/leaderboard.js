"use strict";
function updateLeaderboard(nk, state) {
    var winnerId = state.winner;
    var players = Object.entries(state.players);
    players.forEach(function (_a) {
        var userId = _a[0], playerData = _a[1];
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
