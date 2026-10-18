import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createWeekSchema } from "../schemas/week";
import { prisma } from "../services/prisma";
import { isLeagueMember, requireCommissionerForLeague } from "../services/authorization";
import { computeSeasonStandings } from "../services/standings";
import { generateSeasonWeeks } from "../utils/seasonWeeks";

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

// Backfills the auto-generated weeks for a season that predates (or otherwise ended up
// missing) that slate — e.g. a league created before auto-generation shipped. Only creates
// weekNumbers that don't already exist, so it's safe to call on a season that already has some.
seasonsRouter.post("/:id/generate-weeks", async (req, res) => {
  const season = await prisma.season.findUnique({ where: { id: req.params.id } });
  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }

  if (!(await requireCommissionerForLeague(season.leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can generate weeks" });
    return;
  }

  const existingWeeks = await prisma.week.findMany({
    where: { seasonId: season.id },
    select: { weekNumber: true },
  });
  const existingNumbers = new Set(existingWeeks.map((w) => w.weekNumber));

  const seasonYear = Number.parseInt(season.label, 10);
  const generatedWeeks = generateSeasonWeeks(Number.isNaN(seasonYear) ? new Date().getFullYear() : seasonYear);
  const missing = generatedWeeks.filter((w) => !existingNumbers.has(w.weekNumber));

  if (missing.length > 0) {
    await prisma.week.createMany({
      data: missing.map((w) => ({
        seasonId: season.id,
        weekNumber: w.weekNumber,
        label: w.label,
        startDate: w.startDate,
        endDate: w.endDate,
      })),
    });
  }

  const weeks = await prisma.week.findMany({ where: { seasonId: season.id }, orderBy: { weekNumber: "asc" } });
  res.json(weeks);
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
