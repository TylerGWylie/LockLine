import { z } from "zod";

export const createWeekSchema = z.object({
  weekNumber: z.number().int().positive(),
  label: z.string().min(1).max(50),
});

const oddsApiGameSchema = z.object({
  source: z.literal("odds_api"),
  externalId: z.string().min(1),
  sportKey: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  homeConference: z.string().optional(),
  awayConference: z.string().optional(),
  kickoffAt: z.string().datetime(),
});

const manualGameSchema = z.object({
  source: z.literal("manual"),
  sportKey: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  homeConference: z.string().optional(),
  awayConference: z.string().optional(),
  kickoffAt: z.string().datetime(),
  favoriteTeam: z.enum(["home", "away"]),
  spreadValue: z.number().min(0),
});

export const addGamesSchema = z.object({
  games: z.array(z.discriminatedUnion("source", [oddsApiGameSchema, manualGameSchema])).min(1),
});

export const correctLineSchema = z.object({
  favoriteTeam: z.enum(["home", "away"]),
  spreadValue: z.number().min(0),
  reason: z.string().max(500).optional(),
});

export const lockOverrideSchema = z.object({
  lockAt: z.string().datetime(),
});
