
import { MatchState } from './types';

export function updateLeaderboard(nk: nkruntime.Nakama, state: MatchState) {
  const winnerId = state.winner;
  const players = Object.entries(state.players);

  players.forEach(([userId, playerData]) => {
    if (userId === 'computer_id') return;

    const isWinner = userId === winnerId;
    const isDraw = state.winner === null;

    // Read current stats
    const records = nk.storageRead([{
      collection: 'player_stats', key: 'stats', userId
    }]);

    let stats = { wins: 0, losses: 0, draws: 0, winStreak: 0, totalGames: 0 };
    if (records.length > 0) {
      try {
        stats = JSON.parse(records[0].value);
      } catch (e) {
        // use default stats if parse fails
      }
    }

    stats.totalGames++;

    if (isWinner) {
      stats.wins++;
      stats.winStreak++;
    } else if (isDraw) {
      stats.draws++;
      stats.winStreak = 0;
    } else {
      stats.losses++;
      stats.winStreak = 0;
    }

    // Write back
    nk.storageWrite([{
      collection: 'player_stats', key: 'stats', userId,
      value: JSON.stringify(stats), permissionRead: 2, permissionWrite: 1
    }]);

    // Calculate score and update leaderboard
    const score = (stats.wins * 100) + (Math.min(stats.winStreak, 5) * 50) - (stats.losses * 10);
    nk.leaderboardRecordWrite('tictactoe_global', userId, playerData.displayName, score);
  });
}
