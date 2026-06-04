import { getDB } from "./db";
import type { LocalCashEntry, SyncStatus } from "./schema";

export async function saveLocalEntry(entry: LocalCashEntry): Promise<void> {
  const db = await getDB();
  await db.put("cash_entries", entry);
}

export async function getLocalEntry(offlineId: string): Promise<LocalCashEntry | undefined> {
  const db = await getDB();
  return db.get("cash_entries", offlineId);
}

export async function getLocalEntriesByBusiness(businessId: string): Promise<LocalCashEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex("cash_entries", "by_businessId", businessId);
}

export async function getPendingEntries(businessId: string): Promise<LocalCashEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("cash_entries", "by_syncStatus", "pending" as SyncStatus);
  return all.filter((e) => e.businessId === businessId);
}

export async function markEntrySynced(offlineId: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get("cash_entries", offlineId);
  if (!entry) return;
  await db.put("cash_entries", { ...entry, syncStatus: "synced" as SyncStatus });
}

export async function markEntryError(offlineId: string, message: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get("cash_entries", offlineId);
  if (!entry) return;
  await db.put("cash_entries", {
    ...entry,
    syncStatus: "error" as SyncStatus,
    errorMessage: message,
  });
}

export async function countPendingEntries(businessId: string): Promise<number> {
  const pending = await getPendingEntries(businessId);
  return pending.length;
}
