// stock.alerts job — finds items below threshold and creates in-app notifications.
// Idempotent: skips if a low_stock notification was already sent today for this item.

import { sendPushToUser } from "@/lib/push/send";
import { businessProfiles, db, notifications, stockItems, users } from "@kasb/db";
import { and, eq, gt, sql } from "drizzle-orm";

export async function runStockAlerts(): Promise<{ notified: number; skipped: number }> {
  // Items at or below their low-stock threshold
  const lowItems = await db
    .select({
      itemId: stockItems.id,
      itemName: stockItems.name,
      currentStock: stockItems.currentStock,
      threshold: stockItems.lowStockThreshold,
      unit: stockItems.unit,
      businessId: stockItems.businessId,
      ownerId: businessProfiles.userId,
    })
    .from(stockItems)
    .innerJoin(businessProfiles, eq(stockItems.businessId, businessProfiles.id))
    .innerJoin(users, eq(businessProfiles.userId, users.id))
    .where(
      and(
        gt(stockItems.lowStockThreshold, 0),
        sql`${stockItems.currentStock} <= ${stockItems.lowStockThreshold}`,
        eq(users.isActive, true),
      ),
    );

  if (lowItems.length === 0) return { notified: 0, skipped: 0 };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let notified = 0;
  let skipped = 0;

  for (const item of lowItems) {
    // Idempotency check — skip if already notified today for this item
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, item.ownerId),
          eq(notifications.type, "low_stock"),
          sql`${notifications.data}->>'stockItemId' = ${item.itemId}`,
          gt(notifications.createdAt, todayStart),
        ),
      )
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    const notifTitle = `Stock faible: ${item.itemName}`;
    const notifBody = `Il vous reste ${item.currentStock} ${item.unit} de ${item.itemName} (seuil: ${item.threshold}).`;

    await db.insert(notifications).values({
      userId: item.ownerId,
      businessId: item.businessId,
      type: "low_stock",
      title: notifTitle,
      body: notifBody,
      data: {
        stockItemId: item.itemId,
        currentStock: item.currentStock,
        threshold: item.threshold,
      },
    });

    await sendPushToUser(item.ownerId, { title: notifTitle, body: notifBody });

    notified++;
  }

  return { notified, skipped };
}
