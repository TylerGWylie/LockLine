import { prisma } from "./prisma";

export async function requireCommissionerForLeague(leagueId: string, userId: string) {
  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
  });
  return membership?.role === "commissioner";
}

export async function isLeagueMember(leagueId: string, userId: string) {
  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
  });
  return membership !== null;
}

export async function getWeekWithLeagueId(weekId: string) {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: { season: true, games: { orderBy: { orderIndex: "asc" } } },
  });
  if (!week) return null;
  return { week, leagueId: week.season.leagueId };
}

export async function getTeamInLeague(teamId: string, leagueId: string) {
  return prisma.team.findFirst({
    where: { id: teamId, leagueId },
    include: { memberships: true },
  });
}
