import { formatMAD, parseMADToCentimes } from "@/lib/utils";
/**
 * S2-09 tests:
 * 1. createCashEntrySchema Zod validation
 * 2. Money utility functions (formatMAD, parseMADToCentimes)
 * 3. Cash entry action RBAC — partner/unauthenticated blocked
 * 4. Correction flow guards — no double-correction, no correcting a correction
 * 5. Summary math — net = income − expense
 * 6. Append-only structural check — no deleteCashEntry export
 * 7. offlineId uniqueness invariant in schema
 */
import { createCashEntrySchema } from "@kasb/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mock refs ────────────────────────────────────────────────────────

const { mockAuth, mockSelect, mockInsert } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  return { mockAuth: vi.fn(), mockSelect, mockInsert };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/auth", () => ({ auth: mockAuth }));

vi.mock("@kasb/db", () => ({
  db: {},
  businessProfiles: {},
  cashEntries: {},
  auditLogs: {},
  withUserContext: vi.fn(
    (_db: unknown, _uid: string, _role: string, fn: (tx: unknown) => unknown) =>
      fn({ select: mockSelect, insert: mockInsert }),
  ),
}));

// ─── Import under test (after mocks) ─────────────────────────────────────────

import {
  correctCashEntry,
  createCashEntry,
  getCashEntrySummary,
  listCashEntries,
} from "@/actions/cash-entry";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ownerSession = () => ({
  userId: "u-1",
  role: "owner" as const,
  businessId: "b-1", // pre-set so requireBusinessId skips DB lookup
  partnerOrgId: undefined,
});

const partnerSession = () => ({
  userId: "u-p",
  role: "partner" as const,
  businessId: undefined,
  partnerOrgId: "p-org-1",
});

const validEntry = {
  type: "income" as const,
  amount: 150000, // 1 500 MAD in centimes
  category: "sales" as const,
  entryDate: new Date("2026-06-04T10:00:00Z"),
  source: "manual" as const,
};

/** Sets up mockSelect to return responses in sequence (one per call) */
function setupSelectResponses(...responses: unknown[][]) {
  let call = 0;
  mockSelect.mockImplementation(() => {
    const resp = responses[call] ?? [];
    call++;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(resp),
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(resp) }),
        }),
        // For summary: where() resolves directly (no .limit())
      }),
    };
  });
}

function setupSummarySelect(income: number, expense: number) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ income, expense }]),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: select returns empty, insert returns a mock entry
  setupSelectResponses([]);
  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi
        .fn()
        .mockResolvedValue([
          { id: "e-1", businessId: "b-1", ...validEntry, createdAt: new Date() },
        ]),
    }),
  });
});

// ─── 1. createCashEntrySchema validation ─────────────────────────────────────

describe("createCashEntrySchema", () => {
  it("accepts a valid income entry", () => {
    expect(() => createCashEntrySchema.parse(validEntry)).not.toThrow();
  });

  it("accepts a valid expense entry with all optional fields", () => {
    expect(() =>
      createCashEntrySchema.parse({
        type: "expense",
        amount: 45000,
        category: "rent",
        entryDate: new Date(),
        source: "manual",
        description: "Loyer juin",
        offlineId: "00000000-0000-0000-0000-000000000001",
      }),
    ).not.toThrow();
  });

  it("rejects zero amount (must be positive)", () => {
    expect(() => createCashEntrySchema.parse({ ...validEntry, amount: 0 })).toThrow();
  });

  it("rejects negative amount", () => {
    expect(() => createCashEntrySchema.parse({ ...validEntry, amount: -100 })).toThrow();
  });

  it("rejects fractional centimes (non-integer)", () => {
    // Money invariant: centimes must be integer
    expect(() => createCashEntrySchema.parse({ ...validEntry, amount: 150.5 })).toThrow();
  });

  it("rejects invalid entry type", () => {
    expect(() => createCashEntrySchema.parse({ ...validEntry, type: "transfer" })).toThrow();
  });

  it("rejects invalid category", () => {
    expect(() => createCashEntrySchema.parse({ ...validEntry, category: "salary" })).toThrow();
  });

  it("rejects description longer than 500 characters", () => {
    expect(() =>
      createCashEntrySchema.parse({ ...validEntry, description: "x".repeat(501) }),
    ).toThrow();
  });

  it("accepts all 10 valid categories", () => {
    const categories = [
      "sales",
      "stock_purchase",
      "rent",
      "transport",
      "staff",
      "loan_repayment",
      "equipment",
      "utilities",
      "other_income",
      "other_expense",
    ] as const;
    for (const category of categories) {
      expect(() => createCashEntrySchema.parse({ ...validEntry, category })).not.toThrow();
    }
  });
});

// ─── 2. Money utility functions ───────────────────────────────────────────────

describe("formatMAD", () => {
  it("formats centimes as MAD string", () => {
    expect(formatMAD(150000)).toContain("1");
    expect(formatMAD(150000)).toContain("MAD");
  });

  it("formats zero as 0 MAD", () => {
    expect(formatMAD(0)).toContain("0");
    expect(formatMAD(0)).toContain("MAD");
  });

  it("uses absolute value for negative amounts (display only)", () => {
    // Negative centimes are shown without minus sign (caller adds +/- context)
    expect(formatMAD(-50000)).not.toContain("-");
    expect(formatMAD(-50000)).toContain("MAD");
  });
});

describe("parseMADToCentimes", () => {
  it("converts whole MAD string to centimes", () => {
    expect(parseMADToCentimes("1500")).toBe(150000);
  });

  it("converts decimal MAD string to centimes (rounds)", () => {
    expect(parseMADToCentimes("15.50")).toBe(1550);
    expect(parseMADToCentimes("15.5")).toBe(1550);
  });

  it("returns 0 for empty string", () => {
    expect(parseMADToCentimes("")).toBe(0);
  });

  it("handles single-digit amounts", () => {
    expect(parseMADToCentimes("3")).toBe(300);
  });

  it("rounds sub-centime values", () => {
    expect(parseMADToCentimes("1.999")).toBe(200); // 1.999 MAD → 199.9 centimes → 200
  });
});

// ─── 3. Action RBAC ───────────────────────────────────────────────────────────

describe("cash entry actions — RBAC", () => {
  it("createCashEntry returns forbidden for partner role", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    const result = await createCashEntry(validEntry);
    expect(result).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("createCashEntry returns unauthenticated when no session", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createCashEntry(validEntry);
    expect(result).toMatchObject({ ok: false, error: "unauthenticated" });
  });

  it("listCashEntries returns forbidden for partner role", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    const result = await listCashEntries({ period: "today" });
    expect(result).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("getCashEntrySummary returns forbidden for partner role", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    const result = await getCashEntrySummary({ period: "today" });
    expect(result).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("createCashEntry returns server_error when Zod validation fails", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const result = await createCashEntry({ amount: -100, type: "income" });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
  });
});

// ─── 4. Correction flow guards ────────────────────────────────────────────────

describe("correctCashEntry — guards", () => {
  it("returns server_error when original entry not found", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    // DB returns empty (entry not found)
    setupSelectResponses([]);
    const result = await correctCashEntry({
      entryId: "00000000-0000-0000-0000-000000000001",
      ...validEntry,
    });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
    expect(result.ok === false && result.message).toContain("introuvable");
  });

  it("returns server_error when correcting an existing correction", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const ENTRY_UUID = "00000000-0000-0000-0000-000000000002";
    const ORIG_UUID = "00000000-0000-0000-0000-000000000003";
    // Select returns original entry that already HAS a correctsId (so it's a correction itself)
    setupSelectResponses([
      { id: ENTRY_UUID, businessId: "b-1", correctsId: ORIG_UUID, ...validEntry },
    ]);
    const result = await correctCashEntry({ entryId: ENTRY_UUID, ...validEntry });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
    expect(result.ok === false && result.message).toContain("correction");
  });

  it("returns server_error when entry already has a correction", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const ENTRY_UUID = "00000000-0000-0000-0000-000000000004";
    const CORR_UUID = "00000000-0000-0000-0000-000000000005";
    // First select: original entry (no correctsId)
    // Second select: existing correction found
    setupSelectResponses(
      [{ id: ENTRY_UUID, businessId: "b-1", correctsId: null, ...validEntry }],
      [{ id: CORR_UUID }],
    );
    const result = await correctCashEntry({ entryId: ENTRY_UUID, ...validEntry });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
    expect(result.ok === false && result.message).toContain("déjà");
  });
});

// ─── 5. Summary math — net = income − expense ────────────────────────────────

describe("getCashEntrySummary — math", () => {
  it("returns net = income − expense", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    setupSummarySelect(150000, 60000);
    const result = await getCashEntrySummary({ period: "today" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.income).toBe(150000);
      expect(result.data.expense).toBe(60000);
      expect(result.data.net).toBe(90000); // 1500 - 600 = 900 MAD = 90000 centimes
    }
  });

  it("returns zero net when no entries", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    setupSummarySelect(0, 0);
    const result = await getCashEntrySummary({ period: "today" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.net).toBe(0);
    }
  });

  it("net is negative when expenses exceed income", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    setupSummarySelect(50000, 80000); // 500 MAD income, 800 MAD expense
    const result = await getCashEntrySummary({ period: "month" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.net).toBe(-30000); // −300 MAD
    }
  });
});

// ─── 6. Append-only structural check ─────────────────────────────────────────

describe("cash-entry module — append-only invariant", () => {
  it("does not export a deleteCashEntry function", async () => {
    const module = await import("@/actions/cash-entry");
    expect("deleteCashEntry" in module).toBe(false);
  });

  it("exports only the expected action functions", async () => {
    const module = await import("@/actions/cash-entry");
    const exportedFunctions = Object.entries(module)
      .filter(([, v]) => typeof v === "function")
      .map(([k]) => k);
    // Only these action functions should be exported
    for (const fn of exportedFunctions) {
      expect([
        "createCashEntry",
        "correctCashEntry",
        "listCashEntries",
        "getCashEntrySummary",
        "getCashEntryChartData",
      ]).toContain(fn);
    }
  });
});
