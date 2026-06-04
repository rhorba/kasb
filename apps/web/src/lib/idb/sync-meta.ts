import { getDB } from "./db";

export async function getLastSync(businessId: string): Promise<Date | null> {
  const db = await getDB();
  const record = await db.get("last_sync", businessId);
  return record ? new Date(record.syncedAt) : null;
}

export async function setLastSync(businessId: string, at: Date): Promise<void> {
  const db = await getDB();
  await db.put("last_sync", { businessId, syncedAt: at.toISOString() });
}
