import { prisma } from "./prisma";

export async function requireCommissionerForLeague(leagueId: string, userId: string) {
  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
  });
  return membership?.role === "commissioner";
}

export async function getWeekWithLeagueId(weekId: string) {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: { season: true, games: { orderBy: { orderIndex: "asc" } } },
  });
  if (!week) return null;
  return { week, leagueId: week.season.leagueId };
}
