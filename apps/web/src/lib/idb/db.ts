import { type IDBPDatabase, openDB } from "idb";
import type { KasbDB } from "./schema";

const DB_NAME = "kasb-offline";
const DB_VERSION = 1;

let _db: IDBPDatabase<KasbDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<KasbDB>> {
  if (_db) return _db;

  _db = await openDB<KasbDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // cash_entries store
      if (!db.objectStoreNames.contains("cash_entries")) {
        const entriesStore = db.createObjectStore("cash_entries", {
          keyPath: "offlineId",
        });
        entriesStore.createIndex("by_businessId", "businessId");
        entriesStore.createIndex("by_syncStatus", "syncStatus");
        entriesStore.createIndex("by_entryDate", "entryDate");
      }

      // sync_queue store
      if (!db.objectStoreNames.contains("sync_queue")) {
        const queueStore = db.createObjectStore("sync_queue", {
          keyPath: "id",
          autoIncrement: true,
        });
        queueStore.createIndex("by_offlineId", "offlineId");
        // Compound index: [syncStatus, entity] — unused in schema, skip for IDB simplicity
      }

      // customers store
      if (!db.objectStoreNames.contains("customers")) {
        const customersStore = db.createObjectStore("customers", {
          keyPath: "id",
        });
        customersStore.createIndex("by_businessId", "businessId");
      }

      // last_sync store
      if (!db.objectStoreNames.contains("last_sync")) {
        db.createObjectStore("last_sync", { keyPath: "businessId" });
      }
    },
  });

  return _db;
}

// For tests / SSR guard — IDB is browser-only
export function isIDBAvailable(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}
