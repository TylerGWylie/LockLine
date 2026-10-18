import { createApp } from "./app";
import { env } from "./env";
import { startJobs } from "./jobs/scheduler";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Lockline API listening on port ${env.port}`);
});

startJobs();
