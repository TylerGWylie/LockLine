import { z } from "zod";

export const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  seasonLabel: z.string().min(1).max(20),
});

export const joinLeagueSchema = z.object({
  inviteCode: z.string().min(1),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
});
