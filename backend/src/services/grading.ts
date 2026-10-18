import { prisma } from "./prisma";
import { sendMail } from "./mailer";

export type CoveringSide = "home" | "away" | "push";

export function determineCoveringSide(
  favoriteTeam: "home" | "away",
  spreadValue: number,
  homeScore: number,
  awayScore: number,
): CoveringSide {
  const favoriteScore = favoriteTeam === "home" ? homeScore : awayScore;
  const underdogScore = favoriteTeam === "home" ? awayScore : homeScore;
  const diff = favoriteScore - underdogScore - spreadValue;

  if (diff === 0) return "push";
  const favoriteCovers = diff > 0;
  if (favoriteCovers) return favoriteTeam;
  return favoriteTeam === "home" ? "away" : "home";
}

export async function gradePicksForGame(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return;

  if (game.status === "void") {
    await prisma.pick.updateMany({
      where: { gameId },
      data: { result: "void", pointsAwarded: 0 },
    });
    return;
  }

  if (
    game.status !== "final" ||
    game.homeScore === null ||
    game.awayScore === null ||
    game.favoriteTeam === null ||
    game.spreadValue === null
  ) {
    return;
  }

  const coveringSide = determineCoveringSide(
    game.favoriteTeam,
    game.spreadValue,
    game.homeScore,
    game.awayScore,
  );

  const picks = await prisma.pick.findMany({ where: { gameId } });
  await prisma.$transaction(
    picks.map((pick) => {
      const result = coveringSide === "push" ? "push" : pick.sideSelected === coveringSide ? "covered" : "not_covered";
      const pointsAwarded = result === "covered" ? pick.confidenceValue : 0;
      return prisma.pick.update({ where: { id: pick.id }, data: { result, pointsAwarded } });
    }),
  );
}

export async function checkAndGradeWeek(weekId: string): Promise<void> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      games: true,
      season: {
        include: {
          teamSeasonEntries: {
            include: { team: { include: { memberships: { include: { user: true } } } } },
          },
        },
      },
    },
  });
  if (!week || week.status !== "locked") return;

  const allDone = week.games.every((g) => g.status === "final" || g.status === "void");
  if (!allDone) return;

  await prisma.week.update({ where: { id: weekId }, data: { status: "graded" } });

  for (const entry of week.season.teamSeasonEntries) {
    for (const membership of entry.team.memberships) {
      await sendMail(
        membership.user.email,
        `${week.label} results are final`,
        `All games in ${week.label} are final. Check the standings to see how you did!`,
      ).catch(() => {});
    }
  }
}
