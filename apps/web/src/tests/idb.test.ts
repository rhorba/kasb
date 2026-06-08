/**
 * IndexedDB layer tests using fake-indexeddb
 * Covers: lib/idb/entries.ts, lib/idb/queue.ts, lib/idb/customers.ts, lib/idb/sync-meta.ts
 *
 * Part A — entries.ts
 *   1. saveLocalEntry / getLocalEntry round-trip
 *   2. getLocalEntriesByBusiness — only returns entries for given businessId
 *   3. markEntrySynced — updates syncStatus to 'synced'
 *   4. markEntryError — updates syncStatus to 'error' with message
 *   5. countPendingEntries — correct count for business
 *   6. markEntrySynced — no-op when entry not found
 *
 * Part B — queue.ts
 *   7. enqueue + getAllQueued — item appears in queue
 *   8. dequeue — removes item by id
 *   9. incrementRetry — increments retry count
 *  10. clearQueueForOfflineId — removes all items for given offlineId
 *  11. incrementRetry — no-op when item not found
 *
 * Part C — customers.ts
 *  12. cacheCustomers + getLocalCustomers — round-trip by businessId
 *  13. getLocalCustomer — fetches single customer by id
 *  14. getLocalCustomers — empty when no customers for businessId
 *
 * Part D — sync-meta.ts
 *  15. setLastSync + getLastSync — stores and retrieves timestamp
 *  16. getLastSync — returns null when no record exists
 */

// fake-indexeddb/auto sets IDBFactory, IDBRequest, IDBKeyRange, etc. on globalThis.
// Must be imported before any idb usage.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import { beforeEach, describe, expect, it, vi } from "vitest";

// Before each test: swap in a fresh IDBFactory so every test gets empty IndexedDB state.
// vi.resetModules() clears the getDB() singleton; the fresh factory clears the stored data.
beforeEach(() => {
  (globalThis as Record<string, unknown>).indexedDB = new IDBFactory();
  vi.resetModules();
});

const BIZ_A = "business-aaa";
const BIZ_B = "business-bbb";

function makeEntry(
  offlineId: string,
  businessId = BIZ_A,
  syncStatus: "pending" | "synced" | "error" = "pending",
) {
  return {
    offlineId,
    businessId,
    type: "income" as const,
    amount: 10000,
    category: "sales" as const,
    entryDate: new Date().toISOString(),
    source: "manual" as const,
    syncStatus,
    createdAt: new Date().toISOString(),
  };
}

// ─── PART A: entries.ts ───────────────────────────────────────────────────────

describe("lib/idb/entries.ts", () => {
  it("1. saveLocalEntry / getLocalEntry round-trip", async () => {
    const { saveLocalEntry, getLocalEntry } = await import("@/lib/idb/entries");
    const e = makeEntry("offline-001");
    await saveLocalEntry(e);
    const got = await getLocalEntry("offline-001");
    expect(got).toMatchObject({ offlineId: "offline-001", amount: 10000, syncStatus: "pending" });
  });

  it("2. getLocalEntriesByBusiness — only returns entries for given businessId", async () => {
    const { saveLocalEntry, getLocalEntriesByBusiness } = await import("@/lib/idb/entries");
    await saveLocalEntry(makeEntry("e-a1", BIZ_A));
    await saveLocalEntry(makeEntry("e-a2", BIZ_A));
    await saveLocalEntry(makeEntry("e-b1", BIZ_B));

    const forA = await getLocalEntriesByBusiness(BIZ_A);
    expect(forA).toHaveLength(2);
    expect(forA.every((e) => e.businessId === BIZ_A)).toBe(true);
  });

  it("3. markEntrySynced — updates syncStatus to 'synced'", async () => {
    const { saveLocalEntry, markEntrySynced, getLocalEntry } = await import("@/lib/idb/entries");
    await saveLocalEntry(makeEntry("e-sync"));
    await markEntrySynced("e-sync");
    const got = await getLocalEntry("e-sync");
    expect(got?.syncStatus).toBe("synced");
  });

  it("4. markEntryError — sets syncStatus 'error' with message", async () => {
    const { saveLocalEntry, markEntryError, getLocalEntry } = await import("@/lib/idb/entries");
    await saveLocalEntry(makeEntry("e-err"));
    await markEntryError("e-err", "Network timeout");
    const got = await getLocalEntry("e-err");
    expect(got?.syncStatus).toBe("error");
    expect(got?.errorMessage).toBe("Network timeout");
  });

  it("5. countPendingEntries — correct count for business", async () => {
    const { saveLocalEntry, countPendingEntries } = await import("@/lib/idb/entries");
    await saveLocalEntry(makeEntry("e-c1", BIZ_A, "pending"));
    await saveLocalEntry(makeEntry("e-c2", BIZ_A, "pending"));
    await saveLocalEntry(makeEntry("e-c3", BIZ_A, "synced"));
    await saveLocalEntry(makeEntry("e-c4", BIZ_B, "pending"));

    const count = await countPendingEntries(BIZ_A);
    expect(count).toBe(2);
  });

  it("6. markEntrySynced — no-op when entry not found", async () => {
    const { markEntrySynced } = await import("@/lib/idb/entries");
    // Should not throw when entry doesn't exist
    await expect(markEntrySynced("nonexistent-id")).resolves.toBeUndefined();
  });
});

// ─── PART B: queue.ts ─────────────────────────────────────────────────────────

describe("lib/idb/queue.ts", () => {
  it("7. enqueue + getAllQueued — item appears in queue", async () => {
    const { enqueue, getAllQueued } = await import("@/lib/idb/queue");
    await enqueue("create", "cash_entry", "offline-q1", { amount: 5000 });
    const all = await getAllQueued();
    expect(all.length).toBeGreaterThan(0);
    const item = all.find((q) => q.offlineId === "offline-q1");
    expect(item).toBeDefined();
    expect(item?.operation).toBe("create");
    expect(item?.entity).toBe("cash_entry");
    expect(item?.retries).toBe(0);
  });

  it("8. dequeue — removes item from queue", async () => {
    const { enqueue, getAllQueued, dequeue } = await import("@/lib/idb/queue");
    await enqueue("create", "cash_entry", "offline-q2", { amount: 2000 });
    const before = await getAllQueued();
    const item = before.find((q) => q.offlineId === "offline-q2");
    expect(item?.id).toBeDefined();

    if (item?.id == null) throw new Error("item.id should be defined");
    await dequeue(item.id);
    const after = await getAllQueued();
    expect(after.find((q) => q.offlineId === "offline-q2")).toBeUndefined();
  });

  it("9. incrementRetry — increments retry count", async () => {
    const { enqueue, getAllQueued, incrementRetry } = await import("@/lib/idb/queue");
    await enqueue("create", "cash_entry", "offline-q3", { amount: 3000 });
    const before = await getAllQueued();
    const item = before.find((q) => q.offlineId === "offline-q3");
    expect(item?.retries).toBe(0);

    if (item?.id == null) throw new Error("item.id should be defined");
    await incrementRetry(item.id);
    const after = await getAllQueued();
    const updated = after.find((q) => q.offlineId === "offline-q3");
    expect(updated?.retries).toBe(1);
  });

  it("10. clearQueueForOfflineId — removes all items for offlineId", async () => {
    const { enqueue, getAllQueued, clearQueueForOfflineId } = await import("@/lib/idb/queue");
    await enqueue("create", "cash_entry", "offline-q4", { amount: 4000 });
    await enqueue("create", "cash_entry", "offline-q4", { amount: 4000 }); // duplicate
    await enqueue("create", "cash_entry", "offline-q5", { amount: 5000 }); // different id

    await clearQueueForOfflineId("offline-q4");
    const remaining = await getAllQueued();
    expect(remaining.filter((q) => q.offlineId === "offline-q4")).toHaveLength(0);
    expect(remaining.filter((q) => q.offlineId === "offline-q5")).toHaveLength(1);
  });

  it("11. incrementRetry — no-op when item not found", async () => {
    const { incrementRetry } = await import("@/lib/idb/queue");
    await expect(incrementRetry(99999)).resolves.toBeUndefined();
  });
});

// ─── PART C: customers.ts ─────────────────────────────────────────────────────

describe("lib/idb/customers.ts", () => {
  const mockCustomers = [
    {
      id: "cust-1",
      businessId: BIZ_A,
      name: "Hassan",
      outstandingDebt: 5000,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cust-2",
      businessId: BIZ_A,
      name: "Fatima",
      outstandingDebt: 2000,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cust-3",
      businessId: BIZ_B,
      name: "Omar",
      outstandingDebt: 1000,
      createdAt: new Date().toISOString(),
    },
  ];

  it("12. cacheCustomers + getLocalCustomers — round-trip by businessId", async () => {
    const { cacheCustomers, getLocalCustomers } = await import("@/lib/idb/customers");
    await cacheCustomers(mockCustomers);
    const forA = await getLocalCustomers(BIZ_A);
    expect(forA).toHaveLength(2);
    expect(forA.map((c) => c.name).sort()).toEqual(["Fatima", "Hassan"]);
  });

  it("13. getLocalCustomer — fetches single customer by id", async () => {
    const { cacheCustomers, getLocalCustomer } = await import("@/lib/idb/customers");
    await cacheCustomers(mockCustomers);
    const c = await getLocalCustomer("cust-1");
    expect(c).toMatchObject({ id: "cust-1", name: "Hassan" });
  });

  it("14. getLocalCustomers — empty when no customers for businessId", async () => {
    const { getLocalCustomers } = await import("@/lib/idb/customers");
    const result = await getLocalCustomers("no-such-business");
    expect(result).toEqual([]);
  });
});

// ─── PART D: sync-meta.ts ─────────────────────────────────────────────────────

describe("lib/idb/sync-meta.ts", () => {
  it("15. setLastSync + getLastSync — stores and retrieves timestamp", async () => {
    const { setLastSync, getLastSync } = await import("@/lib/idb/sync-meta");
    const now = new Date("2026-06-08T10:00:00Z");
    await setLastSync(BIZ_A, now);
    const got = await getLastSync(BIZ_A);
    expect(got).not.toBeNull();
    expect(got?.toISOString()).toBe(now.toISOString());
  });

  it("16. getLastSync — returns null when no record exists", async () => {
    const { getLastSync } = await import("@/lib/idb/sync-meta");
    const result = await getLastSync("unknown-business");
    expect(result).toBeNull();
  });
});
