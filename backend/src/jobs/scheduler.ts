import cron from "node-cron";
import { lockDueWeeks } from "./lockWeeks";
import { pollAndGradeScores } from "./gradeWeeks";

export function startJobs(): void {
  cron.schedule("* * * * *", () => {
    lockDueWeeks().catch((err) => console.error("lockDueWeeks failed", err));
  });

  // Scores come from ESPN's free, unofficial scoreboard API (no quota), but it's
  // undocumented — frequent enough to feel live, not so frequent it hammers it.
  cron.schedule("*/3 * * * *", () => {
    pollAndGradeScores().catch((err) => console.error("pollAndGradeScores failed", err));
  });
}
