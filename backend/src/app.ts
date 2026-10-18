import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { leaguesRouter } from "./routes/leagues";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/leagues", leaguesRouter);

  return app;
}
