import { prisma } from "./prisma";

export interface GameDistribution {
  gameId: string;
  homeCount: number;
  awayCount: number;
  totalPicks: number;
}

export async function computePickDistribution(weekId: string): Promise<GameDistribution[]> {
  const games = await prisma.game.findMany({ where: { weekId }, select: { id: true } });
  const picks = await prisma.pick.findMany({
    where: { weekId },
    select: { gameId: true, sideSelected: true },
  });

  const counts = new Map<string, { home: number; away: number }>();
  for (const g of games) counts.set(g.id, { home: 0, away: 0 });
  for (const p of picks) {
    const c = counts.get(p.gameId);
    if (!c) continue;
    if (p.sideSelected === "home") c.home++;
    else c.away++;
  }

  return games.map((g) => {
    const c = counts.get(g.id)!;
    return { gameId: g.id, homeCount: c.home, awayCount: c.away, totalPicks: c.home + c.away };
  });
}
