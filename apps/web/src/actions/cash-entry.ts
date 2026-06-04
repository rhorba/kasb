"use server";

import { withAction } from "@/lib/action";
import type { ActionContext } from "@/lib/action";
import { createCashEntrySchema } from "@kasb/core";
import { type SelectCashEntry, auditLogs, businessProfiles, cashEntries } from "@kasb/db";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

// ─── Period helpers ───────────────────────────────────────────────────────────

export type Period = "today" | "week" | "month" | "all";

function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

// ─── Business ID resolver ─────────────────────────────────────────────────────
// Session businessId may be stale if profile was just created; fall back to DB.

async function requireBusinessId(ctx: ActionContext): Promise<string> {
  if (ctx.session.businessId) return ctx.session.businessId;
  const [profile] = await ctx.tx
    .select({ id: businessProfiles.id })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .limit(1);
  if (!profile) throw new Error("Profil manquant — créez votre profil d'abord");
  return profile.id;
}

// ─── createCashEntry ──────────────────────────────────────────────────────────

export const createCashEntry = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const data = createCashEntrySchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  const [entry] = await ctx.tx
    .insert(cashEntries)
    .values({ ...data, businessId })
    .returning();

  if (!entry) throw new Error("Insert returned no rows");

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "cash_entries",
    entityId: entry.id,
    action: "create",
    after: entry,
  });

  return entry;
});

// ─── correctCashEntry ─────────────────────────────────────────────────────────
// Append-only: creates a new entry pointing at the original via correctsId.
// The original is NOT deleted — it is flagged as corrected in list queries.

const correctEntryInputSchema = createCashEntrySchema.extend({
  entryId: z.string().uuid(), // the entry being corrected
});

export const correctCashEntry = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const { entryId, ...newValues } = correctEntryInputSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  // Validate the original exists and belongs to this business
  const [original] = await ctx.tx
    .select()
    .from(cashEntries)
    .where(and(eq(cashEntries.id, entryId), eq(cashEntries.businessId, businessId)))
    .limit(1);

  if (!original) throw new Error("Entrée introuvable");

  // Prevent correcting an entry that is already a correction
  if (original.correctsId) throw new Error("Impossible de corriger une correction");

  // Check it hasn't already been corrected by another entry
  const [alreadyCorrected] = await ctx.tx
    .select({ id: cashEntries.id })
    .from(cashEntries)
    .where(and(eq(cashEntries.correctsId, entryId), eq(cashEntries.businessId, businessId)))
    .limit(1);

  if (alreadyCorrected) throw new Error("Cette entrée a déjà été corrigée");

  const [correction] = await ctx.tx
    .insert(cashEntries)
    .values({ ...newValues, businessId, correctsId: entryId })
    .returning();

  if (!correction) throw new Error("Insert returned no rows");

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "cash_entries",
    entityId: correction.id,
    action: "create",
    before: original,
    after: correction,
  });

  return correction;
});

// ─── listCashEntries ──────────────────────────────────────────────────────────

export type CashEntryWithMeta = SelectCashEntry & { isCorrected: boolean };

const listInputSchema = z.object({
  period: z.enum(["today", "week", "month", "all"]).default("month"),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().datetime().optional(), // ISO string of last entryDate for keyset pagination
});

export const listCashEntries = withAction(
  ["owner", "admin"],
  async (ctx, rawInput: unknown): Promise<CashEntryWithMeta[]> => {
    const { period, limit, cursor } = listInputSchema.parse(rawInput ?? {});
    const businessId = await requireBusinessId(ctx);
    const start = periodStart(period);

    const filters = [
      eq(cashEntries.businessId, businessId),
      ...(start ? [gte(cashEntries.entryDate, start)] : []),
      ...(cursor ? [sql`${cashEntries.entryDate} < ${cursor}::timestamptz`] : []),
    ];

    const rows = await ctx.tx
      .select()
      .from(cashEntries)
      .where(and(...filters))
      .orderBy(desc(cashEntries.entryDate))
      .limit(limit);

    if (rows.length === 0) return [];

    // Which of these entries have been corrected by a later correction entry?
    const rowIds = rows.map((r) => r.id);
    const correctedSet = new Set(
      (
        await ctx.tx
          .select({ cid: cashEntries.correctsId })
          .from(cashEntries)
          .where(
            and(
              eq(cashEntries.businessId, businessId),
              isNotNull(cashEntries.correctsId),
              sql`${cashEntries.correctsId} = ANY(${sql`ARRAY[${sql.join(
                rowIds.map((id) => sql`${id}::uuid`),
                sql`, `,
              )}]`})`,
            ),
          )
      )
        .map((r) => r.cid)
        .filter(Boolean),
    );

    return rows.map((r) => ({ ...r, isCorrected: correctedSet.has(r.id) }));
  },
);

// ─── getCashEntrySummary ──────────────────────────────────────────────────────
// Returns income / expense / net in centimes, excluding corrected entries.

export type CashEntrySummary = { income: number; expense: number; net: number };

const summaryInputSchema = z.object({
  period: z.enum(["today", "week", "month", "all"]).default("month"),
});

export const getCashEntrySummary = withAction(
  ["owner", "admin"],
  async (ctx, rawInput: unknown): Promise<CashEntrySummary> => {
    const { period } = summaryInputSchema.parse(rawInput ?? {});
    const businessId = await requireBusinessId(ctx);
    const start = periodStart(period);

    const [row] = await ctx.tx
      .select({
        income: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
      })
      .from(cashEntries)
      .where(
        and(
          eq(cashEntries.businessId, businessId),
          ...(start ? [gte(cashEntries.entryDate, start)] : []),
          // Exclude entries that have been corrected (a later correction supersedes them)
          sql`${cashEntries.id} NOT IN (
            SELECT corrects_id FROM cash_entries
            WHERE corrects_id IS NOT NULL AND business_id = ${businessId}
          )`,
        ),
      );

    const income = Number(row?.income ?? 0);
    const expense = Number(row?.expense ?? 0);
    return { income, expense, net: income - expense };
  },
);

// ─── getCashEntryChartData ────────────────────────────────────────────────────
// Daily aggregates for the bar chart (Sprint 2-06).
// Returns last N days with income + expense totals per day.

export type ChartDay = { date: string; income: number; expense: number };

const chartInputSchema = z.object({
  days: z.number().int().min(7).max(90).default(30),
});

export const getCashEntryChartData = withAction(
  ["owner", "admin"],
  async (ctx, rawInput: unknown): Promise<ChartDay[]> => {
    const { days } = chartInputSchema.parse(rawInput ?? {});
    const businessId = await requireBusinessId(ctx);

    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const rows = await ctx.tx
      .select({
        date: sql<string>`DATE(entry_date AT TIME ZONE 'UTC')`,
        income: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
      })
      .from(cashEntries)
      .where(
        and(
          eq(cashEntries.businessId, businessId),
          gte(cashEntries.entryDate, start),
          sql`${cashEntries.id} NOT IN (
            SELECT corrects_id FROM cash_entries
            WHERE corrects_id IS NOT NULL AND business_id = ${businessId}
          )`,
        ),
      )
      .groupBy(sql`DATE(entry_date AT TIME ZONE 'UTC')`)
      .orderBy(sql`DATE(entry_date AT TIME ZONE 'UTC') ASC`);

    return rows.map((r) => ({
      date: r.date,
      income: Number(r.income),
      expense: Number(r.expense),
    }));
  },
);
