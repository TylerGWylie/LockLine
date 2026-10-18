import cron from "node-cron";
import { lockDueWeeks } from "./lockWeeks";
import { pollAndGradeScores } from "./gradeWeeks";

export function startJobs(): void {
  cron.schedule("* * * * *", () => {
    lockDueWeeks().catch((err) => console.error("lockDueWeeks failed", err));
  });

  // Tune this toward 30-60 min in production to conserve the Odds API free-tier quota.
  cron.schedule("*/10 * * * *", () => {
    pollAndGradeScores().catch((err) => console.error("pollAndGradeScores failed", err));
  });
}
