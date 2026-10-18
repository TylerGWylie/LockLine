import { z } from "zod";

export const renameTeamSchema = z.object({
  name: z.string().min(1).max(100),
});
