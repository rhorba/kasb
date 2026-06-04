import { runScoreSweep } from "@/lib/jobs/score-sweep";
import { NextResponse } from "next/server";

const JOB_SECRET = process.env.JOB_SECRET ?? "";

export async function POST(req: Request) {
  const auth = req.headers.get("x-job-secret");
  if (!JOB_SECRET || auth !== JOB_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await runScoreSweep();
  return NextResponse.json(result);
}
