import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getOddsQuota, searchEvents } from "../services/oddsApi";

export const oddsRouter = Router();
oddsRouter.use(requireAuth);

const ALLOWED_SPORTS = new Set(["americanfootball_nfl", "americanfootball_ncaaf"]);

// Reflects the quota as of the last Odds API call this server made (search or a game-stage
// freeze) — The Odds API returns remaining/used counts on every response's headers rather than
// through a dedicated endpoint, so there's nothing to check until at least one call has happened
// since the server started.
oddsRouter.get("/quota", (_req, res) => {
  res.json(getOddsQuota());
});

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
