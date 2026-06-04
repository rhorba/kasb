import { getDB } from "./db";
import type { SyncEntity, SyncOperation, SyncQueueItem } from "./schema";

export async function enqueue(
  operation: SyncOperation,
  entity: SyncEntity,
  offlineId: string,
  payload: object,
): Promise<void> {
  const db = await getDB();
  const item: SyncQueueItem = {
    operation,
    entity,
    offlineId,
    payload: JSON.stringify(payload),
    retries: 0,
    createdAt: new Date().toISOString(),
  };
  await db.add("sync_queue", item);
}

export async function getAllQueued(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll("sync_queue");
}

export async function dequeue(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("sync_queue", id);
}

export async function incrementRetry(id: number): Promise<void> {
  const db = await getDB();
  const item = await db.get("sync_queue", id);
  if (!item) return;
  await db.put("sync_queue", { ...item, retries: item.retries + 1 });
}

export async function clearQueueForOfflineId(offlineId: string): Promise<void> {
  const db = await getDB();
  const items = await db.getAllFromIndex("sync_queue", "by_offlineId", offlineId);
  const tx = db.transaction("sync_queue", "readwrite");
  await Promise.all(items.map((item) => item.id != null && tx.store.delete(item.id)));
  await tx.done;
}
