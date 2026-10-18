import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { inviteRouter } from "./routes/invite";
import { leaguesRouter } from "./routes/leagues";
import { oddsRouter } from "./routes/odds";
import { picksRouter } from "./routes/picks";
import { seasonsRouter } from "./routes/seasons";
import { teamsRouter } from "./routes/teams";
import { weeksRouter } from "./routes/weeks";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/invite", inviteRouter);
  app.use("/leagues", leaguesRouter);
  app.use("/odds", oddsRouter);
  app.use("/seasons", seasonsRouter);
  app.use("/teams", teamsRouter);
  app.use("/weeks", weeksRouter);
  app.use("/weeks", picksRouter);

  return app;
}
