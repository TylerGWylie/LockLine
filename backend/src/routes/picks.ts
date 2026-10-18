import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { putPicksSchema } from "../schemas/pick";
import { prisma } from "../services/prisma";
import { getTeamInLeague, getWeekWithLeagueId } from "../services/authorization";

export const picksRouter = Router();
picksRouter.use(requireAuth);

async function loadVersion(teamId: string, weekId: string): Promise<string | null> {
  const latest = await prisma.pick.findFirst({
    where: { teamId, weekId },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  return latest ? latest.updatedAt.toISOString() : null;
}

picksRouter.get("/:id/teams/:teamId/picks", async (req, res) => {
  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }

  const team = await getTeamInLeague(req.params.teamId, found.leagueId);
  if (!team) {
    res.status(404).json({ error: "Team not found in this league" });
    return;
  }
  if (!team.memberships.some((m) => m.userId === req.userId)) {
    res.status(403).json({ error: "You are not a member of this team" });
    return;
  }

  const picks = await prisma.pick.findMany({ where: { teamId: team.id, weekId: req.params.id } });
  res.json({ picks, version: await loadVersion(team.id, req.params.id) });
});

picksRouter.put("/:id/teams/:teamId/picks", async (req, res) => {
  const parsed = putPicksSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  const { week, leagueId } = found;

  const team = await getTeamInLeague(req.params.teamId, leagueId);
  if (!team) {
    res.status(404).json({ error: "Team not found in this league" });
    return;
  }
  if (!team.memberships.some((m) => m.userId === req.userId)) {
    res.status(403).json({ error: "You are not a member of this team" });
    return;
  }

  if (week.status === "draft") {
    res.status(409).json({ error: "This week hasn't been published yet" });
    return;
  }
  // Independent of the lock cron's status flip — this is the actual enforcement point.
  if (week.lockAt && new Date() >= week.lockAt) {
    res.status(409).json({ error: "Picks are locked for this week" });
    return;
  }

  const currentVersion = await loadVersion(team.id, req.params.id);
  if (currentVersion !== parsed.data.version) {
    res.status(409).json({
      error: "Someone else on your team just updated these picks. Reload and try again.",
      currentVersion,
    });
    return;
  }

  const gameIds = new Set(week.games.map((g) => g.id));
  const n = week.games.length;
  const seenGameIds = new Set<string>();
  const seenValues = new Set<number>();
  for (const p of parsed.data.picks) {
    if (!gameIds.has(p.gameId)) {
      res.status(400).json({ error: `Game ${p.gameId} is not part of this week` });
      return;
    }
    if (seenGameIds.has(p.gameId)) {
      res.status(400).json({ error: `Duplicate pick for game ${p.gameId}` });
      return;
    }
    seenGameIds.add(p.gameId);
    if (p.confidenceValue < 1 || p.confidenceValue > n) {
      res.status(400).json({ error: `Confidence value must be between 1 and ${n}` });
      return;
    }
    if (seenValues.has(p.confidenceValue)) {
      res.status(400).json({ error: `Confidence value ${p.confidenceValue} used more than once` });
      return;
    }
    seenValues.add(p.confidenceValue);
  }

  await prisma.$transaction([
    prisma.pick.deleteMany({ where: { teamId: team.id, weekId: req.params.id } }),
    ...parsed.data.picks.map((p) =>
      prisma.pick.create({
        data: {
          teamId: team.id,
          weekId: req.params.id,
          gameId: p.gameId,
          confidenceValue: p.confidenceValue,
          sideSelected: p.sideSelected,
          lastEditedByUserId: req.userId!,
        },
      }),
    ),
  ]);

  const picks = await prisma.pick.findMany({ where: { teamId: team.id, weekId: req.params.id } });
  res.json({ picks, version: await loadVersion(team.id, req.params.id) });
});
