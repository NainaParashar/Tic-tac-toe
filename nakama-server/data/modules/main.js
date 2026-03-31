"use strict";
function InitModule(ctx, logger, nk, initializer) {
    logger.info("Initializing Tic-Tac-Toe Nakama Module");
    initializer.registerMatch('tictactoe', {
        matchInit: matchInit,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });
    initializer.registerAfterAuthenticateDevice(function (ctx, logger, nk, out, inUser) {
        // Basic init if needed, though Nakama creates the account
    });
    initializer.registerRpc('createPrivateRoom', function (ctx, logger, nk, payload) {
        try {
            var mode = 'classic';
            if (payload) {
                var parsed = JSON.parse(payload);
                if (parsed.mode === 'timed')
                    mode = 'timed';
            }
            var matchId = nk.matchCreate('tictactoe', { mode: mode, private: true });
            return JSON.stringify({ matchId: matchId });
        }
        catch (e) {
            return JSON.stringify({ error: 'Failed to create private room' });
        }
    });
    initializer.registerRpc('setDisplayName', function (ctx, logger, nk, payload) {
        try {
            var parsed = JSON.parse(payload);
            if (parsed.name && ctx.userId) {
                nk.accountUpdateId(ctx.userId, null, parsed.name);
                return JSON.stringify({ success: true });
            }
        }
        catch (e) { }
        return JSON.stringify({ success: false });
    });
    // Setup Leaderboard on module load
    try {
        nk.leaderboardCreate('tictactoe_global', true, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.BEST, null, null);
        logger.info("Leaderboard tictactoe_global created or verified.");
    }
    catch (e) {
        logger.error("Error creating leaderboard: " + e);
    }
}
