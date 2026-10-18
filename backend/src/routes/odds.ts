import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { searchEvents } from "../services/oddsApi";

export const oddsRouter = Router();
oddsRouter.use(requireAuth);

const ALLOWED_SPORTS = new Set(["americanfootball_nfl", "americanfootball_ncaaf"]);

oddsRouter.get("/search", async (req, res) => {
  const sportKey = req.query.sport;
  if (typeof sportKey !== "string" || !ALLOWED_SPORTS.has(sportKey)) {
    res.status(400).json({ error: `sport must be one of: ${[...ALLOWED_SPORTS].join(", ")}` });
    return;
  }

  try {
    const events = await searchEvents(sportKey);
    res.json(events);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch odds", detail: (err as Error).message });
  }
});
