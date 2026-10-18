import { prisma } from "./prisma";

export async function getCurrentWeekForLeague(leagueId: string, now = new Date()) {
  const season = await prisma.season.findFirst({
    where: { leagueId, status: { not: "complete" } },
    orderBy: { label: "desc" },
  });
  if (!season) return null;

  const weeks = await prisma.week.findMany({
    where: { seasonId: season.id },
    include: { games: { orderBy: { orderIndex: "asc" } } },
    orderBy: { weekNumber: "asc" },
  });
  if (weeks.length === 0) return null;

  const inWindow = weeks.find((w) => w.startDate <= now && now < w.endDate);
  if (inWindow) return inWindow;

  const upcoming = weeks.filter((w) => w.startDate > now).sort((a, b) => a.weekNumber - b.weekNumber)[0];
  if (upcoming) return upcoming;

  return [...weeks].reverse()[0];
}
