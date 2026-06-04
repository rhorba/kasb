import { runDebtReminders } from "@/lib/jobs/debt-reminders";
import { NextResponse } from "next/server";

// Internal endpoint — called by pg-boss scheduler (Sprint 6) or cron.
// Protected by a shared secret to prevent public access.
const JOB_SECRET = process.env.JOB_SECRET ?? "";

export async function POST(req: Request) {
  const auth = req.headers.get("x-job-secret");
  if (!JOB_SECRET || auth !== JOB_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runDebtReminders();
  return NextResponse.json(result);
}
