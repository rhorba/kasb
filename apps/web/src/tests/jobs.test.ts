/**
 * Coverage for lib/jobs/score-sweep.ts and lib/jobs/stock-alerts.ts
 *
 * Part A — runScoreSweep
 *   1. no businesses → returns { computed: 0, skipped: 0 }
 *   2. business with insufficient entries → skipped
 *   3. business with enough data → score computed and inserted
 *   4. score improves by ≥ 5 → notification inserted + push sent
 *   5. score does NOT improve → no notification
 *   6. today score already exists → updates instead of inserts
 *
 * Part B — runStockAlerts
 *   7. no low-stock items → returns { notified: 0, skipped: 0 }
 *   8. low-stock item, not yet notified today → creates notification + push
 *   9. low-stock item already notified today → skipped
 *  10. threshold = 0 → not considered low-stock
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mock refs ────────────────────────────────────────────────────────

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockComputeScore,
  mockMatchPartners,
  mockSendPush,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockComputeScore: vi.fn(),
  mockMatchPartners: vi.fn(),
  mockSendPush: vi.fn(),
}));

vi.mock("@kasb/db", () => ({
  db: { select: mockDbSelect, insert: mockDbInsert, update: mockDbUpdate },
  businessProfiles: {},
  cashEntries: {},
  creditScores: {},
  debtEntries: {},
  microfinancePartners: {},
  notifications: {},
  stockItems: {},
  users: {},
}));

vi.mock("@kasb/credit", () => ({
  computeCreditScore: mockComputeScore,
  matchPartners: mockMatchPartners,
}));

vi.mock("@/lib/push/send", () => ({
  sendPushToUser: mockSendPush,
}));

import { runScoreSweep } from "@/lib/jobs/score-sweep";
import { runStockAlerts } from "@/lib/jobs/stock-alerts";

// ─── Constants ────────────────────────────────────────────────────────────────

const BIZ_ID = "bbbbbbbb-1001-4000-8000-000000000001";
const USER_ID = "aaaaaaaa-1001-4000-8000-000000000001";
const ITEM_ID = "cccccccc-1001-4000-8000-000000000001";
const NOTIF_ID = "dddddddd-1001-4000-8000-000000000001";

// ─── Select sequence helper ───────────────────────────────────────────────────

function setupSelectSequence(...responses: unknown[][]) {
  let call = 0;
  mockDbSelect.mockImplementation(() => {
    const resp = responses[call] ?? [];
    call++;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(resp),
          }),
          limit: vi.fn().mockResolvedValue(resp),
        }),
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(resp),
          }),
          where: vi.fn().mockResolvedValue(resp),
        }),
      }),
    };
  });
}

function setupInsert() {
  mockDbInsert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
}

function setupUpdate() {
  mockDbUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

// ─── PART A: runScoreSweep ────────────────────────────────────────────────────

describe("runScoreSweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendPush.mockResolvedValue(undefined);
    setupInsert();
    setupUpdate();
  });

  it("1. no businesses → computed:0 skipped:0", async () => {
    // businesses query returns empty, partners query returns empty
    setupSelectSequence([], []);
    const result = await runScoreSweep();
    expect(result).toEqual({ computed: 0, skipped: 0 });
  });

  it("2. insufficient data → skipped", async () => {
    mockComputeScore.mockReturnValue(null); // < 30 entries
    mockMatchPartners.mockReturnValue([]);

    // businesses, partners, entries, debts, prevScore, todayScore
    setupSelectSequence(
      [{ businessId: BIZ_ID, userId: USER_ID, city: "Casablanca" }], // businesses
      [], // partners
      [], // entries (for this business)
      [], // debts
      [], // prevScore
      [], // todayScore
    );

    const result = await runScoreSweep();
    expect(result.skipped).toBe(1);
    expect(result.computed).toBe(0);
  });

  it("3. valid data → score inserted, computed:1", async () => {
    const fakeScore = {
      score: 68,
      components: {
        revenueConsistency: 20,
        expenseControl: 18,
        growthTrend: 13,
        debtRecoveryRate: 10,
        dataRichness: 7,
      },
      monthsOfData: 4,
      computedAt: new Date(),
    };
    mockComputeScore.mockReturnValue(fakeScore);
    mockMatchPartners.mockReturnValue(["partner-1"]);

    setupSelectSequence(
      [{ businessId: BIZ_ID, userId: USER_ID, city: "Casablanca" }], // businesses
      [{ id: "p1", name: "Al Amana", minScore: 60, cities: ["Casablanca"], active: true }], // partners
      [
        {
          id: "e1",
          businessId: BIZ_ID,
          type: "income",
          amount: 10000,
          category: "sales",
          entryDate: new Date(),
          source: "manual",
          createdAt: new Date(),
        },
      ], // entries
      [], // debts
      [{ score: 65 }], // prevScore (improvement = 68-65 = 3, < 5 → no notification)
      [], // todayScore (none today → insert path)
    );

    const result = await runScoreSweep();
    expect(result.computed).toBe(1);
    expect(mockDbInsert).toHaveBeenCalledOnce(); // score insert
  });

  it("4. score improves ≥ 5 → notification + push sent", async () => {
    const fakeScore = {
      score: 75,
      components: {
        revenueConsistency: 22,
        expenseControl: 20,
        growthTrend: 15,
        debtRecoveryRate: 12,
        dataRichness: 6,
      },
      monthsOfData: 5,
      computedAt: new Date(),
    };
    mockComputeScore.mockReturnValue(fakeScore);
    mockMatchPartners.mockReturnValue(["p1"]);

    let insertCount = 0;
    mockDbInsert.mockImplementation(() => {
      insertCount++;
      return { values: vi.fn().mockResolvedValue(undefined) };
    });

    setupSelectSequence(
      [{ businessId: BIZ_ID, userId: USER_ID, city: "Casablanca" }],
      [],
      [
        {
          id: "e1",
          businessId: BIZ_ID,
          type: "income",
          amount: 10000,
          category: "sales",
          entryDate: new Date(),
          source: "manual",
          createdAt: new Date(),
        },
      ],
      [],
      [{ score: 60 }], // prev=60, new=75 → +15 ≥ 5
      [],
    );

    await runScoreSweep();
    // Should have inserted score (1) + notification (2)
    expect(insertCount).toBe(2);
    expect(mockSendPush).toHaveBeenCalledOnce();
    expect(mockSendPush).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ title: expect.stringContaining("75") }),
    );
  });

  it("5. score improves < 5 → no notification", async () => {
    const fakeScore = {
      score: 63,
      components: {
        revenueConsistency: 19,
        expenseControl: 17,
        growthTrend: 12,
        debtRecoveryRate: 10,
        dataRichness: 5,
      },
      monthsOfData: 3,
      computedAt: new Date(),
    };
    mockComputeScore.mockReturnValue(fakeScore);
    mockMatchPartners.mockReturnValue([]);

    let insertCount = 0;
    mockDbInsert.mockImplementation(() => {
      insertCount++;
      return { values: vi.fn().mockResolvedValue(undefined) };
    });

    setupSelectSequence(
      [{ businessId: BIZ_ID, userId: USER_ID, city: "Casablanca" }],
      [],
      [
        {
          id: "e1",
          businessId: BIZ_ID,
          type: "income",
          amount: 10000,
          category: "sales",
          entryDate: new Date(),
          source: "manual",
          createdAt: new Date(),
        },
      ],
      [],
      [{ score: 61 }], // improvement = 2, < 5
      [],
    );

    await runScoreSweep();
    expect(insertCount).toBe(1); // only score insert, no notification
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("6. today score exists → update path", async () => {
    const fakeScore = {
      score: 70,
      components: {
        revenueConsistency: 21,
        expenseControl: 19,
        growthTrend: 14,
        debtRecoveryRate: 11,
        dataRichness: 5,
      },
      monthsOfData: 4,
      computedAt: new Date(),
    };
    mockComputeScore.mockReturnValue(fakeScore);
    mockMatchPartners.mockReturnValue([]);

    setupSelectSequence(
      [{ businessId: BIZ_ID, userId: USER_ID, city: "Casablanca" }],
      [],
      [
        {
          id: "e1",
          businessId: BIZ_ID,
          type: "income",
          amount: 10000,
          category: "sales",
          entryDate: new Date(),
          source: "manual",
          createdAt: new Date(),
        },
      ],
      [],
      [{ score: 70 }],
      [{ id: "existing-score-id" }], // today score exists → update
    );

    await runScoreSweep();
    expect(mockDbUpdate).toHaveBeenCalledOnce(); // update, not insert
    expect(mockDbInsert).not.toHaveBeenCalled();
  });
});

// ─── PART B: runStockAlerts ───────────────────────────────────────────────────

describe("runStockAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendPush.mockResolvedValue(undefined);
    setupInsert();
  });

  const mockLowItem = {
    itemId: ITEM_ID,
    itemName: "Huile",
    currentStock: 3,
    threshold: 5,
    unit: "litre",
    businessId: BIZ_ID,
    ownerId: USER_ID,
  };

  it("7. no low-stock items → notified:0 skipped:0", async () => {
    // Low-stock items query returns empty
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    const result = await runStockAlerts();
    expect(result).toEqual({ notified: 0, skipped: 0 });
  });

  it("8. low-stock item not yet notified → notification created + push", async () => {
    let selectCall = 0;
    mockDbSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // Low-stock items query
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockLowItem]),
              }),
            }),
          }),
        };
      }
      // Idempotency check — no existing notification today
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
    });

    const result = await runStockAlerts();
    expect(result.notified).toBe(1);
    expect(result.skipped).toBe(0);
    expect(mockDbInsert).toHaveBeenCalledOnce();
    expect(mockSendPush).toHaveBeenCalledOnce();
    expect(mockSendPush).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ title: expect.stringContaining("Huile") }),
    );
  });

  it("9. already notified today → skipped", async () => {
    let selectCall = 0;
    mockDbSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockLowItem]),
              }),
            }),
          }),
        };
      }
      // Idempotency check — existing notification found
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: NOTIF_ID }]),
          }),
        }),
      };
    });

    const result = await runStockAlerts();
    expect(result.notified).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});
