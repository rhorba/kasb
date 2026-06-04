import type { EntryCategory, EntrySource, EntryType } from "@kasb/core";
import type { DBSchema } from "idb";

export type SyncStatus = "pending" | "synced" | "error";
export type SyncOperation = "create";
export type SyncEntity = "cash_entry" | "customer";

// Local cash entry — offlineId is the primary key (UUID generated on client)
export interface LocalCashEntry {
  offlineId: string; // pk — UUID, client-generated
  businessId: string;
  type: EntryType;
  amount: number; // integer centimes
  category: EntryCategory;
  description?: string | undefined;
  clientId?: string | undefined;
  entryDate: string; // ISO date string (IDB can't index Date across workers)
  source: EntrySource;
  syncStatus: SyncStatus;
  errorMessage?: string | undefined;
  createdAt: string; // ISO
}

// A pending sync operation waiting to be flushed to /api/sync
export interface SyncQueueItem {
  id?: number; // auto-increment pk
  operation: SyncOperation;
  entity: SyncEntity;
  offlineId: string; // links back to the local record
  payload: string; // JSON-encoded payload
  retries: number;
  createdAt: string; // ISO
}

// Cached customer data (written server-side, read-only offline)
export interface LocalCustomer {
  id: string; // pk — server UUID
  businessId: string;
  name: string;
  phone?: string;
  outstandingDebt: number; // integer centimes
  lastTransactionAt?: string; // ISO
  createdAt: string; // ISO
}

// Last successful sync timestamp per business
export interface LastSync {
  businessId: string; // pk
  syncedAt: string; // ISO
}

export interface KasbDB extends DBSchema {
  cash_entries: {
    key: string;
    value: LocalCashEntry;
    indexes: {
      by_businessId: string;
      by_syncStatus: SyncStatus;
      by_entryDate: string;
    };
  };
  sync_queue: {
    key: number;
    value: SyncQueueItem;
    indexes: {
      by_offlineId: string;
      by_syncStatus_entity: [SyncStatus, SyncEntity];
    };
  };
  customers: {
    key: string;
    value: LocalCustomer;
    indexes: {
      by_businessId: string;
    };
  };
  last_sync: {
    key: string;
    value: LastSync;
  };
}
