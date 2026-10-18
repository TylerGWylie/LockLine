import { prisma } from "./prisma";

export interface WhatIfGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  favoriteTeam: "home" | "away" | null;
  spreadValue: number | null;
  status: string;
  kickoffAt: string;
  orderIndex: number;
}

export interface WhatIfPick {
  gameId: string;
  confidenceValue: number;
  sideSelected: "home" | "away";
  result: string;
  pointsAwarded: number | null;
}

export interface WhatIfTeam {
  teamId: string;
  teamName: string;
  picks: WhatIfPick[];
  seasonPointsBeforeThisWeek: number;
}

export interface WhatIfData {
  weekId: string;
  games: WhatIfGame[];
  teams: WhatIfTeam[];
}

export async function getWhatIfData(weekId: string): Promise<WhatIfData | null> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      games: { orderBy: { orderIndex: "asc" } },
      season: { include: { teamSeasonEntries: { include: { team: true } } } },
    },
  });
  if (!week) return null;

  const teams = week.season.teamSeasonEntries.map((e) => e.team);

  const thisWeekPicks = await prisma.pick.findMany({ where: { weekId } });
  const otherWeeksPicks = await prisma.pick.findMany({
    where: { week: { seasonId: week.seasonId, id: { not: weekId } } },
    select: { teamId: true, pointsAwarded: true },
  });

  const priorSeasonPoints = new Map(teams.map((t) => [t.id, 0]));
  for (const p of otherWeeksPicks) {
    priorSeasonPoints.set(p.teamId, (priorSeasonPoints.get(p.teamId) ?? 0) + (p.pointsAwarded ?? 0));
  }

  const picksByTeam = new Map<string, WhatIfPick[]>();
  for (const p of thisWeekPicks) {
    const list = picksByTeam.get(p.teamId) ?? [];
    list.push({
      gameId: p.gameId,
      confidenceValue: p.confidenceValue,
      sideSelected: p.sideSelected,
      result: p.result,
      pointsAwarded: p.pointsAwarded,
    });
    picksByTeam.set(p.teamId, list);
  }

  return {
    weekId,
    games: week.games.map((g) => ({
      id: g.id,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      favoriteTeam: g.favoriteTeam,
      spreadValue: g.spreadValue,
      status: g.status,
      kickoffAt: g.kickoffAt.toISOString(),
      orderIndex: g.orderIndex,
    })),
    teams: teams.map((t) => ({
      teamId: t.id,
      teamName: t.name,
      picks: picksByTeam.get(t.id) ?? [],
      seasonPointsBeforeThisWeek: priorSeasonPoints.get(t.id) ?? 0,
    })),
  };
}
