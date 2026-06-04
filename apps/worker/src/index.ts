import PgBoss from "pg-boss";

// ─── Queue job names (shared contract with web app) ────────────────────────
export const JOBS = {
  SCORE_COMPUTE: "score.compute", // compute/refresh credit score for a business
  SYNC_PROCESS: "sync.process", // process an offline sync batch
  LOW_STOCK_ALERT: "alert.low_stock", // send low-stock push notification
  DEBT_REMINDER: "alert.debt_reminder", // send customer debt reminder
} as const;

export type JobName = (typeof JOBS)[keyof typeof JOBS];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const boss = new PgBoss(databaseUrl);

  boss.on("error", (err) => {
    console.error("[pg-boss] error", err);
  });

  await boss.start();
  console.log("[worker] pg-boss started");

  // ── Job handlers ────────────────────────────────────────────────────────
  // Sprint 5: register score.compute handler
  await boss.work(JOBS.SCORE_COMPUTE, async (jobs) => {
    console.log("[worker] score.compute", jobs[0]?.data);
    // TODO Sprint 5: import and call packages/credit score engine
  });

  // Sprint 3: register sync.process handler
  await boss.work(JOBS.SYNC_PROCESS, async (jobs) => {
    console.log("[worker] sync.process", jobs[0]?.data);
    // TODO Sprint 3: process offline sync batch, dedup by offlineId
  });

  // Sprint 6: register alert handlers
  await boss.work(JOBS.LOW_STOCK_ALERT, async (jobs) => {
    console.log("[worker] low_stock_alert", jobs[0]?.data);
    // TODO Sprint 6: send push notification
  });

  await boss.work(JOBS.DEBT_REMINDER, async (jobs) => {
    console.log("[worker] debt_reminder", jobs[0]?.data);
    // TODO Sprint 6: send push notification
  });

  console.log("[worker] listening for jobs");

  // Keep alive — pg-boss internally polls on its schedule
  process.on("SIGTERM", async () => {
    console.log("[worker] SIGTERM — stopping pg-boss");
    await boss.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
