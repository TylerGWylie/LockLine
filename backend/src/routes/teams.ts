import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { renameTeamSchema } from "../schemas/team";
import { prisma } from "../services/prisma";

export const teamsRouter = Router();
teamsRouter.use(requireAuth);

teamsRouter.get("/mine", async (req, res) => {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId: req.userId!, status: "active" },
    include: {
      team: {
        include: {
          league: { select: { id: true, name: true, inviteCode: true } },
          memberships: {
            where: { status: "active" },
            include: { user: { select: { id: true, displayName: true } } },
          },
        },
      },
    },
  });

  res.json(
    memberships.map((m) => ({
      ...m.team,
      leagueName: m.team.league.name,
      leagueInviteCode: m.team.league.inviteCode,
    })),
  );
});

teamsRouter.patch("/:teamId", async (req, res) => {
  const parsed = renameTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  if (team.createdByUserId !== req.userId) {
    res.status(403).json({ error: "Only the team's creator can rename it" });
    return;
  }

  const updated = await prisma.team.update({
    where: { id: team.id },
    data: { name: parsed.data.name },
  });
  res.json(updated);
});
