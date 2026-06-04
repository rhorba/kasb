import { auth } from "@/auth";
import { createCashEntrySchema } from "@kasb/core";
import { auditLogs, businessProfiles, cashEntries } from "@kasb/db";
import { db, withUserContext } from "@kasb/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

// Shape of a single offline entry sent by the client sync engine.
// entryDate arrives as an ISO string from the client; coerce to Date.
const offlineSyncEntrySchema = createCashEntrySchema
  .required({ offlineId: true }) // offlineId is mandatory for sync
  .extend({
    _queueId: z.number().int(), // client queue row ID for dequeue ack
    entryDate: z.coerce.date(), // ISO string → Date
  });

const syncBodySchema = z.object({
  entries: z.array(offlineSyncEntrySchema).max(200),
  lastSyncAt: z.string().datetime().nullable(),
});

type CreatedAck = { offlineId: string; queueId: number; serverId: string };
type ErrorAck = { offlineId: string; queueId: number; message: string };

export async function POST(req: Request) {
  // Auth check
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Parse body
  const body = await req.json().catch(() => null);
  const parsed = syncBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { entries } = parsed.data;
  if (entries.length === 0) {
    return NextResponse.json({ created: [], errors: [], serverTime: new Date().toISOString() });
  }

  const created: CreatedAck[] = [];
  const errors: ErrorAck[] = [];

  await withUserContext(db, session.userId, session.role, async (tx) => {
    // Resolve businessId (stale JWT fallback)
    let businessId = session.businessId;
    if (!businessId) {
      const [profile] = await tx
        .select({ id: businessProfiles.id })
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, session.userId))
        .limit(1);
      businessId = profile?.id;
    }
    if (!businessId) {
      // No profile yet — all entries are errors
      for (const e of entries) {
        errors.push({ offlineId: e.offlineId, queueId: e._queueId, message: "Profil manquant" });
      }
      return;
    }

    for (const entry of entries) {
      const { _queueId, offlineId, ...values } = entry;

      try {
        // Dedup check: if this offlineId already exists for this business, skip insert
        const [existing] = await tx
          .select({ id: cashEntries.id })
          .from(cashEntries)
          .where(and(eq(cashEntries.businessId, businessId), eq(cashEntries.offlineId, offlineId)))
          .limit(1);

        if (existing) {
          // Already synced — acknowledge without re-inserting
          created.push({ offlineId, queueId: _queueId, serverId: existing.id });
          continue;
        }

        const [inserted] = await tx
          .insert(cashEntries)
          .values({
            ...values,
            businessId,
            offlineId,
            syncedAt: new Date(),
          })
          .returning({ id: cashEntries.id });

        if (!inserted) throw new Error("Insert returned no rows");

        await tx.insert(auditLogs).values({
          actorUserId: session.userId,
          entity: "cash_entries",
          entityId: inserted.id,
          action: "sync",
          after: { ...values, offlineId, businessId },
        });

        created.push({ offlineId, queueId: _queueId, serverId: inserted.id });
      } catch (err) {
        errors.push({
          offlineId,
          queueId: _queueId,
          message: err instanceof Error ? err.message : "Server error",
        });
      }
    }
  });

  return NextResponse.json({ created, errors, serverTime: new Date().toISOString() });
}
