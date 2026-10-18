import cron from "node-cron";
import { lockDueWeeks } from "./lockWeeks";

export function startJobs(): void {
  cron.schedule("* * * * *", () => {
    lockDueWeeks().catch((err) => console.error("lockDueWeeks failed", err));
  });
}
