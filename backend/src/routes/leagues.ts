import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createLeagueSchema, createTeamSchema, joinLeagueSchema } from "../schemas/league";
import { getCurrentWeekForLeague } from "../services/currentWeek";
import { prisma } from "../services/prisma";
import { generateInviteCode } from "../utils/inviteCode";
import { generateSeasonWeeks } from "../utils/seasonWeeks";

export const leaguesRouter = Router();
leaguesRouter.use(requireAuth);

async function getCurrentSeason(leagueId: string) {
  return prisma.season.findFirst({
    where: { leagueId, status: { not: "complete" } },
    orderBy: { label: "desc" },
  });
}

leaguesRouter.post("/", async (req, res) => {
  const parsed = createLeagueSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, seasonLabel } = parsed.data;

  const league = await prisma.league.create({
    data: {
      name,
      inviteCode: generateInviteCode(),
      memberships: { create: { userId: req.userId!, role: "commissioner" } },
      seasons: { create: { label: seasonLabel, status: "active" } },
    },
    include: { seasons: true },
  });

  const seasonYear = Number.parseInt(seasonLabel, 10);
  const generatedWeeks = generateSeasonWeeks(
    Number.isNaN(seasonYear) ? new Date().getFullYear() : seasonYear,
  );
  await prisma.week.createMany({
    data: generatedWeeks.map((w) => ({
      seasonId: league.seasons[0].id,
      weekNumber: w.weekNumber,
      label: w.label,
      startDate: w.startDate,
      endDate: w.endDate,
    })),
  });

  res.status(201).json(league);
});

leaguesRouter.get("/mine", async (req, res) => {
  const memberships = await prisma.leagueMembership.findMany({
    where: { userId: req.userId! },
    include: { league: true },
  });
  res.json(memberships.map((m) => ({ ...m.league, role: m.role })));
});

leaguesRouter.get("/:id", async (req, res) => {
  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId: req.params.id, userId: req.userId! } },
  });
  if (!membership) {
    res.status(403).json({ error: "You are not a member of this league" });
    return;
  }

  const league = await prisma.league.findUnique({
    where: { id: req.params.id },
    include: { seasons: true },
  });
  if (!league) {
    res.status(404).json({ error: "League not found" });
    return;
  }

  res.json({ ...league, role: membership.role });
});

leaguesRouter.get("/:id/current-week", async (req, res) => {
  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId: req.params.id, userId: req.userId! } },
  });
  if (!membership) {
    res.status(403).json({ error: "You are not a member of this league" });
    return;
  }

  const week = await getCurrentWeekForLeague(req.params.id);
  if (!week) {
    res.status(404).json({ error: "No weeks have been created yet" });
    return;
  }
  res.json(week);
});

leaguesRouter.post("/:id/invite-code/rotate", async (req, res) => {
  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId: req.params.id, userId: req.userId! } },
  });
  if (!membership || membership.role !== "commissioner") {
    res.status(403).json({ error: "Only the commissioner can rotate the invite code" });
    return;
  }

  const league = await prisma.league.update({
    where: { id: req.params.id },
    data: { inviteCode: generateInviteCode() },
  });
  res.json({ inviteCode: league.inviteCode });
});

leaguesRouter.post("/join", async (req, res) => {
  const parsed = joinLeagueSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const league = await prisma.league.findUnique({ where: { inviteCode: parsed.data.inviteCode } });
  if (!league) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }

  const membership = await prisma.leagueMembership.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId: req.userId! } },
    create: { leagueId: league.id, userId: req.userId!, role: "member" },
    update: {},
  });

  res.status(201).json({ league, role: membership.role });
});

leaguesRouter.get("/:id/teams", async (req, res) => {
  const season = await getCurrentSeason(req.params.id);
  if (!season) {
    res.json([]);
    return;
  }

  const teams = await prisma.team.findMany({
    where: { leagueId: req.params.id, seasonEntries: { some: { seasonId: season.id } } },
    include: {
      memberships: {
        where: { status: "active" },
        include: { user: { select: { id: true, displayName: true } } },
      },
    },
  });

  const myMemberships = await prisma.teamMembership.findMany({
    where: { userId: req.userId!, teamId: { in: teams.map((t) => t.id) } },
    select: { teamId: true, status: true },
  });
  const myStatusByTeam = new Map(myMemberships.map((m) => [m.teamId, m.status]));

  res.json(teams.map((t) => ({ ...t, myStatus: myStatusByTeam.get(t.id) ?? null })));
});

leaguesRouter.post("/:id/teams", async (req, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId: req.params.id, userId: req.userId! } },
  });
  if (!membership) {
    res.status(403).json({ error: "You must join this league before creating a team" });
    return;
  }

  const season = await getCurrentSeason(req.params.id);
  if (!season) {
    res.status(409).json({ error: "This league has no active season yet" });
    return;
  }

  const team = await prisma.team.create({
    data: {
      leagueId: req.params.id,
      name: parsed.data.name,
      createdByUserId: req.userId!,
      seasonEntries: { create: { seasonId: season.id } },
      memberships: { create: { userId: req.userId!, status: "active" } },
    },
  });

  res.status(201).json(team);
});

leaguesRouter.post("/:id/teams/:teamId/join", async (req, res) => {
  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId: req.params.id, userId: req.userId! } },
  });
  if (!membership) {
    res.status(403).json({ error: "You must join this league before requesting to join a team" });
    return;
  }

  const team = await prisma.team.findFirst({ where: { id: req.params.teamId, leagueId: req.params.id } });
  if (!team) {
    res.status(404).json({ error: "Team not found in this league" });
    return;
  }

  const existing = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: req.userId! } },
  });
  if (existing?.status === "active") {
    res.status(409).json({ error: "You're already on this team" });
    return;
  }
  if (existing?.status === "pending") {
    res.status(409).json({ error: "Your request to join is already pending approval" });
    return;
  }

  await prisma.teamMembership.create({
    data: { teamId: team.id, userId: req.userId!, status: "pending" },
  });

  res.status(202).json({ status: "pending" });
});

leaguesRouter.get("/:id/teams/:teamId/join-requests", async (req, res) => {
  const team = await prisma.team.findFirst({ where: { id: req.params.teamId, leagueId: req.params.id } });
  if (!team) {
    res.status(404).json({ error: "Team not found in this league" });
    return;
  }
  if (team.createdByUserId !== req.userId) {
    res.status(403).json({ error: "Only the team's creator can view join requests" });
    return;
  }

  const requests = await prisma.teamMembership.findMany({
    where: { teamId: team.id, status: "pending" },
    include: { user: { select: { id: true, displayName: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
  res.json(requests);
});

leaguesRouter.post("/:id/teams/:teamId/join-requests/:userId/approve", async (req, res) => {
  const team = await prisma.team.findFirst({ where: { id: req.params.teamId, leagueId: req.params.id } });
  if (!team) {
    res.status(404).json({ error: "Team not found in this league" });
    return;
  }
  if (team.createdByUserId !== req.userId) {
    res.status(403).json({ error: "Only the team's creator can approve join requests" });
    return;
  }

  const result = await prisma.teamMembership.updateMany({
    where: { teamId: team.id, userId: req.params.userId, status: "pending" },
    data: { status: "active" },
  });
  if (result.count === 0) {
    res.status(404).json({ error: "No pending request for this user" });
    return;
  }

  res.status(204).send();
});

leaguesRouter.post("/:id/teams/:teamId/join-requests/:userId/reject", async (req, res) => {
  const team = await prisma.team.findFirst({ where: { id: req.params.teamId, leagueId: req.params.id } });
  if (!team) {
    res.status(404).json({ error: "Team not found in this league" });
    return;
  }
  if (team.createdByUserId !== req.userId) {
    res.status(403).json({ error: "Only the team's creator can reject join requests" });
    return;
  }

  await prisma.teamMembership.deleteMany({
    where: { teamId: team.id, userId: req.params.userId, status: "pending" },
  });

  res.status(204).send();
});
