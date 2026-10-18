import { Router } from "express";
import { prisma } from "../services/prisma";

// Deliberately NOT behind requireAuth — this powers the public "share link to join"
// landing page, which an unauthenticated visitor needs to be able to preview
// before they sign up or log in.
export const inviteRouter = Router();

inviteRouter.get("/:code", async (req, res) => {
  const league = await prisma.league.findUnique({ where: { inviteCode: req.params.code } });
  if (!league) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }

  const teams = await prisma.team.findMany({
    where: { leagueId: league.id },
    select: { id: true, name: true },
  });

  res.json({ id: league.id, name: league.name, teams });
});
