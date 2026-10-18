import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { addGamesSchema, correctLineSchema, lockOverrideSchema, setScoreSchema } from "../schemas/week";
import { prisma } from "../services/prisma";
import {
  getWeekWithLeagueId,
  isLeagueMember,
  requireCommissionerForLeague,
} from "../services/authorization";
import { getFreshSpreadsByExternalId, OddsEvent } from "../services/oddsApi";
import { checkAndGradeWeek, gradePicksForGame } from "../services/grading";
import { pollAndGradeScores } from "../jobs/gradeWeeks";
import { computeWeekStandings } from "../services/standings";
import { ensureHalfPointSpread } from "../utils/spread";
import { getWhatIfData } from "../services/whatif";

export const weeksRouter = Router();
weeksRouter.use(requireAuth);

weeksRouter.get("/:id", async (req, res) => {
  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  res.json(found.week);
});

weeksRouter.post("/:id/games", async (req, res) => {
  const parsed = addGamesSchema.safeParse(req.body);
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

  if (!(await requireCommissionerForLeague(leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can stage games" });
    return;
  }
  if (week.status !== "draft") {
    res.status(409).json({ error: "Games can only be added while the week is in draft" });
    return;
  }

  // Freeze each odds-API game's line right now, at pick time — not later at publish —
  // so the number the commissioner saw when choosing the game is the number that sticks.
  const oddsApiEntries = parsed.data.games.filter((g) => g.source === "odds_api");
  const bySport = new Map<string, string[]>();
  for (const g of oddsApiEntries) {
    const list = bySport.get(g.sportKey) ?? [];
    list.push(g.externalId);
    bySport.set(g.sportKey, list);
  }

  const freshBySportAndId = new Map<string, Map<string, OddsEvent>>();
  for (const [sportKey, externalIds] of bySport) {
    try {
      freshBySportAndId.set(sportKey, await getFreshSpreadsByExternalId(sportKey, externalIds));
    } catch (err) {
      res.status(502).json({ error: "Failed to fetch odds", detail: (err as Error).message });
      return;
    }
  }

  const failures: { externalId: string; homeTeam: string; awayTeam: string }[] = [];
  for (const g of oddsApiEntries) {
    const fresh = freshBySportAndId.get(g.sportKey)?.get(g.externalId);
    if (!fresh || fresh.favoriteTeam === null || fresh.spreadValue === null) {
      failures.push({ externalId: g.externalId, homeTeam: g.homeTeam, awayTeam: g.awayTeam });
    }
  }
  if (failures.length > 0) {
    res.status(409).json({
      error: "Could not resolve a current spread for one or more games. Nothing was added.",
      failures,
    });
    return;
  }

  const startIndex = week.games.length;
  const created = await prisma.$transaction(
    parsed.data.games.map((game, i) => {
      if (game.source === "manual") {
        return prisma.game.create({
          data: {
            weekId: week.id,
            sportKey: game.sportKey,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeConference: game.homeConference,
            awayConference: game.awayConference,
            kickoffAt: new Date(game.kickoffAt),
            orderIndex: startIndex + i,
            favoriteTeam: game.favoriteTeam,
            spreadValue: ensureHalfPointSpread(game.spreadValue),
            spreadSource: "manual",
            spreadCapturedAt: new Date(),
          },
        });
      }
      const fresh = freshBySportAndId.get(game.sportKey)!.get(game.externalId)!;
      return prisma.game.create({
        data: {
          weekId: week.id,
          externalId: game.externalId,
          sportKey: game.sportKey,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeConference: game.homeConference,
          awayConference: game.awayConference,
          kickoffAt: new Date(game.kickoffAt),
          orderIndex: startIndex + i,
          favoriteTeam: fresh.favoriteTeam,
          spreadValue: ensureHalfPointSpread(fresh.spreadValue!),
          spreadSource: "odds_api",
          spreadBookmakerKey: fresh.spreadBookmakerKey,
          spreadCapturedAt: new Date(),
        },
      });
    }),
  );

  res.status(201).json(created);
});

weeksRouter.delete("/:id/games/:gameId", async (req, res) => {
  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  const { week, leagueId } = found;

  if (!(await requireCommissionerForLeague(leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can remove games" });
    return;
  }
  if (week.status !== "draft") {
    res.status(409).json({ error: "Games can only be removed while the week is in draft" });
    return;
  }

  await prisma.game.deleteMany({ where: { id: req.params.gameId, weekId: week.id } });
  res.status(204).send();
});

weeksRouter.post("/:id/publish", async (req, res) => {
  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  const { week, leagueId } = found;

  if (!(await requireCommissionerForLeague(leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can publish the week" });
    return;
  }
  if (week.status !== "draft") {
    res.status(409).json({ error: "Week has already been published" });
    return;
  }
  if (week.games.length === 0) {
    res.status(400).json({ error: "Add at least one game before publishing" });
    return;
  }

  // Every game's line was already frozen when it was staged (see POST /:id/games).
  // Publish is just a status transition — this is a defense-in-depth check, not a refetch.
  const missingSpread = week.games.filter((g) => g.favoriteTeam === null || g.spreadValue === null);
  if (missingSpread.length > 0) {
    res.status(409).json({
      error: "Some games are missing a frozen spread. Remove and re-add them, then try again.",
      gameIds: missingSpread.map((g) => g.id),
    });
    return;
  }

  const lockAt = week.games.reduce(
    (min, g) => (g.kickoffAt < min ? g.kickoffAt : min),
    week.games[0].kickoffAt,
  );

  await prisma.week.update({
    where: { id: week.id },
    data: { status: "published", publishedAt: new Date(), lockAt },
  });

  const updated = await getWeekWithLeagueId(week.id);
  res.json(updated!.week);
});

weeksRouter.patch("/:id/games/:gameId/correct-line", async (req, res) => {
  const parsed = correctLineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  const { leagueId } = found;

  if (!(await requireCommissionerForLeague(leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can correct a line" });
    return;
  }

  const game = await prisma.game.findFirst({
    where: { id: req.params.gameId, weekId: req.params.id },
  });
  if (!game) {
    res.status(404).json({ error: "Game not found in this week" });
    return;
  }
  if (game.status === "final" || game.status === "void") {
    res.status(409).json({ error: "Cannot correct the line for a graded or voided game" });
    return;
  }

  const { favoriteTeam, reason } = parsed.data;
  const spreadValue = ensureHalfPointSpread(parsed.data.spreadValue);
  await prisma.$transaction([
    prisma.spreadCorrection.create({
      data: {
        gameId: game.id,
        previousFavorite: game.favoriteTeam,
        previousValue: game.spreadValue,
        newFavorite: favoriteTeam,
        newValue: spreadValue,
        changedByUserId: req.userId!,
        reason,
      },
    }),
    prisma.game.update({
      where: { id: game.id },
      data: { favoriteTeam, spreadValue, spreadSource: "manual", spreadCapturedAt: new Date() },
    }),
  ]);

  res.status(204).send();
});

weeksRouter.patch("/:id/lock-override", async (req, res) => {
  const parsed = lockOverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  const { leagueId } = found;

  if (!(await requireCommissionerForLeague(leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can override the lock time" });
    return;
  }

  const week = await prisma.week.update({
    where: { id: req.params.id },
    data: { lockAt: new Date(parsed.data.lockAt), lockOverrideAt: new Date() },
  });
  res.json(week);
});

weeksRouter.patch("/:id/games/:gameId/score", async (req, res) => {
  const parsed = setScoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  if (!(await requireCommissionerForLeague(found.leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can enter scores" });
    return;
  }

  const game = await prisma.game.findFirst({ where: { id: req.params.gameId, weekId: req.params.id } });
  if (!game) {
    res.status(404).json({ error: "Game not found in this week" });
    return;
  }
  if (game.status === "void") {
    res.status(409).json({ error: "This game has been voided and can't be scored" });
    return;
  }

  await prisma.game.update({
    where: { id: game.id },
    data: { homeScore: parsed.data.homeScore, awayScore: parsed.data.awayScore, status: "final" },
  });
  await gradePicksForGame(game.id);
  await checkAndGradeWeek(req.params.id);

  res.status(204).send();
});

weeksRouter.patch("/:id/games/:gameId/void", async (req, res) => {
  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  if (!(await requireCommissionerForLeague(found.leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can void a game" });
    return;
  }

  const game = await prisma.game.findFirst({ where: { id: req.params.gameId, weekId: req.params.id } });
  if (!game) {
    res.status(404).json({ error: "Game not found in this week" });
    return;
  }

  await prisma.game.update({ where: { id: game.id }, data: { status: "void" } });
  await gradePicksForGame(game.id);
  await checkAndGradeWeek(req.params.id);

  res.status(204).send();
});

weeksRouter.post("/:id/refresh-scores", async (req, res) => {
  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  if (!(await requireCommissionerForLeague(found.leagueId, req.userId!))) {
    res.status(403).json({ error: "Only the commissioner can refresh scores" });
    return;
  }

  await pollAndGradeScores();
  const updated = await getWeekWithLeagueId(req.params.id);
  res.json(updated!.week);
});

weeksRouter.get("/:id/standings", async (req, res) => {
  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  if (!(await isLeagueMember(found.leagueId, req.userId!))) {
    res.status(403).json({ error: "You are not a member of this league" });
    return;
  }

  res.json(await computeWeekStandings(req.params.id));
});

weeksRouter.get("/:id/whatif-data", async (req, res) => {
  const found = await getWeekWithLeagueId(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  if (!(await isLeagueMember(found.leagueId, req.userId!))) {
    res.status(403).json({ error: "You are not a member of this league" });
    return;
  }

  res.json(await getWhatIfData(req.params.id));
});
