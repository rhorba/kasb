import { auth } from "@/auth";
import { db, pushSubscriptions } from "@kasb/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const endpoint: string | undefined = body?.endpoint;
  const p256dh: string | undefined = body?.keys?.p256dh;
  const authKey: string | undefined = body?.keys?.auth;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId: session.userId, endpoint, p256dh, auth: authKey })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: session.userId },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const endpoint: string | undefined = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.userId, session.userId), eq(pushSubscriptions.endpoint, endpoint)),
    );

  return NextResponse.json({ ok: true });
}
