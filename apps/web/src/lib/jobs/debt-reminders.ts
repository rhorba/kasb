// debt.reminders job — finds customers with overdue debt and creates in-app notifications.
// Idempotent: skips a customer if a debt_reminder notification was already created today.
// Called by pg-boss scheduler (Sprint 6) or directly via /api/jobs/debt-reminders (internal).

import { businessProfiles, customers, db, notifications } from "@kasb/db";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";

const OVERDUE_DAYS = 7;

export async function runDebtReminders(): Promise<{ notified: number; skipped: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - OVERDUE_DAYS);

  // Find customers with outstanding debt where last transaction is > 7 days ago
  const overdueCustomers = await db
    .select({
      customerId: customers.id,
      customerName: customers.name,
      outstandingDebt: customers.outstandingDebt,
      businessId: customers.businessId,
      ownerId: businessProfiles.userId,
    })
    .from(customers)
    .innerJoin(businessProfiles, eq(customers.businessId, businessProfiles.id))
    .where(
      and(
        gt(customers.outstandingDebt, 0),
        or(lt(customers.lastTransactionAt, cutoff), isNull(customers.lastTransactionAt)),
      ),
    );

  if (overdueCustomers.length === 0) return { notified: 0, skipped: 0 };

  // Build today's date window for idempotency check
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let notified = 0;
  let skipped = 0;

  for (const c of overdueCustomers) {
    // Check if we already sent a debt_reminder for this customer today
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, c.ownerId),
          eq(notifications.type, "debt_reminder"),
          sql`${notifications.data}->>'customerId' = ${c.customerId}`,
          gt(notifications.createdAt, todayStart),
        ),
      )
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    const dirhams = (c.outstandingDebt / 100).toFixed(2);
    await db.insert(notifications).values({
      userId: c.ownerId,
      businessId: c.businessId,
      type: "debt_reminder",
      title: `${c.customerName} vous doit ${dirhams} MAD`,
      body: `Rappel : ${c.customerName} a une dette non réglée de ${dirhams} MAD depuis plus de ${OVERDUE_DAYS} jours.`,
      data: { customerId: c.customerId, amountCentimes: c.outstandingDebt },
    });

    notified++;
  }

  return { notified, skipped };
}
