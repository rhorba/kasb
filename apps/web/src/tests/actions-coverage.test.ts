/**
 * Targeted coverage tests for partially-covered actions.
 * Covers the remaining uncovered lines in:
 * - actions/ae.ts  (updateAEStep, completeAERegistration, getAEProgress auto-create)
 * - actions/business-profile.ts (updateProfile)
 * - actions/cash-entry.ts (listCashEntries with correctedSet, getCashEntryChartData)
 * - actions/credit.ts (getEligiblePartners, listMyApplications)
 * - actions/stock.ts (listStockItems, updateStockItem)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockAuth,
  mockTxSelect,
  mockTxInsert,
  mockTxUpdate,
  mockDbSelect,
  mockWithUserContext,
  mockMatchPartners,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockTxSelect: vi.fn(),
  mockTxInsert: vi.fn(),
  mockTxUpdate: vi.fn(),
  mockDbSelect: vi.fn(),
  mockWithUserContext: vi.fn(),
  mockMatchPartners: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));

vi.mock("@kasb/db", () => ({
  db: { select: mockDbSelect },
  aeRegistrationProgress: {},
  auditLogs: {},
  businessProfiles: {},
  cashEntries: {},
  creditApplications: {},
  creditScores: {},
  debtEntries: {},
  loanProducts: {},
  microfinancePartners: {},
  stockItems: {},
  withUserContext: mockWithUserContext,
}));

vi.mock("@kasb/credit", () => ({
  matchPartners: mockMatchPartners,
  computeCreditScore: vi.fn(),
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const OWNER_ID = "aaaaaaaa-1001-4000-8000-000000000001";
const BIZ_ID = "bbbbbbbb-1001-4000-8000-000000000001";

const ownerSession = () => ({
  userId: OWNER_ID,
  role: "owner" as const,
  businessId: BIZ_ID,
  partnerOrgId: undefined,
});

const ownerNoProfileSession = () => ({
  ...ownerSession(),
  businessId: undefined,
});

// ─── Shared mock helpers ──────────────────────────────────────────────────────

function setupTx() {
  mockWithUserContext.mockImplementation(
    (_db: unknown, _uid: string, _role: string, fn: (tx: unknown) => unknown) =>
      fn({ select: mockTxSelect, insert: mockTxInsert, update: mockTxUpdate }),
  );
}

function txSelectSeq(...seqs: unknown[][]) {
  let call = 0;
  mockTxSelect.mockImplementation(() => {
    const rows = seqs[call] ?? [];
    call++;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
        }),
      }),
    };
  });
}

function txInsertOk(row?: unknown) {
  mockTxInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(row ? [row] : []),
    }),
  });
}

function txUpdateOk(row: unknown) {
  mockTxUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([row]),
      }),
    }),
  });
}

// ─── ae.ts — updateAEStep + completeAERegistration + getAEProgress auto-create ──

import { completeAERegistration, getAEProgress, updateAEStep } from "@/actions/ae";

const AE_PROGRESS_ID = "cccccccc-1001-4000-8000-000000000001";
const defaultSteps = [
  { id: "quiz", title: "Êtes-vous prêt ?", status: "pending" },
  { id: "simulation", title: "Simulation", status: "pending" },
];

describe("ae.ts — additional coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(ownerSession());
    setupTx();
  });

  it("getAEProgress — auto-creates record when none exists", async () => {
    // First select returns [] (no existing record) → should insert
    txSelectSeq([]);
    const created = {
      id: AE_PROGRESS_ID,
      businessId: BIZ_ID,
      steps: defaultSteps,
      completedAt: null,
      rnaNumber: null,
      createdAt: new Date(),
    };
    txInsertOk(created);

    const result = await getAEProgress();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.steps).toEqual(defaultSteps);
    // Two inserts: aeRegistrationProgress row + auditLog row
    expect(mockTxInsert).toHaveBeenCalledTimes(2);
  });

  it("getAEProgress — returns existing record without creating", async () => {
    const existing = {
      id: AE_PROGRESS_ID,
      businessId: BIZ_ID,
      steps: defaultSteps,
      completedAt: null,
      rnaNumber: null,
      createdAt: new Date(),
    };
    txSelectSeq([existing]);

    const result = await getAEProgress();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe(AE_PROGRESS_ID);
    expect(mockTxInsert).not.toHaveBeenCalled();
  });

  it("updateAEStep — updates step status in existing steps array", async () => {
    const existing = {
      id: AE_PROGRESS_ID,
      businessId: BIZ_ID,
      steps: defaultSteps,
      completedAt: null,
      rnaNumber: null,
      createdAt: new Date(),
    };
    txSelectSeq([existing], [existing]); // first: getAEProgress, second: updateAEStep finds existing
    const updated = {
      ...existing,
      steps: [
        { id: "quiz", title: "Êtes-vous prêt ?", status: "done", completedAt: new Date() },
        defaultSteps[1],
      ],
    };
    txUpdateOk(updated);
    txInsertOk(); // audit log

    const result = await updateAEStep({ stepId: "quiz", status: "done" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(mockTxUpdate).toHaveBeenCalledOnce();
  });

  it("updateAEStep — returns error when no AE progress found", async () => {
    txSelectSeq([]); // no progress record

    const result = await updateAEStep({ stepId: "quiz", status: "done" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/introuvable/i);
  });

  it("completeAERegistration — marks all steps done and saves rnaNumber", async () => {
    const existing = {
      id: AE_PROGRESS_ID,
      businessId: BIZ_ID,
      steps: defaultSteps,
      completedAt: null,
      rnaNumber: null,
      createdAt: new Date(),
    };
    txSelectSeq([existing]);
    const completed = {
      ...existing,
      steps: defaultSteps.map((s) => ({ ...s, status: "done" })),
      completedAt: new Date(),
      rnaNumber: "AE-12345",
    };
    txUpdateOk(completed);
    txInsertOk();

    const result = await completeAERegistration({ rnaNumber: "AE-12345" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(mockTxUpdate).toHaveBeenCalledOnce();
  });

  it("completeAERegistration — without rnaNumber still completes", async () => {
    const existing = {
      id: AE_PROGRESS_ID,
      businessId: BIZ_ID,
      steps: defaultSteps,
      completedAt: null,
      rnaNumber: null,
      createdAt: new Date(),
    };
    txSelectSeq([existing]);
    txUpdateOk({ ...existing, completedAt: new Date() });
    txInsertOk();

    const result = await completeAERegistration({});
    expect(result.ok).toBe(true);
  });
});

// ─── business-profile.ts — updateProfile ─────────────────────────────────────

import { getMyProfile, updateProfile } from "@/actions/business-profile";

describe("business-profile.ts — updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(ownerSession());
    setupTx();
  });

  it("updateProfile — updates and returns updated profile", async () => {
    const before = {
      id: BIZ_ID,
      userId: OWNER_ID,
      name: "Épicerie",
      category: "commerce",
      city: "Casablanca",
    };
    const updated = { ...before, name: "Épicerie Hassan" };
    txSelectSeq([before]); // before-state fetch
    txUpdateOk(updated);
    txInsertOk(); // audit log

    const result = await updateProfile({ name: "Épicerie Hassan" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("Épicerie Hassan");
  });

  it("updateProfile — no profile found → error", async () => {
    txSelectSeq([]);
    const result = await updateProfile({ name: "Test" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/No profile found/i);
  });

  it("getMyProfile — returns null when no profile exists", async () => {
    txSelectSeq([]);
    const result = await getMyProfile();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });
});

// ─── cash-entry.ts — listCashEntries + getCashEntryChartData ─────────────────

import { getCashEntryChartData, getCashEntrySummary, listCashEntries } from "@/actions/cash-entry";

describe("cash-entry.ts — listCashEntries + chartData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(ownerSession());
    setupTx();
  });

  it("listCashEntries — returns empty array when no entries", async () => {
    txSelectSeq([]);
    const result = await listCashEntries({ period: "today" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });

  it("listCashEntries — marks corrected entries", async () => {
    const entry1 = {
      id: "eeeeeeee-1001-4000-8000-000000000001",
      businessId: BIZ_ID,
      type: "income",
      amount: 10000,
      category: "sales",
      entryDate: new Date(),
      correctsId: null,
      source: "manual",
      createdAt: new Date(),
    };
    const entry2 = {
      id: "eeeeeeee-2001-4000-8000-000000000001",
      businessId: BIZ_ID,
      type: "income",
      amount: 10000,
      category: "sales",
      entryDate: new Date(),
      correctsId: entry1.id,
      source: "manual",
      createdAt: new Date(),
    };

    let call = 0;
    mockTxSelect.mockImplementation(() => {
      call++;
      if (call === 1) {
        // First query: returns the two entries
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi
                .fn()
                .mockReturnValue({ limit: vi.fn().mockResolvedValue([entry1, entry2]) }),
            }),
          }),
        };
      }
      // Second query: corrected IDs lookup → entry2 corrects entry1
      return {
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ cid: entry1.id }]) }),
      };
    });

    const result = await listCashEntries({ period: "today", limit: 50 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const corrected = result.data.find((e) => e.id === entry1.id);
    expect(corrected?.isCorrected).toBe(true);
  });

  it("getCashEntrySummary — period='all' returns summary without date filter", async () => {
    mockTxSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ income: 300000, expense: 100000 }]),
      }),
    });
    const result = await getCashEntrySummary({ period: "all" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.net).toBe(200000);
  });

  it("getCashEntryChartData — returns chart day rows", async () => {
    const chartRows = [
      { date: new Date("2026-06-01"), income: 50000, expense: 20000 },
      { date: new Date("2026-06-02"), income: 60000, expense: 25000 },
    ];
    mockTxSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(chartRows),
          }),
        }),
      }),
    });
    const result = await getCashEntryChartData({ period: "month" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Array.isArray(result.data)).toBe(true);
  });
});

// ─── credit.ts — getEligiblePartners + listMyApplications ────────────────────

import { getEligiblePartners, listMyApplications } from "@/actions/credit";

describe("credit.ts — getEligiblePartners + listMyApplications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTx();
    mockMatchPartners.mockReturnValue([]);
  });

  it("getEligiblePartners — no businessId returns empty array", async () => {
    mockAuth.mockResolvedValue(ownerNoProfileSession());
    const result = await getEligiblePartners();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });

  it("getEligiblePartners — no score returns empty array", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    txSelectSeq([]); // no profile found
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    });
    const result = await getEligiblePartners();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });

  it("getEligiblePartners — with score + partners returns filtered list", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const partner = {
      id: "p1",
      name: "Al Amana",
      minScore: 60,
      cities: ["Casablanca"],
      active: true,
    };

    // ctx.tx.select is called twice:
    //   1st: profile (ends with .limit())
    //   2nd: allPartners (ends with .where() — awaited directly, no .limit())
    let txCall = 0;
    mockTxSelect.mockImplementation(() => {
      txCall++;
      if (txCall === 1) {
        // profile: .from().where().limit()
        return {
          from: vi.fn().mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({ limit: vi.fn().mockResolvedValue([{ city: "Casablanca" }]) }),
          }),
        };
      }
      // allPartners: .from().where() — resolved directly as a promise
      const wherePromise = Promise.resolve([partner]);
      return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(wherePromise) }) };
    });

    // db.select (score): .from().where().orderBy().limit()
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ score: 72 }]) }),
        }),
      }),
    });
    mockMatchPartners.mockReturnValue(["p1"]);

    const result = await getEligiblePartners();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("p1");
  });

  it("listMyApplications — no businessId returns empty array", async () => {
    mockAuth.mockResolvedValue(ownerNoProfileSession());
    const result = await listMyApplications();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });

  it("listMyApplications — returns applications for businessId", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const apps = [
      {
        id: "app1",
        businessId: BIZ_ID,
        status: "submitted",
        partnerId: "p1",
        requestedAmount: 500000,
        scoreAtApplication: 72,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    // listMyApplications also ends at .orderBy() with no .limit()
    mockTxSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(apps),
        }),
      }),
    });
    const result = await listMyApplications();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
  });
});

// ─── stock.ts — listStockItems + updateStockItem ──────────────────────────────

import { listStockItems, updateStockItem } from "@/actions/stock";

const ITEM_ID = "dddddddd-1001-4000-8000-000000000001";

const mockItem = {
  id: ITEM_ID,
  businessId: BIZ_ID,
  name: "Huile",
  unit: "litre",
  purchasePrice: 2000,
  sellingPrice: 2500,
  currentStock: 10,
  lowStockThreshold: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setupListSelect(rows: unknown[]) {
  // listStockItems / listMyApplications end at .orderBy() — must resolve directly, no .limit()
  mockTxSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows), // ← resolves directly, no .limit() chained
      }),
    }),
  });
}

describe("stock.ts — listStockItems + updateStockItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(ownerSession());
    setupTx();
  });

  it("listStockItems — returns items for business", async () => {
    setupListSelect([mockItem]);
    const result = await listStockItems();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.name).toBe("Huile");
  });

  it("listStockItems — returns empty array when no items", async () => {
    setupListSelect([]);
    const result = await listStockItems();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });

  it("updateStockItem — updates item successfully", async () => {
    const updated = { ...mockItem, name: "Huile Végétale" };
    txSelectSeq([mockItem]); // existing item
    txUpdateOk(updated);
    txInsertOk(); // audit log

    const result = await updateStockItem({ itemId: ITEM_ID, name: "Huile Végétale" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.name).toBe("Huile Végétale");
  });

  it("updateStockItem — item not found → error", async () => {
    txSelectSeq([]); // not found
    const result = await updateStockItem({ itemId: ITEM_ID, name: "Test" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/introuvable/i);
  });
});
