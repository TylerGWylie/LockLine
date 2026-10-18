import cron from "node-cron";
import { lockDueWeeks } from "./lockWeeks";
import { pollAndGradeScores } from "./gradeWeeks";

export function startJobs(): void {
  cron.schedule("* * * * *", () => {
    lockDueWeeks().catch((err) => console.error("lockDueWeeks failed", err));
  });

  // Scores come from ESPN's free, unofficial scoreboard API (no quota), but it's
  // undocumented, so poll politely rather than aggressively.
  cron.schedule("*/10 * * * *", () => {
    pollAndGradeScores().catch((err) => console.error("pollAndGradeScores failed", err));
  });
}
