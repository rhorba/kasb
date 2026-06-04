"use server";

import { withAction } from "@/lib/action";
import { createCreditApplicationSchema } from "@kasb/core";
import type { CashEntry, DebtEntry } from "@kasb/core";
import { computeCreditScore, matchPartners } from "@kasb/credit";
import {
  auditLogs,
  businessProfiles,
  cashEntries,
  creditApplications,
  creditScores,
  db,
  debtEntries,
  loanProducts,
  microfinancePartners,
} from "@kasb/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

// ─── getLatestScore ───────────────────────────────────────────────────────────

export const getLatestScore = withAction(["owner", "admin"], async (ctx) => {
  const businessId = ctx.session.businessId;
  if (!businessId) {
    // Fall back to DB lookup for fresh sessions
    const [profile] = await ctx.tx
      .select({ id: businessProfiles.id, city: businessProfiles.city })
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, ctx.session.userId))
      .limit(1);
    if (!profile) return null;
    return fetchScore(profile.id);
  }
  return fetchScore(businessId);
});

async function fetchScore(businessId: string) {
  const [latest] = await db
    .select()
    .from(creditScores)
    .where(eq(creditScores.businessId, businessId))
    .orderBy(desc(creditScores.computedAt))
    .limit(1);
  return latest ?? null;
}

// ─── getScorePreview (on-demand compute without persisting) ───────────────────
// Called when the user opens the credit page and no stored score exists yet.

export const getScorePreview = withAction(["owner", "admin"], async (ctx) => {
  const businessId = ctx.session.businessId;
  if (!businessId) return null;

  const [entries, debts] = await Promise.all([
    ctx.tx.select().from(cashEntries).where(eq(cashEntries.businessId, businessId)) as Promise<
      CashEntry[]
    >,
    ctx.tx.select().from(debtEntries).where(eq(debtEntries.businessId, businessId)) as Promise<
      DebtEntry[]
    >,
  ]);

  return computeCreditScore(entries, debts);
});

// ─── listPartners ─────────────────────────────────────────────────────────────

export const listPartners = withAction(["owner", "admin"], async (ctx) => {
  const partners = await ctx.tx
    .select()
    .from(microfinancePartners)
    .where(eq(microfinancePartners.active, true));

  const products = await ctx.tx.select().from(loanProducts);

  return partners.map((p) => ({
    ...p,
    products: products.filter((prod) => prod.partnerId === p.id),
  }));
});

// ─── getEligiblePartners ──────────────────────────────────────────────────────

export const getEligiblePartners = withAction(["owner", "admin"], async (ctx) => {
  const businessId = ctx.session.businessId;
  if (!businessId) return [];

  const [profile] = await ctx.tx
    .select({ city: businessProfiles.city })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .limit(1);

  const [latest] = await db
    .select({ score: creditScores.score })
    .from(creditScores)
    .where(eq(creditScores.businessId, businessId))
    .orderBy(desc(creditScores.computedAt))
    .limit(1);

  if (!latest || !profile) return [];

  const allPartners = await ctx.tx
    .select()
    .from(microfinancePartners)
    .where(eq(microfinancePartners.active, true));

  const eligibleIds = matchPartners(latest.score, profile.city, allPartners as never);

  return allPartners.filter((p) => eligibleIds.includes(p.id));
});

// ─── submitCreditApplication ──────────────────────────────────────────────────
// Consent is implicit in the submission action — user must call this explicitly.

const submitApplicationSchema = createCreditApplicationSchema.extend({
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter le partage de vos données" }),
  }),
});

export const submitCreditApplication = withAction(
  ["owner", "admin"],
  async (ctx, rawInput: unknown) => {
    const { partnerId, productId, requestedAmount } = submitApplicationSchema.parse(rawInput);
    const businessId = ctx.session.businessId;
    if (!businessId) throw new Error("Profil manquant");

    // Capture score at time of application
    const [latest] = await db
      .select({ score: creditScores.score })
      .from(creditScores)
      .where(eq(creditScores.businessId, businessId))
      .orderBy(desc(creditScores.computedAt))
      .limit(1);

    const scoreAtApplication = latest?.score ?? 0;

    const [application] = await ctx.tx
      .insert(creditApplications)
      .values({
        businessId,
        partnerId,
        productId,
        requestedAmount,
        scoreAtApplication,
        status: "submitted",
      })
      .returning();

    if (!application) throw new Error("Insert returned no rows");

    await ctx.tx.insert(auditLogs).values({
      actorUserId: ctx.session.userId,
      entity: "credit_applications",
      entityId: application.id,
      action: "create",
      after: application,
    });

    return application;
  },
);

// ─── listMyApplications ───────────────────────────────────────────────────────

export const listMyApplications = withAction(["owner", "admin"], async (ctx) => {
  const businessId = ctx.session.businessId;
  if (!businessId) return [];

  return ctx.tx
    .select()
    .from(creditApplications)
    .where(eq(creditApplications.businessId, businessId))
    .orderBy(desc(creditApplications.submittedAt));
});
