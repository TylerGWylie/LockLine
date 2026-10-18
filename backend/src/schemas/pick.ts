import { z } from "zod";

export const putPicksSchema = z.object({
  version: z.string().nullable(),
  picks: z.array(
    z.object({
      gameId: z.string().uuid(),
      confidenceValue: z.number().int().positive(),
      sideSelected: z.enum(["home", "away"]),
    }),
  ),
});
