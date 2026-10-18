import { prisma } from "../services/prisma";
import { getScores } from "../services/oddsApi";
import { checkAndGradeWeek, gradePicksForGame } from "../services/grading";

export async function pollAndGradeScores(): Promise<void> {
  const pendingGames = await prisma.game.findMany({
    where: {
      status: { in: ["scheduled", "in_progress"] },
      kickoffAt: { lt: new Date() },
      externalId: { not: null },
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
      scores = await getScores(sportKey);
    } catch (err) {
      console.error(`Failed to fetch scores for ${sportKey}`, err);
      continue;
    }

    for (const game of games) {
      const score = scores.get(game.externalId!);
      if (!score) continue;

      if (score.completed && score.homeScore !== null && score.awayScore !== null) {
        await prisma.game.update({
          where: { id: game.id },
          data: { homeScore: score.homeScore, awayScore: score.awayScore, status: "final" },
        });
        await gradePicksForGame(game.id);
        affectedWeekIds.add(game.weekId);
      } else if (score.homeScore !== null || score.awayScore !== null) {
        await prisma.game.update({
          where: { id: game.id },
          data: { homeScore: score.homeScore, awayScore: score.awayScore, status: "in_progress" },
        });
      }
    }
  }

  for (const weekId of affectedWeekIds) {
    await checkAndGradeWeek(weekId);
  }
}
