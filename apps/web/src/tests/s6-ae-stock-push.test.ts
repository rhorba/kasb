/**
 * S6-09 tests — AE simulation math, stock deduction, push notification delivery:
 *
 * Part A — getAEReadiness (AE income simulation math)
 *   1. No entries → zeros, isReady: false
 *   2. Commerce category → 0.5% CPU rate
 *   3. Services category → 1% CPU rate
 *   4. < 3 months → isReady: false
 *   5. 3+ months → isReady: true
 *   6. Monthly average formula: sum / numMonths
 *   7. Annual revenue = avgMonthly × 12
 *   8. CPU tax = annualRevenue × rate%
 *
 * Part B — recordStockSale (stock deduction)
 *   9.  Normal deduction: quantity subtracted correctly
 *   10. Prevents negative stock (throws error)
 *   11. RBAC: partner role blocked
 *   12. Business isolation: item from another business → error
 *
 * Part C — sendPushToUser (VAPID push delivery)
 *   13. No VAPID env keys → skips silently
 *   14. VAPID configured, no subscriptions → no webpush.sendNotification call
 *   15. VAPID configured, 1 subscription → calls sendNotification with payload
 *   16. 410 response → prunes expired subscription from DB
 *   17. 404 response → prunes invalid subscription from DB
 *   18. Multiple subscriptions → sends to all; one 410 doesn't block others
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mock refs ────────────────────────────────────────────────────────

const {
  mockAuth,
  mockTxSelect,
  mockTxInsert,
  mockTxUpdate,
  mockDbSelect,
  mockDbDelete,
  mockWithUserContext,
  mockSendNotification,
  mockSetVapidDetails,
} = vi.hoisted(() => {
  const mockTxSelect = vi.fn();
  const mockTxInsert = vi.fn();
  const mockTxUpdate = vi.fn();
  const mockDbSelect = vi.fn();
  const mockDbDelete = vi.fn();
  const mockWithUserContext = vi.fn();
  const mockSendNotification = vi.fn();
  const mockSetVapidDetails = vi.fn();
  return {
    mockAuth: vi.fn(),
    mockTxSelect,
    mockTxInsert,
    mockTxUpdate,
    mockDbSelect,
    mockDbDelete,
    mockWithUserContext,
    mockSendNotification,
    mockSetVapidDetails,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/auth", () => ({ auth: mockAuth }));

vi.mock("@kasb/db", () => ({
  db: { select: mockDbSelect, delete: mockDbDelete },
  businessProfiles: {},
  aeRegistrationProgress: {},
  cashEntries: {},
  stockItems: {},
  auditLogs: {},
  pushSubscriptions: {},
  withUserContext: mockWithUserContext,
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

// ─── Imports under test (after mocks) ─────────────────────────────────────────

import { getAEReadiness } from "@/actions/ae";
import { recordStockSale } from "@/actions/stock";
import { sendPushToUser } from "@/lib/push/send";

// ─── Constants ────────────────────────────────────────────────────────────────

const OWNER_ID = "aaaaaaaa-1001-4000-8000-000000000001";
const BUSINESS_ID = "bbbbbbbb-1001-4000-8000-000000000001";
const ITEM_ID = "cccccccc-1001-4000-8000-000000000001";

const ownerSession = () => ({
  userId: OWNER_ID,
  role: "owner" as const,
  businessId: BUSINESS_ID,
  partnerOrgId: undefined,
});

const partnerSession = () => ({
  userId: "aaaaaaaa-2001-4000-8000-000000000001",
  role: "partner" as const,
  businessId: undefined,
  partnerOrgId: "dddddddd-1001-4000-8000-000000000001",
});

// ─── Shared mock helpers ──────────────────────────────────────────────────────

function setupTx() {
  mockWithUserContext.mockImplementation(
    (_db: unknown, _uid: string, _role: string, fn: (tx: unknown) => unknown) =>
      fn({ select: mockTxSelect, insert: mockTxInsert, update: mockTxUpdate }),
  );
}

function setupSelectSequence(...responses: unknown[][]) {
  let call = 0;
  mockTxSelect.mockImplementation(() => {
    const resp = responses[call] ?? [];
    call++;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(resp),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(resp),
          }),
        }),
        orderBy: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(resp),
            }),
          }),
        }),
      }),
    };
  });
}

function setupInsertSuccess(row: unknown) {
  mockTxInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([row]),
    }),
  });
}

function setupUpdateSuccess(row: unknown) {
  mockTxUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([row]),
      }),
    }),
  });
}

/** Build a fake cash entry for a given year-month with a given amount */
function makeIncomeEntry(yearMonth: string, amount: number) {
  const [year, month] = yearMonth.split("-").map(Number);
  return {
    amount,
    entryDate: new Date(year as number, (month as number) - 1, 15),
  };
}

// ─── PART A: getAEReadiness ───────────────────────────────────────────────────

describe("getAEReadiness — AE income simulation math", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(ownerSession());
    setupTx();
  });

  it("1. no income entries → zeros + isReady: false", async () => {
    // Select sequence: [businessProfile not needed since businessId in session, income entries empty]
    mockTxSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }));

    const result = await getAEReadiness();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.avgMonthlyRevenueCentimes).toBe(0);
    expect(result.data.annualRevenueCentimes).toBe(0);
    expect(result.data.cpuTaxCentimes).toBe(0);
    expect(result.data.isReady).toBe(false);
    expect(result.data.monthsOfData).toBe(0);
  });

  it("2. commerce category → cpuRatePct = 0.5", async () => {
    const entries = [
      makeIncomeEntry("2026-01", 100000),
      makeIncomeEntry("2026-02", 100000),
      makeIncomeEntry("2026-03", 100000),
    ];
    let selectCall = 0;
    mockTxSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // income entries
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(entries),
            }),
          }),
        };
      }
      // business profile
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ category: "commerce" }]),
          }),
        }),
      };
    });

    const result = await getAEReadiness();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cpuRatePct).toBe(0.5);
  });

  it("3. services category → cpuRatePct = 1", async () => {
    const entries = [
      makeIncomeEntry("2026-01", 100000),
      makeIncomeEntry("2026-02", 100000),
      makeIncomeEntry("2026-03", 100000),
    ];
    let selectCall = 0;
    mockTxSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(entries),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ category: "services" }]),
          }),
        }),
      };
    });

    const result = await getAEReadiness();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cpuRatePct).toBe(1);
  });

  it("4. 2 months of data → isReady: false", async () => {
    const entries = [makeIncomeEntry("2026-01", 80000), makeIncomeEntry("2026-02", 80000)];
    let selectCall = 0;
    mockTxSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(entries) }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockResolvedValue([{ category: "commerce" }]) }),
        }),
      };
    });

    const result = await getAEReadiness();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.isReady).toBe(false);
    expect(result.data.monthsOfData).toBe(2);
  });

  it("5. 3+ months of data → isReady: true", async () => {
    const entries = [
      makeIncomeEntry("2026-01", 80000),
      makeIncomeEntry("2026-02", 80000),
      makeIncomeEntry("2026-03", 80000),
    ];
    let selectCall = 0;
    mockTxSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(entries) }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockResolvedValue([{ category: "commerce" }]) }),
        }),
      };
    });

    const result = await getAEReadiness();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.isReady).toBe(true);
    expect(result.data.monthsOfData).toBe(3);
  });

  it("6. monthly average = sum / numMonths", async () => {
    // Jan: 60,000c  Feb: 120,000c  → avg = 90,000c
    const entries = [makeIncomeEntry("2026-01", 60000), makeIncomeEntry("2026-02", 120000)];
    let selectCall = 0;
    mockTxSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(entries) }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockResolvedValue([{ category: "commerce" }]) }),
        }),
      };
    });

    const result = await getAEReadiness();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.avgMonthlyRevenueCentimes).toBe(90000); // (60k + 120k) / 2
  });

  it("7. annual revenue = avgMonthly × 12", async () => {
    const entries = [
      makeIncomeEntry("2026-01", 50000),
      makeIncomeEntry("2026-02", 50000),
      makeIncomeEntry("2026-03", 50000),
    ];
    let selectCall = 0;
    mockTxSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(entries) }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockResolvedValue([{ category: "commerce" }]) }),
        }),
      };
    });

    const result = await getAEReadiness();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.annualRevenueCentimes).toBe(result.data.avgMonthlyRevenueCentimes * 12);
  });

  it("8. CPU tax = annualRevenue × rate/100 (commerce: 0.5%)", async () => {
    // avg monthly = 100,000c → annual = 1,200,000c → tax = 6,000c (0.5%)
    const entries = [
      makeIncomeEntry("2026-01", 100000),
      makeIncomeEntry("2026-02", 100000),
      makeIncomeEntry("2026-03", 100000),
    ];
    let selectCall = 0;
    mockTxSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(entries) }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockResolvedValue([{ category: "commerce" }]) }),
        }),
      };
    });

    const result = await getAEReadiness();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { annualRevenueCentimes, cpuTaxCentimes, cpuRatePct } = result.data;
    expect(cpuTaxCentimes).toBe(Math.round(annualRevenueCentimes * (cpuRatePct / 100)));
    expect(cpuTaxCentimes).toBe(6000); // 1,200,000 × 0.005
  });
});

// ─── PART B: recordStockSale ──────────────────────────────────────────────────

describe("recordStockSale — stock deduction", () => {
  const mockItem = {
    id: ITEM_ID,
    businessId: BUSINESS_ID,
    name: "Huile",
    unit: "litre",
    currentStock: 10,
    lowStockThreshold: 2,
    purchasePrice: 2000,
    sellingPrice: 2500,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(ownerSession());
    setupTx();
  });

  it("9. normal deduction returns updated stock", async () => {
    const updatedItem = { ...mockItem, currentStock: 7 };
    setupSelectSequence([mockItem]); // existing item
    setupUpdateSuccess(updatedItem); // update currentStock
    setupInsertSuccess({}); // auditLog (no .returning needed)

    const result = await recordStockSale({ itemId: ITEM_ID, quantity: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.currentStock).toBe(7);
  });

  it("10. prevents negative stock → error", async () => {
    setupSelectSequence([mockItem]); // stock = 10

    const result = await recordStockSale({ itemId: ITEM_ID, quantity: 15 }); // want 15, have 10
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/insuffisant/i);
  });

  it("11. partner role → forbidden", async () => {
    mockAuth.mockResolvedValue(partnerSession());

    const result = await recordStockSale({ itemId: ITEM_ID, quantity: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("forbidden");
  });

  it("12. item from another business → error", async () => {
    setupSelectSequence([]); // empty → not found in this business

    const result = await recordStockSale({ itemId: ITEM_ID, quantity: 1 });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/introuvable/i);
  });
});

// ─── PART C: sendPushToUser ───────────────────────────────────────────────────

describe("sendPushToUser — push notification delivery", () => {
  const userId = OWNER_ID;
  const payload = { title: "Test", body: "Hello" };

  const fakeSub = {
    id: "eeeeeeee-1001-4000-8000-000000000001",
    userId,
    endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
    p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlqHgx9tSuJKlVBjuklIGDM==",
    auth: "tBHItJI5svbpez7KI4CCXg==",
    createdAt: new Date(),
  };

  function setupDbSelectSubs(subs: unknown[]) {
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(subs),
      }),
    });
  }

  function setupDbDeleteSub() {
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear VAPID env vars between tests (empty string = falsy in the guard check)
    process.env.VAPID_PUBLIC_KEY = "";
    process.env.VAPID_PRIVATE_KEY = "";
    process.env.VAPID_EMAIL = "";
  });

  it("13. no VAPID keys → returns without calling sendNotification", async () => {
    await sendPushToUser(userId, payload);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("14. VAPID configured, no subscriptions → no sendNotification call", async () => {
    process.env.VAPID_PUBLIC_KEY = "fake-pub";
    process.env.VAPID_PRIVATE_KEY = "fake-priv";
    process.env.VAPID_EMAIL = "admin@kasb.ma";
    setupDbSelectSubs([]);

    await sendPushToUser(userId, payload);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("15. VAPID configured + 1 subscription → sends with correct payload", async () => {
    process.env.VAPID_PUBLIC_KEY = "fake-pub";
    process.env.VAPID_PRIVATE_KEY = "fake-priv";
    process.env.VAPID_EMAIL = "admin@kasb.ma";
    setupDbSelectSubs([fakeSub]);
    mockSendNotification.mockResolvedValue(undefined);

    await sendPushToUser(userId, payload);

    expect(mockSendNotification).toHaveBeenCalledOnce();
    const [sub, bodyStr] = mockSendNotification.mock.calls[0] as [unknown, string];
    expect((sub as { endpoint: string }).endpoint).toBe(fakeSub.endpoint);
    const body = JSON.parse(bodyStr) as { title: string; body: string };
    expect(body.title).toBe("Test");
    expect(body.body).toBe("Hello");
  });

  it("16. 410 Gone → prunes expired subscription from DB", async () => {
    process.env.VAPID_PUBLIC_KEY = "fake-pub";
    process.env.VAPID_PRIVATE_KEY = "fake-priv";
    process.env.VAPID_EMAIL = "admin@kasb.ma";
    setupDbSelectSubs([fakeSub]);
    setupDbDeleteSub();
    mockSendNotification.mockRejectedValue({ statusCode: 410 });

    await sendPushToUser(userId, payload);

    expect(mockDbDelete).toHaveBeenCalled();
  });

  it("17. 404 Not Found → prunes invalid subscription from DB", async () => {
    process.env.VAPID_PUBLIC_KEY = "fake-pub";
    process.env.VAPID_PRIVATE_KEY = "fake-priv";
    process.env.VAPID_EMAIL = "admin@kasb.ma";
    setupDbSelectSubs([fakeSub]);
    setupDbDeleteSub();
    mockSendNotification.mockRejectedValue({ statusCode: 404 });

    await sendPushToUser(userId, payload);

    expect(mockDbDelete).toHaveBeenCalled();
  });

  it("18. multiple subscriptions: 410 on one doesn't block others", async () => {
    process.env.VAPID_PUBLIC_KEY = "fake-pub";
    process.env.VAPID_PRIVATE_KEY = "fake-priv";
    process.env.VAPID_EMAIL = "admin@kasb.ma";

    const sub2 = { ...fakeSub, id: "sub2", endpoint: "https://fcm.example.com/sub2" };
    setupDbSelectSubs([fakeSub, sub2]);
    setupDbDeleteSub();

    // First sub: 410 expired; second sub: success
    mockSendNotification
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockResolvedValueOnce(undefined);

    await sendPushToUser(userId, payload);

    // Both sends were attempted
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    // First sub was pruned
    expect(mockDbDelete).toHaveBeenCalled();
  });
});
