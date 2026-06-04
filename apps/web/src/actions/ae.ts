"use server";

import { withAction } from "@/lib/action";
import type { ActionContext } from "@/lib/action";
import type { AEStep } from "@kasb/core";
import { aeRegistrationProgress, auditLogs, businessProfiles, cashEntries } from "@kasb/db";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";

// ─── Default wizard steps ─────────────────────────────────────────────────────
// 5-step AE pathway (§3 Module D in CLAUDE.md)

const DEFAULT_STEPS: AEStep[] = [
  { id: "quiz", title: "Êtes-vous prêt ?", status: "pending" },
  { id: "simulation", title: "Simulation de revenus", status: "pending" },
  { id: "registration", title: "Inscription sur rn.ae.gov.ma", status: "pending" },
  { id: "declaration", title: "Guide de déclaration CPU", status: "pending" },
  { id: "complete", title: "Enregistrement terminé", status: "pending" },
];

// ─── Business ID resolver ─────────────────────────────────────────────────────

async function requireBusinessId(ctx: ActionContext): Promise<string> {
  if (ctx.session.businessId) return ctx.session.businessId;
  const [profile] = await ctx.tx
    .select({ id: businessProfiles.id })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .limit(1);
  if (!profile) throw new Error("Profil manquant");
  return profile.id;
}

// ─── getAEProgress ────────────────────────────────────────────────────────────
// Returns the existing record, or auto-creates one with default steps.

export const getAEProgress = withAction(["owner", "admin"], async (ctx) => {
  const businessId = await requireBusinessId(ctx);

  const [existing] = await ctx.tx
    .select()
    .from(aeRegistrationProgress)
    .where(eq(aeRegistrationProgress.businessId, businessId))
    .limit(1);

  if (existing) return existing;

  // First visit: create the progress record with default steps
  const [created] = await ctx.tx
    .insert(aeRegistrationProgress)
    .values({ businessId, steps: DEFAULT_STEPS })
    .returning();

  if (!created) throw new Error("Insert returned no rows");

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "ae_registration_progress",
    entityId: created.id,
    action: "create",
    after: created,
  });

  return created;
});

// ─── updateAEStep ─────────────────────────────────────────────────────────────

const updateStepSchema = z.object({
  stepId: z.string().min(1),
  status: z.enum(["pending", "in_progress", "done", "skipped"]),
});

export const updateAEStep = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const { stepId, status } = updateStepSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  const [existing] = await ctx.tx
    .select()
    .from(aeRegistrationProgress)
    .where(eq(aeRegistrationProgress.businessId, businessId))
    .limit(1);

  if (!existing) throw new Error("Progression AE introuvable — rechargez la page");

  const updatedSteps = existing.steps.map((step) =>
    step.id === stepId
      ? { ...step, status, completedAt: status === "done" ? new Date() : step.completedAt }
      : step,
  );

  const [updated] = await ctx.tx
    .update(aeRegistrationProgress)
    .set({ steps: updatedSteps })
    .where(eq(aeRegistrationProgress.id, existing.id))
    .returning();

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "ae_registration_progress",
    entityId: existing.id,
    action: "update",
    before: { steps: existing.steps },
    after: { steps: updatedSteps },
  });

  return updated;
});

// ─── completeAERegistration ───────────────────────────────────────────────────

const completeSchema = z.object({
  rnaNumber: z.string().min(1).max(50).optional(),
});

export const completeAERegistration = withAction(
  ["owner", "admin"],
  async (ctx, rawInput: unknown) => {
    const { rnaNumber } = completeSchema.parse(rawInput ?? {});
    const businessId = await requireBusinessId(ctx);

    const [existing] = await ctx.tx
      .select()
      .from(aeRegistrationProgress)
      .where(eq(aeRegistrationProgress.businessId, businessId))
      .limit(1);

    if (!existing) throw new Error("Progression AE introuvable");

    const allDone = existing.steps.map((s) => ({ ...s, status: "done" as const }));

    const [updated] = await ctx.tx
      .update(aeRegistrationProgress)
      .set({ steps: allDone, completedAt: new Date(), rnaNumber })
      .where(eq(aeRegistrationProgress.id, existing.id))
      .returning();

    await ctx.tx.insert(auditLogs).values({
      actorUserId: ctx.session.userId,
      entity: "ae_registration_progress",
      entityId: existing.id,
      action: "update",
      before: { completedAt: null },
      after: { completedAt: new Date(), rnaNumber },
    });

    return updated;
  },
);

// ─── getAEReadiness ───────────────────────────────────────────────────────────
// Computes income simulation for the readiness quiz.
// Returns: avgMonthlyRevenue (centimes), annualRevenue, cpuTaxEstimate (0.5% commerce / 1% services)

export type AEReadiness = {
  avgMonthlyRevenueCentimes: number;
  annualRevenueCentimes: number;
  cpuTaxCentimes: number; // 0.5% commerce, 1% services
  cpuRatePct: number;
  monthsOfData: number;
  isReady: boolean; // 3+ months of data
};

export const getAEReadiness = withAction(["owner", "admin"], async (ctx): Promise<AEReadiness> => {
  const businessId = await requireBusinessId(ctx);

  // Look at last 12 months of income entries
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const incomeEntries = await ctx.tx
    .select({ amount: cashEntries.amount, entryDate: cashEntries.entryDate })
    .from(cashEntries)
    .where(
      and(
        eq(cashEntries.businessId, businessId),
        eq(cashEntries.type, "income"),
        gte(cashEntries.entryDate, twelveMonthsAgo),
      ),
    )
    .orderBy(desc(cashEntries.entryDate));

  if (incomeEntries.length === 0) {
    return {
      avgMonthlyRevenueCentimes: 0,
      annualRevenueCentimes: 0,
      cpuTaxCentimes: 0,
      cpuRatePct: 0.5,
      monthsOfData: 0,
      isReady: false,
    };
  }

  // Get business category to determine CPU rate
  const [profile] = await ctx.tx
    .select({ category: businessProfiles.category })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .limit(1);

  // Services = 1% CPU, everything else = 0.5%
  const cpuRatePct = profile?.category === "services" ? 1.0 : 0.5;

  // Group by month to compute monthly averages
  const monthlyTotals = new Map<string, number>();
  for (const e of incomeEntries) {
    const key = `${new Date(e.entryDate).getFullYear()}-${new Date(e.entryDate).getMonth()}`;
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + e.amount);
  }

  const months = monthlyTotals.size;
  const totalRevenue = [...monthlyTotals.values()].reduce((a, b) => a + b, 0);
  const avgMonthlyRevenueCentimes = months > 0 ? Math.round(totalRevenue / months) : 0;
  const annualRevenueCentimes = avgMonthlyRevenueCentimes * 12;
  const cpuTaxCentimes = Math.round(annualRevenueCentimes * (cpuRatePct / 100));

  return {
    avgMonthlyRevenueCentimes,
    annualRevenueCentimes,
    cpuTaxCentimes,
    cpuRatePct,
    monthsOfData: months,
    isReady: months >= 3,
  };
});
