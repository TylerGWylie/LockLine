import { prisma } from "../services/prisma";
import { findMatchingScore, getEspnScoresBySport } from "../services/espnApi";
import { checkAndGradeWeek, gradePicksForGame } from "../services/grading";

export async function pollAndGradeScores(): Promise<void> {
  const pendingGames = await prisma.game.findMany({
    where: {
      status: { in: ["scheduled", "in_progress"] },
      kickoffAt: { lt: new Date() },
    },
  });
  if (pendingGames.length === 0) return;

  const bySport = new Map<string, typeof pendingGames>();
  for (const g of pendingGames) {
    const list = bySport.get(g.sportKey) ?? [];
    list.push(g);
    bySport.set(g.sportKey, list);
  }

  const affectedWeekIds = new Set<string>();

  for (const [sportKey, games] of bySport) {
    let scores;
    try {
      scores = await getEspnScoresBySport(sportKey);
    } catch (err) {
      console.error(`Failed to fetch ESPN scores for ${sportKey}`, err);
      continue;
    }

    for (const game of games) {
      const match = findMatchingScore(scores, game.homeTeam, game.awayTeam);
      if (!match) continue;

      if (match.completed && match.homeScore !== null && match.awayScore !== null) {
        await prisma.game.update({
          where: { id: game.id },
          data: { homeScore: match.homeScore, awayScore: match.awayScore, status: "final" },
        });
        await gradePicksForGame(game.id);
        affectedWeekIds.add(game.weekId);
      } else if (match.homeScore !== null || match.awayScore !== null) {
        await prisma.game.update({
          where: { id: game.id },
          data: { homeScore: match.homeScore, awayScore: match.awayScore, status: "in_progress" },
        });
      }
    }
  }

  for (const weekId of affectedWeekIds) {
    await checkAndGradeWeek(weekId);
  }
}
