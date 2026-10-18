import { prisma } from "../services/prisma";
import { sendMail } from "../services/mailer";

export async function lockDueWeeks(): Promise<void> {
  const dueWeeks = await prisma.week.findMany({
    where: { status: "published", lockAt: { lte: new Date() } },
    include: {
      games: { orderBy: { orderIndex: "asc" } },
      season: {
        include: {
          teamSeasonEntries: {
            include: { team: { include: { memberships: { include: { user: true } } } } },
          },
        },
      },
    },
  });

  for (const week of dueWeeks) {
    const n = week.games.length;
    const allValues = Array.from({ length: n }, (_, i) => i + 1);
    const sortedGames = [...week.games].sort((a, b) => a.orderIndex - b.orderIndex);

    for (const entry of week.season.teamSeasonEntries) {
      const team = entry.team;
      const existingPicks = await prisma.pick.findMany({
        where: { teamId: team.id, weekId: week.id },
      });
      const usedValues = new Set(existingPicks.map((p) => p.confidenceValue));
      const pickedGameIds = new Set(existingPicks.map((p) => p.gameId));

      const missingGames = sortedGames.filter((g) => !pickedGameIds.has(g.id));
      const missingValues = allValues.filter((v) => !usedValues.has(v)).sort((a, b) => a - b);
      if (missingGames.length === 0) continue;

      await prisma.pick.createMany({
        data: missingGames.map((game, i) => ({
          teamId: team.id,
          weekId: week.id,
          gameId: game.id,
          confidenceValue: missingValues[i],
          sideSelected: game.favoriteTeam ?? "home",
        })),
      });
    }

    await prisma.week.update({ where: { id: week.id }, data: { status: "locked" } });

    for (const entry of week.season.teamSeasonEntries) {
      for (const membership of entry.team.memberships) {
        await sendMail(
          membership.user.email,
          `${week.label} picks are locked`,
          `Picks for ${week.label} are now locked. Good luck!`,
        ).catch(() => {});
      }
    }
  }
}
