import { prisma } from "./prisma";

export interface WeekStandingRow {
  teamId: string;
  teamName: string;
  points: number;
  pointsPossible: number;
}

export interface SeasonStandingRow {
  teamId: string;
  teamName: string;
  points: number;
}

async function getSeasonTeams(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { teamSeasonEntries: { include: { team: true } } },
  });
  return season?.teamSeasonEntries.map((e) => e.team) ?? [];
}

export async function computeWeekStandings(weekId: string): Promise<WeekStandingRow[]> {
  const week = await prisma.week.findUnique({ where: { id: weekId } });
  if (!week) return [];

  const teams = await getSeasonTeams(week.seasonId);
  const picks = await prisma.pick.findMany({
    where: { weekId },
    include: { game: { select: { status: true } } },
  });

  const points = new Map(teams.map((t) => [t.id, 0]));
  const possible = new Map(teams.map((t) => [t.id, 0]));
  for (const pick of picks) {
    points.set(pick.teamId, (points.get(pick.teamId) ?? 0) + (pick.pointsAwarded ?? 0));
    if (pick.game.status !== "void") {
      possible.set(pick.teamId, (possible.get(pick.teamId) ?? 0) + pick.confidenceValue);
    }
  }

  return teams
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      points: points.get(t.id) ?? 0,
      pointsPossible: possible.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);
}

export async function computeSeasonStandings(seasonId: string): Promise<SeasonStandingRow[]> {
  const teams = await getSeasonTeams(seasonId);
  const picks = await prisma.pick.findMany({
    where: { week: { seasonId } },
    select: { teamId: true, pointsAwarded: true },
  });

  const points = new Map(teams.map((t) => [t.id, 0]));
  for (const pick of picks) {
    points.set(pick.teamId, (points.get(pick.teamId) ?? 0) + (pick.pointsAwarded ?? 0));
  }

  return teams
    .map((t) => ({ teamId: t.id, teamName: t.name, points: points.get(t.id) ?? 0 }))
    .sort((a, b) => b.points - a.points);
}
