import { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal } from './match_handler';

function afterAuthenticateDevice(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, out: nkruntime.Session, inUser: nkruntime.AuthenticateDeviceRequest) {
  // Basic init if needed, though Nakama creates the account
}

function rpcCreatePrivateRoom(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) {
  try {
    let mode = 'classic';
    if (payload) {
      const parsed = JSON.parse(payload);
      if (parsed.mode === 'timed') mode = 'timed';
      else if (parsed.mode === 'computer') mode = 'computer';
    }
    const matchId = nk.matchCreate('tictactoe', { mode, private: true });
    return JSON.stringify({ matchId });
  } catch (e) {
      return JSON.stringify({ error: 'Failed to create private room' });
  }
}

function rpcSetDisplayName(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) {
  try {
    const parsed = JSON.parse(payload);
    if (parsed.name && ctx.userId) {
      nk.accountUpdateId(ctx.userId, null, parsed.name);
      return JSON.stringify({ success: true });
    }
  } catch(e) { }
  return JSON.stringify({ success: false });
}

function matchmakerMatched(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, matches: any[]) {
  const mode = matches[0].properties ? (matches[0].properties['mode'] || 'classic') : 'classic';
  const matchId = nk.matchCreate('tictactoe', { mode });
  return matchId;
}

export function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
  logger.info("Initializing Tic-Tac-Toe Nakama Module");

  initializer.registerMatch('tictactoe', {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal
  });

  initializer.registerMatchmakerMatched(matchmakerMatched);
  initializer.registerAfterAuthenticateDevice(afterAuthenticateDevice);
  initializer.registerRpc('createPrivateRoom', rpcCreatePrivateRoom);
  initializer.registerRpc('setDisplayName', rpcSetDisplayName);

  // Setup Leaderboard on module load
  try {
    nk.leaderboardCreate('tictactoe_global', true, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.BEST, null, null);
    logger.info("Leaderboard tictactoe_global created or verified.");
  } catch (e) {
    logger.error("Error creating leaderboard: " + e);
  }
}

export { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal, afterAuthenticateDevice, rpcCreatePrivateRoom, rpcSetDisplayName, matchmakerMatched };
