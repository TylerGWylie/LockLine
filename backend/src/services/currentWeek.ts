import { prisma } from "./prisma";

// League weeks run Thursday through the following Wednesday (UTC).
function getThursdayWindow(now: Date): { start: Date; end: Date } {
  const day = now.getUTCDay(); // 0=Sun .. 4=Thu .. 6=Sat
  const daysSinceThursday = (day - 4 + 7) % 7;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceThursday),
  );
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

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

  const { start, end } = getThursdayWindow(now);

  const inWindow = weeks.find((w) => w.games.some((g) => g.kickoffAt >= start && g.kickoffAt < end));
  if (inWindow) return inWindow;

  const upcoming = weeks
    .filter((w) => w.games.some((g) => g.kickoffAt >= now))
    .sort(
      (a, b) =>
        Math.min(...a.games.map((g) => g.kickoffAt.getTime())) -
        Math.min(...b.games.map((g) => g.kickoffAt.getTime())),
    )[0];
  if (upcoming) return upcoming;

  const past = [...weeks].reverse().find((w) => w.games.length > 0);
  return past ?? weeks[weeks.length - 1];
}
