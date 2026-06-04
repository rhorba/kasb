/**
 * S3-07 tests — offline sync layer:
 * 1. Darija/Arabic number parser — fixture phrases → correct centimes
 * 2. OCR receipt parser — TOTAL label, Arabic-Indic digits, date extraction
 * 3. IDB offline entry — saved with syncStatus=pending, enqueued in sync_queue
 * 4. /api/sync dedup — same offlineId twice → 1 DB row, both succeed
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── 1. Darija number parser — pure unit tests (no mocks needed) ──────────────

import { extractDescription, parseAmountFromTranscript } from "@/lib/voice/number-parser";

describe("parseAmountFromTranscript — Darija / Arabic numbers", () => {
  it("parses Western digits: '120' → 12000 centimes", () => {
    expect(parseAmountFromTranscript("120")).toBe(12000);
  });

  it("parses decimal MAD: '15.50 درهم' → 1550 centimes", () => {
    expect(parseAmountFromTranscript("15.50 درهم")).toBe(1550);
  });

  it("parses Arabic-Indic digits: '١٢٠' → 12000 centimes", () => {
    expect(parseAmountFromTranscript("١٢٠")).toBe(12000);
  });

  it("parses Darija word 'خمسمية' → 50000 centimes (500 MAD)", () => {
    expect(parseAmountFromTranscript("خمسمية درهم بزاف دوا")).toBe(50000);
  });

  it("parses 'ألف و نص' → 150000 centimes (1500 MAD)", () => {
    expect(parseAmountFromTranscript("ألف و نص")).toBe(150000);
  });

  it("parses 'عشرين درهم' → 2000 centimes (20 MAD)", () => {
    expect(parseAmountFromTranscript("عشرين درهم")).toBe(2000);
  });

  it("parses 'خمسة' → 500 centimes (5 MAD)", () => {
    expect(parseAmountFromTranscript("خمسة")).toBe(500);
  });

  it("returns null for empty string", () => {
    expect(parseAmountFromTranscript("")).toBeNull();
  });

  it("returns null for text with no recognisable number", () => {
    expect(parseAmountFromTranscript("شكرا بزاف")).toBeNull();
  });

  it("parses comma-decimal: '15,50' → 1550 centimes", () => {
    expect(parseAmountFromTranscript("15,50")).toBe(1550);
  });
});

describe("extractDescription", () => {
  it("removes digit sequence and 'درهم' label from transcript", () => {
    const desc = extractDescription("١٢٠ درهم سلع", 12000);
    expect(desc).not.toContain("درهم");
    // Remaining meaningful text preserved
    expect(desc).toContain("سلع");
  });

  it("returns original transcript when amount is null", () => {
    expect(extractDescription("شكرا بزاف", null)).toBe("شكرا بزاف");
  });
});

// ─── 2. OCR receipt parser — pure unit tests ─────────────────────────────────

import { parseReceiptText } from "@/lib/ocr/receipt-parser";

describe("parseReceiptText — TOTAL extraction", () => {
  it("extracts amount from 'Total TTC: 150.00' line", () => {
    const draft = parseReceiptText("Épicerie Hassan\nTotal TTC: 150.00\nMerci");
    expect(draft.amountCentimes).toBe(15000);
  });

  it("extracts amount from 'TOTAL 85 MAD' pattern", () => {
    const draft = parseReceiptText("TOTAL 85 MAD\n23/05/2026");
    expect(draft.amountCentimes).toBe(8500);
  });

  it("extracts amount from Arabic-Indic suffix '٢٠٠ درهم'", () => {
    const draft = parseReceiptText("المجموع ٢٠٠ درهم");
    // ٢٠٠ = 200 MAD → 20000 centimes
    expect(draft.amountCentimes).toBe(20000);
  });

  it("extracts description from first non-digit line", () => {
    const draft = parseReceiptText("Café Central\nTotal: 45.00 MAD");
    expect(draft.description).toBe("Café Central");
  });

  it("extracts date in DD/MM/YYYY format", () => {
    const draft = parseReceiptText("Store\nTotal: 100\n04/06/2026");
    expect(draft.date).toBe("2026-06-04");
  });

  it("extracts date in YYYY-MM-DD format", () => {
    const draft = parseReceiptText("Store\nTotal: 100\n2026-06-04");
    expect(draft.date).toBe("2026-06-04");
  });

  it("returns confidence=low when no amount found", () => {
    const draft = parseReceiptText("blurry unreadable text");
    expect(draft.confidence).toBe("low");
    expect(draft.amountCentimes).toBeNull();
  });

  it("returns confidence=high when amount + description found", () => {
    const draft = parseReceiptText("Marché Derb Sultan\nTotal TTC: 200.00");
    expect(draft.confidence).toBe("high");
    expect(draft.amountCentimes).toBe(20000);
  });

  it("preserves raw text verbatim", () => {
    const raw = "Store ABC\nTotal: 50.00";
    const draft = parseReceiptText(raw);
    expect(draft.rawText).toBe(raw);
  });
});

// ─── 3. IDB offline entry — tests with fake-indexeddb ────────────────────────
// fake-indexeddb polyfills the global indexedDB in the jsdom environment.

import "fake-indexeddb/auto";

// Reset IDB state between tests
beforeEach(() => {
  // Delete all databases between tests
  // fake-indexeddb exposes IDBFactory on globalThis
  // The simplest reset: clear the module cache so getDB() returns a fresh connection
  vi.resetModules();
});

describe("createOfflineEntry — IDB write", () => {
  it("saves entry with syncStatus=pending", async () => {
    // Re-import after resetModules so _db is null again
    const { createOfflineEntry: createEntry } = await import("@/lib/idb/offline-entry");
    const { getPendingEntries: getPending } = await import("@/lib/idb/entries");

    const entry = await createEntry({
      businessId: "b-1",
      type: "income",
      amount: 15000,
      category: "sales",
      entryDate: new Date("2026-06-04"),
      source: "manual",
    });

    expect(entry.syncStatus).toBe("pending");
    expect(entry.offlineId).toBeTruthy();
    expect(entry.amount).toBe(15000);

    const pending = await getPending("b-1");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.offlineId).toBe(entry.offlineId);
  });

  it("saves entry to sync_queue", async () => {
    const { createOfflineEntry: createEntry } = await import("@/lib/idb/offline-entry");
    const { getAllQueued: getQueued } = await import("@/lib/idb/queue");

    const entry = await createEntry({
      businessId: "b-1",
      type: "expense",
      amount: 5000,
      category: "transport",
      entryDate: new Date("2026-06-04"),
      source: "manual",
    });

    const queued = await getQueued();
    expect(queued.length).toBeGreaterThan(0);
    const queueItem = queued.find((q) => q.offlineId === entry.offlineId);
    expect(queueItem).toBeDefined();
    expect(queueItem?.operation).toBe("create");
    expect(queueItem?.entity).toBe("cash_entry");
  });

  it("generates a unique offlineId per entry", async () => {
    const { createOfflineEntry: createEntry } = await import("@/lib/idb/offline-entry");

    const [e1, e2] = await Promise.all([
      createEntry({
        businessId: "b-1",
        type: "income",
        amount: 1000,
        category: "sales",
        entryDate: new Date(),
        source: "manual",
      }),
      createEntry({
        businessId: "b-1",
        type: "income",
        amount: 2000,
        category: "sales",
        entryDate: new Date(),
        source: "manual",
      }),
    ]);

    expect(e1.offlineId).not.toBe(e2.offlineId);
  });
});

// ─── 4. /api/sync dedup — same offlineId twice → 1 DB row ───────────────────

const { mockAuth, mockWithUserContext } = vi.hoisted(() => {
  const mockWithUserContext = vi.fn();
  return { mockAuth: vi.fn(), mockWithUserContext };
});

vi.mock("@/auth", () => ({ auth: mockAuth }));

vi.mock("@kasb/db", () => ({
  db: {},
  businessProfiles: {},
  cashEntries: {},
  auditLogs: {},
  withUserContext: mockWithUserContext,
}));

// Lazy import of the route handler AFTER mocks
async function importSyncRoute() {
  const mod = await import("@/app/api/sync/route");
  return mod.POST;
}

const BUSINESS_ID = "b-sync-test";
const OFFLINE_ID = "00000000-feed-4a00-beef-000000000001";

const syncPayload = (offlineId: string) => ({
  entries: [
    {
      offlineId,
      _queueId: 1,
      type: "income",
      amount: 30000,
      category: "sales",
      entryDate: new Date().toISOString(),
      source: "sync",
    },
  ],
  lastSyncAt: null,
});

function setupSyncMocks(existingEntry: { id: string } | null) {
  mockAuth.mockResolvedValue({ userId: "u-1", role: "owner", businessId: BUSINESS_ID });

  mockWithUserContext.mockImplementation(
    (_db: unknown, _uid: string, _role: string, fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(existingEntry ? [existingEntry] : []),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "srv-entry-1" }]),
          }),
        }),
      };
      return fn(tx);
    },
  );
}

describe("/api/sync — offlineId deduplication", () => {
  it("inserts a new entry on first sync and returns created ack", async () => {
    setupSyncMocks(null); // no existing entry
    const POST = await importSyncRoute();

    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(syncPayload(OFFLINE_ID)),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.created).toHaveLength(1);
    expect(body.created[0].offlineId).toBe(OFFLINE_ID);
    expect(body.errors).toHaveLength(0);
  });

  it("returns success without re-inserting when offlineId already exists (dedup)", async () => {
    // Simulate the entry already being in DB (second sync of same offlineId)
    setupSyncMocks({ id: "existing-entry-id" });
    const POST = await importSyncRoute();

    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(syncPayload(OFFLINE_ID)),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Should still acknowledge the entry (not an error)
    expect(body.created).toHaveLength(1);
    expect(body.created[0].offlineId).toBe(OFFLINE_ID);
    expect(body.created[0].serverId).toBe("existing-entry-id");
    expect(body.errors).toHaveLength(0);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const POST = await importSyncRoute();

    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(syncPayload(OFFLINE_ID)),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with empty arrays when entries list is empty", async () => {
    mockAuth.mockResolvedValue({ userId: "u-1", role: "owner", businessId: BUSINESS_ID });
    mockWithUserContext.mockResolvedValue(undefined);
    const POST = await importSyncRoute();

    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: [], lastSyncAt: null }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.created).toHaveLength(0);
    expect(body.errors).toHaveLength(0);
  });

  it("returns 400 for invalid payload", async () => {
    mockAuth.mockResolvedValue({ userId: "u-1", role: "owner", businessId: BUSINESS_ID });
    const POST = await importSyncRoute();

    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notEntries: "wrong" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
