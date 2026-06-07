import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Liveness probe for Docker healthcheck and Vercel monitoring.
export function GET() {
  return NextResponse.json({ ok: true, version: "0.1" });
}
