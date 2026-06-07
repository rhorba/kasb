// score.sweep job — nightly credit score recomputation.
// Idempotent: re-running on the same day overwrites the existing score row.
// Skips businesses with < 30 entries / 30 days (computeCreditScore returns null).
// Notifies the owner when score increases by ≥ 5 points.

import { sendPushToUser } from "@/lib/push/send";
import type { CashEntry, DebtEntry } from "@kasb/core";
import { computeCreditScore, matchPartners } from "@kasb/credit";
import {
  businessProfiles,
  cashEntries,
  creditScores,
  db,
  debtEntries,
  microfinancePartners,
  notifications,
  users,
} from "@kasb/db";
import { desc, eq, sql } from "drizzle-orm";

export async function runScoreSweep(): Promise<{ computed: number; skipped: number }> {
  // Load all active business profiles + their owner's city
  const businesses = await db
    .select({
      businessId: businessProfiles.id,
      userId: businessProfiles.userId,
      city: businessProfiles.city,
    })
    .from(businessProfiles)
    .innerJoin(users, eq(businessProfiles.userId, users.id))
    .where(eq(users.isActive, true));

  // Load all active microfinance partners for matching
  const partners = await db
    .select()
    .from(microfinancePartners)
    .where(eq(microfinancePartners.active, true));

  let computed = 0;
  let skipped = 0;

  for (const biz of businesses) {
    // Fetch this business's entries (all time — score looks at the last 90 days implicitly via dataRichness)
    const entries = (await db
      .select()
      .from(cashEntries)
      .where(eq(cashEntries.businessId, biz.businessId))
      .orderBy(cashEntries.entryDate)) as CashEntry[];

    const debts = (await db
      .select()
      .from(debtEntries)
      .where(eq(debtEntries.businessId, biz.businessId))) as DebtEntry[];

    const result = computeCreditScore(entries, debts);

    if (!result) {
      skipped++;
      continue;
    }

    const eligiblePartnerIds = matchPartners(result.score, biz.city, partners as never);

    // Check previous score (for improvement notification)
    const [prevScore] = await db
      .select({ score: creditScores.score })
      .from(creditScores)
      .where(eq(creditScores.businessId, biz.businessId))
      .orderBy(desc(creditScores.computedAt))
      .limit(1);

    // Upsert: if a score exists for today, overwrite it; otherwise insert
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayScore] = await db
      .select({ id: creditScores.id })
      .from(creditScores)
      .where(
        sql`${creditScores.businessId} = ${biz.businessId} AND ${creditScores.computedAt} >= ${todayStart}`,
      )
      .limit(1);

    if (todayScore) {
      await db
        .update(creditScores)
        .set({
          score: result.score,
          components: result.components,
          monthsOfData: result.monthsOfData,
          eligiblePartnerIds,
          computedAt: result.computedAt,
        })
        .where(eq(creditScores.id, todayScore.id));
    } else {
      await db.insert(creditScores).values({
        businessId: biz.businessId,
        score: result.score,
        components: result.components,
        monthsOfData: result.monthsOfData,
        eligiblePartnerIds,
        computedAt: result.computedAt,
      });
    }

    // Notify if score improved by ≥ 5 points
    const prevPoints = prevScore?.score ?? 0;
    if (result.score - prevPoints >= 5) {
      const notifTitle = `Votre score Kasb a augmenté à ${result.score}/100`;
      const notifBody =
        eligiblePartnerIds.length > 0
          ? `Vous êtes maintenant éligible chez ${eligiblePartnerIds.length} partenaire(s) microfinance.`
          : "Continuez à enregistrer vos ventes pour atteindre votre objectif.";

      await db.insert(notifications).values({
        userId: biz.userId,
        businessId: biz.businessId,
        type: "score_improvement",
        title: notifTitle,
        body: notifBody,
        data: {
          previousScore: prevPoints,
          newScore: result.score,
          eligiblePartnerIds,
        },
      });

      await sendPushToUser(biz.userId, { title: notifTitle, body: notifBody });
    }

    computed++;
  }

  return { computed, skipped };
}
