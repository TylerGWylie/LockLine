import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createWeekSchema } from "../schemas/week";
import { prisma } from "../services/prisma";
import { isLeagueMember, requireCommissionerForLeague } from "../services/authorization";
import { computeSeasonStandings } from "../services/standings";

export const seasonsRouter = Router();
seasonsRouter.use(requireAuth);

seasonsRouter.get("/:id/weeks", async (req, res) => {
  const season = await prisma.season.findUnique({ where: { id: req.params.id } });
  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }

  const weeks = await prisma.week.findMany({
    where: { seasonId: season.id },
    orderBy: { weekNumber: "asc" },
  });
  res.json(weeks);
});

seasonsRouter.post("/:id/weeks", async (req, res) => {
  const parsed = createWeekSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const season = await prisma.season.findUnique({ where: { id: req.params.id } });
  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }

  const isCommissioner = await requireCommissionerForLeague(season.leagueId, req.userId!);
  if (!isCommissioner) {
    res.status(403).json({ error: "Only the commissioner can create a week" });
    return;
  }

  const existing = await prisma.week.findUnique({
    where: { seasonId_weekNumber: { seasonId: season.id, weekNumber: parsed.data.weekNumber } },
  });
  if (existing) {
    res.status(409).json({ error: "A week with that number already exists this season" });
    return;
  }

  const week = await prisma.week.create({
    data: { seasonId: season.id, weekNumber: parsed.data.weekNumber, label: parsed.data.label },
  });
  res.status(201).json(week);
});

seasonsRouter.get("/:id/standings", async (req, res) => {
  const season = await prisma.season.findUnique({ where: { id: req.params.id } });
  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }
  if (!(await isLeagueMember(season.leagueId, req.userId!))) {
    res.status(403).json({ error: "You are not a member of this league" });
    return;
  }

  res.json(await computeSeasonStandings(season.id));
});
